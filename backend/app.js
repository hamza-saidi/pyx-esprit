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

// Production CORS - More robust origin handling for credentials
const corsOptions = {
  origin: (origin, callback) => {
    const allowedEnv = process.env.FRONTEND_URL || '';
    const allowed = allowedEnv ? allowedEnv.split(',').map(u => u.trim()) : [];
    
    // Allow if origin matches FRONTEND_URL, or if FRONTEND_URL is missing (allow all for debugging startup)
    if (!origin || allowed.includes(origin) || allowed.includes('*') || !allowedEnv) {
      callback(null, true);
    } else {
      logger.warn(`CORS blocked request from origin: "${origin}" (Allowed: "${allowedEnv}")`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(express.json({ limit: BODY_LIMIT }));
app.use(express.urlencoded({ extended: true, limit: BODY_LIMIT }));
app.use(cookieParser());

// Serve static files from uploads directory
const path = require('path');
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

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

// Error handling middleware
app.use(errorHandler);

module.exports = app; 