const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

const logger = require('./utils/logger');
const { sequelize } = require('./models');

const errorHandler = require('./middleware/errorHandler');
const cookieParser = require('cookie-parser');

const app = express();
app.set('trust proxy', 1); // Trust the Plesk proxy (Nginx/Apache)

const BODY_LIMIT = process.env.JSON_LIMIT || '50mb';

// Production CORS — fail-secure: deny all origins if FRONTEND_URL is not set
const corsOptions = {
  origin: (origin, callback) => {
    const allowedEnv = process.env.FRONTEND_URL || '';

    // SECURITY FIX: If FRONTEND_URL is not configured, only allow same-origin (no origin header)
    if (!allowedEnv) {
      if (!origin) return callback(null, true); // Same-origin or server-to-server
      logger.error('CORS: FRONTEND_URL not set — rejecting cross-origin request from ' + origin);
      return callback(new Error('CORS: FRONTEND_URL not configured'));
    }

    const allowed = allowedEnv
      .split(',')
      .map((u) => u.trim())
      .filter(Boolean);

    // Allow requests with no origin (server-side, Postman, same-origin)
    if (!origin || allowed.includes(origin)) {
      return callback(null, true);
    }

    logger.warn(`CORS blocked request from origin: "${origin}" (Allowed: "${allowedEnv}")`);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));
app.use(express.json({ limit: BODY_LIMIT }));
app.use(express.urlencoded({ extended: true, limit: BODY_LIMIT }));
app.use(cookieParser());

// ── Global API rate limit: 300 req/min per IP ─────────────────────────────────
const rateLimit = require('express-rate-limit');
app.use(
  '/api',
  rateLimit({
    windowMs: 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Trop de requêtes — réessayez dans une minute.' },
    skip: (req) => req.method === 'OPTIONS',
  })
);

// ── Pagination guard: cap ?limit at 200 ───────────────────────────────────────
app.use((req, _res, next) => {
  if (req.query.limit) {
    const n = parseInt(req.query.limit, 10);
    if (!Number.isFinite(n) || n > 200) req.query.limit = '200';
    if (n < 1) req.query.limit = '20';
  }
  next();
});

// CSRF Protection configuration and route
const { csrfProtection, setCsrfCookie } = require('./middleware/csrf');

// Initialize CSRF endpoint
app.get('/api/csrf-token', (req, res) => {
  const token = setCsrfCookie(req, res);
  res.json({ csrfToken: token });
});

// Protect all mutating API routes with CSRF validation
app.use('/api', csrfProtection);

// Serve static files from uploads directory
const path = require('path');
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Interactive Swagger API Documentation
const { getSwaggerHtml } = require('./utils/swagger');
app.get('/api-docs', (req, res) => {
  res.setHeader('Content-Type', 'text/html');
  res.send(getSwaggerHtml());
});

// ── Health check ─────────────────────────────────────────────────────────────
app.get('/api/health', async (req, res) => {
  const checks = { status: 'ok', db: 'ok', redis: 'ok', uptime: process.uptime() };
  try {
    await sequelize.authenticate();
  } catch {
    checks.db = 'error';
    checks.status = 'degraded';
  }
  try {
    const Redis = require('ioredis');
    const r = process.env.REDIS_URL
      ? new Redis(process.env.REDIS_URL)
      : new Redis({
          host: process.env.REDIS_HOST || '127.0.0.1',
          port: Number(process.env.REDIS_PORT || 6379),
          lazyConnect: true,
        });
    await r.ping();
    r.disconnect();
  } catch {
    checks.redis = 'error';
    checks.status = 'degraded';
  }
  res.status(checks.status === 'ok' ? 200 : 503).json(checks);
});

// Import routes (squelettes)
app.use('/api/ai', require('./routes/ai'));
app.use('/api/auth/graph', require('./routes/graph'));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/auth/users', require('./routes/user'));
app.use('/api/contacts', require('./routes/contact'));
app.use('/api/campagnes', require('./routes/campagne'));
app.use('/api/automations', require('./routes/automation'));
app.use('/api/templates', require('./routes/template'));
app.use('/api/mailer', require('./routes/mailer'));
app.use('/api/tracking', require('./routes/tracking'));
app.use('/api/superadmin', require('./routes/superadmin'));
app.use('/api/settings', require('./routes/settings'));

// Error handling middleware
app.use(errorHandler);

module.exports = app;
