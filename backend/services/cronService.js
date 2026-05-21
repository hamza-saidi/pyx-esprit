const cron = require('node-cron');
const { Automation } = require('../models');
const birthdayController = require('../controllers/birthdayController');
const automationService = require('./automationService');

// Initialize all background automations
exports.initAutomations = async () => {
  console.log('🔄 Initializing background automations...');

  try {
    // Seed default birthday automation if it doesn't exist
    const [bday] = await Automation.findOrCreate({
      where: { type: 'birthday' },
      defaults: {
        nom: 'Anniversaires VIP',
        actif: false,
        config: { tagFilter: 'Membre VIP' }
      }
    });
    console.log(`📌 Automation seeded: ${bday.nom} [Actif: ${bday.actif}]`);
  } catch (err) {
    console.error('❌ Failed to seed default automations:', err.message);
  }

  // 1. Birthday Automations: Run every day at 08:00 AM
  cron.schedule('0 8 * * *', async () => {
    console.log(`⏰ [${new Date().toISOString()}] CRON: Checking Birthday Automations...`);
    try {
      const birthdayAutomation = await Automation.findOne({ where: { type: 'birthday', actif: true } });
      if (birthdayAutomation) {
        console.log('✅ Birthday automation is ACTIVE. Triggering sendToday...');
        const req = {};
        const res = {
          json: (data) => console.log('🎂 Birthday Emails Sent:', data),
          status: (code) => ({
            json: (error) => console.error(`❌ Birthday Emails Error [${code}]:`, error)
          })
        };
        await birthdayController.sendToday(req, res);
      }
    } catch (error) {
      console.error('❌ CRON Error executing birthday automation:', error);
    }
  });

  // 2. Scheduled/Recurring & Membership Automations: Run every 30 minutes
  cron.schedule('*/30 * * * *', async () => {
    console.log(`⏰ [${new Date().toISOString()}] CRON: Checking Scheduled & Membership Automations...`);
    try {
      await automationService.processScheduledAutomations();
      await automationService.processMembershipTasks();
    } catch (error) {
      console.error('❌ CRON Error executing background automations:', error);
    }
  });

  console.log('✅ Background automations scheduled.');
};
