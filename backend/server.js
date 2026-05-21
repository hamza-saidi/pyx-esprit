// server.js
const fs = require('fs');
const path = require('path');

// LOAD ENVIRONMENT VARIABLES AS FIRST STEP
const envPath = path.join(__dirname, '.env');
console.log(`[DIAGNOSTIC] Searching for .env at: ${envPath}`);
console.log(`[DIAGNOSTIC] Current Working Directory: ${process.cwd()}`);

if (fs.existsSync(envPath)) {
  require('dotenv').config({ path: envPath });
} else {
  // If we can't find it, we'll try one level up just in case
  const fallbackEnv = path.join(__dirname, '..', '.env');
  console.log(`[DIAGNOSTIC] .env not found at primary path. Trying fallback: ${fallbackEnv}`);
  if (fs.existsSync(fallbackEnv)) {
    require('dotenv').config({ path: fallbackEnv });
  }
}

const logger = require('./utils/logger');
const PORT = process.env.PORT || 5000;

// EXTREME DIAGNOSTIC block removed
// RAW DIAGNOSTIC: Create a file immediately to verify Node execution
try {
  fs.writeFileSync(path.join(__dirname, 'STARTUP_OK.txt'), `Process started at ${new Date().toISOString()} (PID: ${process.pid})\n`);
  logger.info(`BOOTUP: Server process started (Port: ${PORT}, PID: ${process.pid})`);
  logger.info(`BOOTUP: Detecting Environment: NODE_ENV=${process.env.NODE_ENV}, FRONTEND_URL=${process.env.FRONTEND_URL}`);
} catch (e) {
  console.error('CRITICAL: Cannot write startup diagnostic file:', e.message);
}

// Global "Panic" handler for errors before logging is ready
process.on('uncaughtException', (err) => {
  const msg = `FATAL UNCAUGHT EXCEPTION: ${err.message}\n${err.stack}\n`;
  console.error(msg);
  try { fs.appendFileSync(path.join(__dirname, 'FATAL_ERROR.txt'), msg); } catch {}
  process.exit(1);
});

const express = require('express');
const app = require('./app'); 

const { sequelize } = require('./models');
const { CampagneEmail } = require('./models');

const emailService = require('./services/emailService');
const cronService = require('./services/cronService');

// Initialize background automations
logger.info('Initializing background automations...');
cronService.initAutomations();

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
sequelize.authenticate()
  .then(() => {
    logger.info('DATABASE: Connection established successfully.');
    // Safely add the missing column to the live database if it doesn't exist yet, bypassing mapping errors.
    return sequelize.query('ALTER TABLE contact ADD COLUMN abonnement_id INT;').catch(() => {
       // if it already exists or fails, ignore safely
    }).then(() => sequelize.sync()); // basic sync without alter
  })
  .then(async () => {
    logger.info('DATABASE: Tables synchronized.');
    await seedTemplates();
    logger.info('DATABASE: Seeding completed.');
    initScheduler();
  })
  .catch(err => {
    logger.error('DATABASE FATAL: Failure during startup', { 
      message: err.message, 
      stack: err.stack
    });
  });

function initScheduler() {
  logger.info('SCHEDULER: Starting campaign processing...');
  let running = false;
  setInterval(async () => {
    if (running) return;
    running = true;
    try {
      const now = new Date();
      const dues = await CampagneEmail.findAll({
        where: {
          statut: 'programmée',
          date_programmation: { [require('sequelize').Op.lte]: now }
        },
        limit: 5
      });

      for (const camp of dues) {
        try {
          logger.info(`SCHEDULER: Triggering campaign ${camp.id} scheduled at ${camp.date_programmation}`);
          await emailService.envoyerCampagne(camp.id);
        } catch (e) {
          logger.error(`SCHEDULER: Campaign ${camp.id} failed:`, e.message);
        }
      }
    } catch (e) {
      logger.error('SCHEDULER: Loop error:', e.message);
    } finally {
      running = false;
    }
  }, 30 * 1000);
}
