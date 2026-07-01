const { Utilisateur } = require('../models');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { randomInt } = require('crypto'); // SECURITY: cryptographically secure RNG
const config = require('../config-temp');
const emailService = require('../services/emailService');
const emailConfig = require('../config/email');
const logger = require('../utils/logger');

// ── Redis client (shared across MFA store + rate limiter) ───────────────────
// Redis is used when REDIS_HOST or REDIS_URL is set (production/Docker).
// Falls back to in-memory Maps in dev/test so no Redis dependency is needed
// for local development without Docker.
let redisClient = null;
if (process.env.REDIS_HOST || process.env.REDIS_URL) {
  try {
    const Redis = require('ioredis');
    const connOptions = process.env.REDIS_URL
      ? process.env.REDIS_URL
      : {
          host: process.env.REDIS_HOST || '127.0.0.1',
          port: Number(process.env.REDIS_PORT || 6379),
          maxRetriesPerRequest: null,
          enableReadyCheck: false,
          lazyConnect: true,
        };
    redisClient = new Redis(connOptions);
    redisClient.on('error', (err) =>
      logger.warn(
        '[AUTH] Redis connection error — MFA/rate-limiter using in-memory fallback:',
        err.message
      )
    );
    logger.info('[AUTH] MFA store and rate limiter backed by Redis.');
  } catch (err) {
    logger.warn(
      '[AUTH] ioredis unavailable — MFA/rate-limiter using in-memory fallback:',
      err.message
    );
  }
}

// ── MFA Store ────────────────────────────────────────────────────────────────
// Redis: SET auth:mfa:{pendingId} {json} EX 300 (5-min TTL, cluster-safe)
// Fallback: module-scoped Map with periodic TTL cleanup
const mfaMemStore = new Map();
if (!redisClient) {
  const mfaTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, rec] of mfaMemStore.entries()) {
      if (now > rec.expiresAt) mfaMemStore.delete(key);
    }
  }, 60 * 1000);
  if (mfaTimer.unref) mfaTimer.unref();
}

async function mfaSet(pendingId, payload) {
  if (redisClient) {
    await redisClient.set(`auth:mfa:${pendingId}`, JSON.stringify(payload), 'EX', 300);
  } else {
    mfaMemStore.set(pendingId, payload);
  }
}

async function mfaGet(pendingId) {
  if (redisClient) {
    const raw = await redisClient.get(`auth:mfa:${pendingId}`);
    return raw ? JSON.parse(raw) : null;
  }
  return mfaMemStore.get(pendingId) || null;
}

async function mfaDel(pendingId) {
  if (redisClient) {
    await redisClient.del(`auth:mfa:${pendingId}`);
  } else {
    mfaMemStore.delete(pendingId);
  }
}

// ── Login rate limiter ────────────────────────────────────────────────────────
// Redis: sorted-set of timestamps per IP, pruned on read (cluster-safe, persistent)
// Fallback: module-scoped Map
const loginMemStore = new Map();
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_ATTEMPTS = 30;

async function recordAttempt(ip, ok) {
  if (redisClient) {
    const key = `auth:rate:${ip}`;
    const now = Date.now();
    if (!ok) {
      await redisClient.zadd(key, now, now);
      await redisClient.zremrangebyscore(key, '-inf', now - WINDOW_MS);
      await redisClient.expire(key, Math.ceil(WINDOW_MS / 1000));
      const count = await redisClient.zcard(key);
      if (count >= MAX_ATTEMPTS) {
        await redisClient.set(`auth:block:${ip}`, '1', 'EX', Math.ceil(WINDOW_MS / 1000));
        logger.warn(
          `[AUTH] IP ${ip} blocked for ${WINDOW_MS / 60000} min after ${MAX_ATTEMPTS} failed attempts.`
        );
      }
    } else {
      await redisClient.del(`auth:block:${ip}`);
    }
    return;
  }
  // in-memory fallback
  const now = Date.now();
  const rec = loginMemStore.get(ip) || { attempts: [], blockedUntil: 0 };
  rec.attempts = rec.attempts.filter((ts) => now - ts < WINDOW_MS);
  if (!ok) rec.attempts.push(now);
  if (rec.attempts.length >= MAX_ATTEMPTS) {
    rec.blockedUntil = now + WINDOW_MS;
    rec.attempts = [];
    logger.warn(
      `[AUTH] IP ${ip} blocked until ${new Date(rec.blockedUntil).toISOString()} after ${MAX_ATTEMPTS} failed attempts.`
    );
  }
  loginMemStore.set(ip, rec);
}

