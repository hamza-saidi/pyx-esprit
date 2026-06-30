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

// Import routes (squelettes)
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/user'));
app.use('/api/contacts', require('./routes/contact'));
app.use('/api/tags', require('./routes/tag'));
app.use('/api/segments', require('./routes/segment'));
app.use('/api/campagnes', require('./routes/campagne'));
app.use('/api/statistics', require('./routes/statistics'));
app.use('/api/birthdays', require('./routes/birthday'));
app.use('/api/automations', require('./routes/automation'));
app.use('/api/templates', require('./routes/template'));
app.use('/api/mailer', require('./routes/mailer'));
app.use('/api/categories', require('./routes/category'));
app.use('/api/distributions', require('./routes/distribution'));
app.use('/api/tracking', require('./routes/tracking'));
app.use('/api/abonnements', require('./routes/abonnement'));
app.use('/api/events', require('./routes/event'));

// Error handling middleware
app.use(errorHandler);

module.exports = app;
