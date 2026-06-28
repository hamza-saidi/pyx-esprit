const cron = require('node-cron');
const { Automation, CampagneEmail } = require('../models');
const birthdayController = require('../controllers/birthdayController');
const automationService = require('./automationService');
const emailService = require('./emailService');
const logger = require('../utils/logger');

// Initialize all background automations and schedulers
exports.initAutomations = async () => {
  logger.info('🔄 SCHEDULER: Initializing background automations and cron jobs...');

  try {
    // Seed default birthday automation if it doesn't exist
    const [bday] = await Automation.findOrCreate({
      where: { type: 'birthday' },
      defaults: {
        nom: 'Anniversaires VIP',
        actif: false,
        config: { tagFilter: 'Membre VIP' },
      },
    });
    logger.info(`📌 SCHEDULER: Automation seeded: ${bday.nom} [Actif: ${bday.actif}]`);
  } catch (err) {
    logger.error('❌ SCHEDULER: Failed to seed default automations:', { error: err.message });
  }

  // 1. Birthday Automations: Run every day at 08:00 AM
  cron.schedule('0 8 * * *', async () => {
    logger.info('⏰ CRON: Checking Birthday Automations...');
    try {
      const birthdayAutomation = await Automation.findOne({
        where: { type: 'birthday', actif: true },
      });
      if (birthdayAutomation) {
        logger.info('✅ CRON: Birthday automation is ACTIVE. Triggering sendToday...');
        const req = {};
        const res = {
          json: (data) => logger.info('🎂 CRON: Birthday Emails Sent:', data),
          status: (code) => ({
            json: (error) => logger.error(`❌ CRON: Birthday Emails Error [${code}]:`, error),
          }),
        };
        await birthdayController.sendToday(req, res);
      }
    } catch (error) {
      logger.error('❌ CRON: Error executing birthday automation:', { error: error.message });
    }
  });

  // 2. Scheduled/Recurring & Membership Automations: Run every 30 minutes
  cron.schedule('*/30 * * * *', async () => {
    logger.info('⏰ CRON: Checking Scheduled & Membership Automations...');
    try {
      await automationService.processScheduledAutomations();
      await automationService.processMembershipTasks();
    } catch (error) {
      logger.error('❌ CRON: Error executing background automations:', { error: error.message });
    }
  });

  // 3. Campaign Scheduler Loop: Run every 30 seconds to fetch & send due campaigns
  startCampaignScheduler();

  logger.info('✅ SCHEDULER: All background tasks and intervals scheduled.');
};

/**
 * Periodically checks for scheduled campaigns that are due and sends them.
 */
function startCampaignScheduler() {
  logger.info('SCHEDULER: Starting campaign check loop (every 30 seconds)...');
  let running = false;

  setInterval(async () => {
    if (running) return;
    running = true;
    try {
      const now = new Date();
      // Fetch up to 5 campaigns scheduled in the past or now
      const dues = await CampagneEmail.findAll({
        where: {
          statut: 'programmée',
          date_programmation: { [require('sequelize').Op.lte]: now },
        },
        limit: 5,
      });

      for (const camp of dues) {
        try {
          logger.info(
            `SCHEDULER: Triggering campaign ${camp.id} scheduled at ${camp.date_programmation}`
          );
          // enviarCampagne handles state checks atomically inside, making it cluster-safe
          await emailService.envoyerCampagne(camp.id);
        } catch (e) {
          logger.warn(`SCHEDULER: Campaign ${camp.id} skipped/failed: ${e.message}`);
        }
      }
    } catch (e) {
      logger.error('SCHEDULER: Loop error:', { error: e.message });
    } finally {
      running = false;
    }
  }, 30 * 1000);
}
