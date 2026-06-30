// server.js
const fs = require('fs');
const path = require('path');

// LOAD ENVIRONMENT VARIABLES AS FIRST STEP
const envPath = path.join(__dirname, '.env');

if (fs.existsSync(envPath)) {
  require('dotenv').config({ path: envPath });
} else {
  // Fallback: try one level up (monorepo root)
  const fallbackEnv = path.join(__dirname, '..', '.env');
  if (fs.existsSync(fallbackEnv)) {
    require('dotenv').config({ path: fallbackEnv });
  }
}

const logger = require('./utils/logger');
const PORT = process.env.PORT || 5000;

logger.info(
  `BOOTUP: Server process started (Port: ${PORT}, PID: ${process.pid}, ENV: ${process.env.NODE_ENV || 'development'})`
);
if (process.env.FRONTEND_URL) {
  logger.info(`BOOTUP: CORS allowed for: ${process.env.FRONTEND_URL}`);
}

// Global "Panic" handler for errors before logging is ready
process.on('uncaughtException', (err) => {
  const msg = `FATAL UNCAUGHT EXCEPTION: ${err.message}\n${err.stack}\n`;
  console.error(msg);
  try {
    fs.appendFileSync(path.join(__dirname, 'FATAL_ERROR.txt'), msg);
  } catch {}
  process.exit(1);
});

const express = require('express');
const app = require('./app');

const { sequelize } = require('./models');
const { CampagneEmail } = require('./models');

// emailService is used internally by cronService and queueService — no direct import needed here
const cronService = require('./services/cronService');

// ----------------------------
// Serve React frontend (using app now)
// ----------------------------
const frontendPath = path.join(__dirname, '../');
app.use(express.static(frontendPath));

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  res.sendFile(path.join(frontendPath, 'index.html'));
});

const seedTemplates = require('./seeders/templateSeeder');

// ----------------------------
// Start Server and Database Connection & Sync (Background)
// ----------------------------
app.listen(PORT, () => {
  logger.info(`Server started and listening on port ${PORT}`);
});

logger.info('Attempting to connect to database...');
sequelize
  .authenticate()
  .then(() => {
    logger.info('DATABASE: Connection established successfully.');
    // Migrations must run first - they create/alter columns (e.g. club_id)
    // that some models now declare indexes on. Running sync() first makes
    // sync() try to create those indexes before the column exists and the
    // server crashes on boot.
    const { runMigrations } = require('./utils/migrationRunner');
    return runMigrations(sequelize).then(() => sequelize.sync());
  })
  .then(async () => {
    logger.info('DATABASE: Tables synchronized.');
    await seedTemplates();
    logger.info('DATABASE: Seeding completed.');
    // Start automations and scheduler after database is fully ready
    await cronService.initAutomations();
  })
  .catch((err) => {
    logger.error('DATABASE FATAL: Failure during startup', {
      message: err.message,
      stack: err.stack,
    });
  });
