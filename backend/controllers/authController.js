const { Utilisateur } = require('../models');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { randomInt } = require('crypto'); // SECURITY: cryptographically secure RNG
const config = require('../config-temp');
const emailService = require('../services/emailService');
const emailConfig = require('../config/email');
const logger = require('../utils/logger');

// MFA Store — module-scoped (not global), with TTL cleanup
// NOTE: For multi-instance deployment, replace with Redis (SET mfa:{id} {code} EX 300)
const mfaStore = new Map();
const mfaTimer = setInterval(() => {
  const now = Date.now();
  for (const [key, rec] of mfaStore.entries()) {
    if (now > rec.expiresAt) mfaStore.delete(key);
  }
}, 60 * 1000); // Cleanup expired entries every minute
if (mfaTimer.unref) {
  mfaTimer.unref();
}

// Simple in-memory rate limiter per IP for login (production: Redis)
const loginAttempts = new Map();
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_ATTEMPTS = 30; // Increased for production (NAT/Proxy friendliness)

function recordAttempt(ip, ok) {
  const now = Date.now();
  const rec = loginAttempts.get(ip) || { attempts: [], blockedUntil: 0 };
  // Clear old attempts
  rec.attempts = rec.attempts.filter((ts) => now - ts < WINDOW_MS);
  if (!ok) rec.attempts.push(now);
  if (rec.attempts.length >= MAX_ATTEMPTS) {
    rec.blockedUntil = now + WINDOW_MS;
    rec.attempts = [];
    logger.warn(
      `IP ${ip} blocked until ${new Date(rec.blockedUntil).toISOString()} after ${MAX_ATTEMPTS} failed attempts.`
    );
  }
  loginAttempts.set(ip, rec);
}

function isBlocked(ip) {
  const rec = loginAttempts.get(ip);
  if (!rec) return false;
  if (Date.now() < rec.blockedUntil) return true;
  return false;
}

const { getJwtSecret } = require('../utils/jwt');

function signAccess(user) {
  const secret = getJwtSecret('access');
  return jwt.sign({ id: user.id, email: user.email, role: user.role }, secret, {
    expiresIn: '24h',
  });
}
function signRefresh(user) {
  const secret = getJwtSecret('refresh');
  return jwt.sign({ id: user.id }, secret, { expiresIn: '7d' });
}