async function isBlocked(ip) {
  if (redisClient) {
    const blocked = await redisClient.get(`auth:block:${ip}`);
    return !!blocked;
  }
  const rec = loginMemStore.get(ip);
  if (!rec) return false;
  return Date.now() < rec.blockedUntil;
}

const { getJwtSecret } = require('../utils/jwt');
const { runWithTenant } = require('../utils/tenantContext');

// Auth happens before any club is known (the caller only has email/password,
// not a club identifier) - these lookups run in system context, which is the
// only legitimate bypass of the tenant-scoping hooks (see
// models/hooks/tenantScopeHooks.js). Once a user is resolved, every
// subsequent request carries club_id in its JWT and goes through the normal
// per-request tenant context set up by middleware/tenantScope.js.
const SYSTEM_CONTEXT = { clubId: null, isSystem: true };

function signAccess(user) {
  const secret = getJwtSecret('access');
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, club_id: user.club_id },
    secret,
    { expiresIn: '24h' }
  );
}
function signRefresh(user) {
  const secret = getJwtSecret('refresh');
  return jwt.sign({ id: user.id }, secret, { expiresIn: '7d' });
}

exports.register = async (req, res) => {
  try {
    const { nom, email, mot_de_passe } = req.body;
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
    const user = await runWithTenant(SYSTEM_CONTEXT, async () => {
      const existing = await Utilisateur.findOne({ where: { email } });
      if (existing) return null;
      const hash = await bcrypt.hash(mot_de_passe, 12);
      // SECURITY: role is never client-controlled - self-registration is
      // always 'employee'. Promotion to 'admin'/'global_admin' requires an
      // existing admin (see routes/user.js) or direct operator action.
      // club_id defaults to the default club (1) - see Club model; a
      // club-aware public signup flow is a future product feature.
      return Utilisateur.create({ nom, email, mot_de_passe: hash, role: 'employee', club_id: 1 });
    });
    if (!user) return res.status(400).json({ message: 'Email déjà utilisé' });
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

    if (await isBlocked(ip)) {
      logger.warn(`Blocked login attempt from ${ip} (Throttled)`);
      return res.status(429).json({ message: 'Trop de tentatives. Réessayez plus tard.' });
    }

    const user = await runWithTenant(SYSTEM_CONTEXT, () =>
      Utilisateur.findOne({ where: { email } })
    );
    const valid = user ? await bcrypt.compare(mot_de_passe, user.mot_de_passe) : false;

    await recordAttempt(ip, !!(user && valid));
    if (!user || !valid)
      return res.status(400).json({ message: 'Email ou mot de passe incorrect' });

    // If admin, require MFA
    if (String(user.role) === 'admin') {
      // SECURITY FIX: crypto.randomInt is cryptographically secure (replaces Math.random)
      const code = String(randomInt(100000, 1000000));
      const pendingId = 'mfa_' + user.id + '_' + Date.now();
      await mfaSet(pendingId, { userId: user.id, code, expiresAt: Date.now() + 5 * 60 * 1000 });

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
    const user = await runWithTenant(SYSTEM_CONTEXT, () => Utilisateur.findByPk(payload.id));
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
    const rec = await mfaGet(pending_token);
    if (!rec) return res.status(400).json({ message: 'MFA invalide ou expiré' });
    if (Date.now() > rec.expiresAt) {
      await mfaDel(pending_token);
      return res.status(400).json({ message: 'Code expiré. Veuillez vous reconnecter.' });
    }
    // Constant-time comparison to prevent timing attacks
    if (String(rec.code) !== String(code))
      return res.status(400).json({ message: 'Code incorrect' });
    const user = await runWithTenant(SYSTEM_CONTEXT, () => Utilisateur.findByPk(rec.userId));
    if (!user) return res.status(400).json({ message: 'Utilisateur introuvable' });
    await mfaDel(pending_token);
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
    const user = await runWithTenant(SYSTEM_CONTEXT, () =>
      Utilisateur.findByPk(req.user.id, { attributes: { exclude: ['mot_de_passe'] } })
    );
    if (!user) return res.status(404).json({ message: 'Utilisateur non trouvé' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