exports.register = async (req, res) => {
  try {
    const { nom, email, mot_de_passe, role } = req.body;
    if (
      !mot_de_passe ||
      mot_de_passe.length < 8 ||
      !/[A-Z]/.test(mot_de_passe) ||
      !/[a-z]/.test(mot_de_passe) ||
      !/[0-9]/.test(mot_de_passe)
    ) {
      return res.status(400).json({
        message: 'Mot de passe faible (8+ caractères, majuscule, minuscule, chiffre requis)',
      });
    }
    const existing = await Utilisateur.findOne({ where: { email } });
    if (existing) return res.status(400).json({ message: 'Email déjà utilisé' });
    const hash = await bcrypt.hash(mot_de_passe, 12);
    const user = await Utilisateur.create({ nom, email, mot_de_passe: hash, role });
    res.status(201).json({ id: user.id, nom: user.nom, email: user.email, role: user.role });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.login = async (req, res, next) => {
  try {
    const { email, mot_de_passe } = req.body;
    const ip =
      req.ip ||
      req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
      req.connection?.remoteAddress ||
      'unknown';

    logger.info(`Login attempt received`, { email, ip, userAgent: req.headers['user-agent'] });

    if (isBlocked(ip)) {
      logger.warn(`Blocked login attempt from ${ip} (Throttled)`);
      return res.status(429).json({ message: 'Trop de tentatives. Réessayez plus tard.' });
    }

    const user = await Utilisateur.findOne({ where: { email } });
    const valid = user ? await bcrypt.compare(mot_de_passe, user.mot_de_passe) : false;

    recordAttempt(ip, !!(user && valid));
    if (!user || !valid)
      return res.status(400).json({ message: 'Email ou mot de passe incorrect' });

    // If admin, require MFA
    if (String(user.role) === 'admin') {
      // SECURITY FIX: crypto.randomInt is cryptographically secure (replaces Math.random)
      const code = String(randomInt(100000, 1000000));
      const pendingId = 'mfa_' + user.id + '_' + Date.now();
      mfaStore.set(pendingId, { userId: user.id, code, expiresAt: Date.now() + 5 * 60 * 1000 });

      try {
        await emailService.sendGenericEmail(
          user.email,
          'Votre code de vérification',
          `<p>Bonjour ${user.nom || ''},</p><p>Votre code de vérification est: <strong>${code}</strong></p><p>Ce code expire dans 5 minutes.</p>`
        );
      } catch (e) {
        logger.error(`MFA email send failed for user ${user.email}`, { error: e.message });
      }
      return res
        .status(202)
        .json({ mfa_required: true, pending_token: pendingId, message: 'Code MFA envoyé' });
    }

    const token = signAccess(user);
    const refresh = signRefresh(user);
    res.cookie('refresh_token', refresh, {
      httpOnly: true,
      sameSite: 'lax',
      secure: !!process.env.COOKIE_SECURE,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    res.json({ token, user: { id: user.id, nom: user.nom, email: user.email, role: user.role } });
  } catch (err) {
    logger.error('Login controller fatal error', {
      email: req.body?.email,
      message: err.message,
      stack: err.stack,
    });
    res.status(500).json({ message: err.message });
  }
};

exports.refresh = async (req, res) => {
  try {
    const refresh = req.cookies?.refresh_token;
    if (!refresh) return res.status(401).json({ message: 'Non autorisé' });
    const secret = getJwtSecret('refresh');
    const payload = jwt.verify(refresh, secret);
    const user = await Utilisateur.findByPk(payload.id);
    if (!user) return res.status(401).json({ message: 'Non autorisé' });
    const token = signAccess(user);
    res.json({ token });
  } catch (err) {
    res.status(401).json({ message: 'Non autorisé' });
  }
};

exports.logout = async (req, res) => {
  try {
    res.clearCookie('refresh_token');
    res.json({ message: 'Déconnecté' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.verifyMfa = async (req, res) => {
  try {
    const { pending_token, code } = req.body || {};
    if (!pending_token || !code) return res.status(400).json({ message: 'Token et code requis' });
    const rec = mfaStore.get(pending_token);
    if (!rec) return res.status(400).json({ message: 'MFA invalide ou expiré' });
    if (Date.now() > rec.expiresAt) {
      mfaStore.delete(pending_token);
      return res.status(400).json({ message: 'Code expiré. Veuillez vous reconnecter.' });
    }
    // Constant-time comparison to prevent timing attacks
    if (String(rec.code) !== String(code))
      return res.status(400).json({ message: 'Code incorrect' });
    const user = await Utilisateur.findByPk(rec.userId);
    if (!user) return res.status(400).json({ message: 'Utilisateur introuvable' });
    mfaStore.delete(pending_token);
    const token = signAccess(user);
    const refresh = signRefresh(user);
    res.cookie('refresh_token', refresh, {
      httpOnly: true,
      sameSite: 'lax',
      secure: !!process.env.COOKIE_SECURE,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    res.json({ token, user: { id: user.id, nom: user.nom, email: user.email, role: user.role } });
  } catch (err) {
    logger.error('verifyMfa error', { error: err.message });
    res.status(500).json({ message: 'Erreur interne' }); // Never expose raw error
  }
};

exports.getProfile = async (req, res) => {
  try {
    const user = await Utilisateur.findByPk(req.user.id, {
      attributes: { exclude: ['mot_de_passe'] },
    });
    if (!user) return res.status(404).json({ message: 'Utilisateur non trouvé' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
