const cron = require('node-cron');
const { Automation, CampagneEmail, Club } = require('../models');
const automationController = require('../controllers/automationController');
const automationService = require('./automationService');
const emailService = require('./emailService');
const logger = require('../utils/logger');
const { runWithTenant } = require('../utils/tenantContext');

const SYSTEM_CONTEXT = { clubId: null, isSystem: true };

// Cron/background jobs are not tied to any single HTTP request, so they have
// no tenant context of their own. Club itself is the one model that is
// never tenant-scoped (it's the tenant root), so it can always be queried in
// system context; per-club work then runs inside that club's own context so
// records it creates/reads are correctly scoped.
async function forEachActiveClub(fn) {
  const clubs = await runWithTenant(SYSTEM_CONTEXT, () =>
    Club.findAll({ where: { statut: 'actif' } })
  );
  for (const club of clubs) {
    try {
      await runWithTenant({ clubId: club.id, isSystem: false }, () => fn(club));
    } catch (err) {
      logger.error(`❌ SCHEDULER: Job failed for club ${club.id} (${club.nom}):`, {
        error: err.message,
      });
    }
  }
}

// Initialize all background automations and schedulers
exports.initAutomations = async () => {
  logger.info('🔄 SCHEDULER: Initializing background automations and cron jobs...');

  try {
    // Seed default birthday automation per club if it doesn't exist
    await forEachActiveClub(async (club) => {
      const [bday] = await Automation.findOrCreate({
        where: { type: 'birthday' },
        defaults: {
          nom: 'Anniversaires VIP',
          actif: false,
          config: { tagFilter: 'Membre VIP' },
        },
      });
      logger.info(
        `📌 SCHEDULER: Automation seeded for club ${club.id}: ${bday.nom} [Actif: ${bday.actif}]`
      );
    });
  } catch (err) {
    logger.error('❌ SCHEDULER: Failed to seed default automations:', { error: err.message });
  }

  // 1. Birthday Automations: Run every day at 08:00 AM
  cron.schedule('0 8 * * *', async () => {
    logger.info('⏰ CRON: Checking Birthday Automations...');
    await forEachActiveClub(async (club) => {
      const birthdayAutomation = await Automation.findOne({
        where: { type: 'birthday', actif: true },
      });
      if (birthdayAutomation) {
        logger.info(
          `✅ CRON: Birthday automation ACTIVE for club ${club.id}. Triggering sendToday...`
        );
        const req = {};
        const res = {
          json: (data) => logger.info('🎂 CRON: Birthday Emails Sent:', data),
          status: (code) => ({
            json: (error) => logger.error(`❌ CRON: Birthday Emails Error [${code}]:`, error),
          }),
        };
        await automationController.sendBirthdaysToday(req, res, () => {});
      }
    });
  });

  // 2. Scheduled/Recurring & Membership Automations: Run every 30 minutes
  cron.schedule('*/30 * * * *', async () => {
    logger.info('⏰ CRON: Checking Scheduled & Membership Automations...');
    await forEachActiveClub(async () => {
      await automationService.processScheduledAutomations();
      await automationService.processMembershipTasks();
    });
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
      // Fetch up to 5 campaigns scheduled in the past or now, across all clubs
      const dues = await runWithTenant(SYSTEM_CONTEXT, () =>
        CampagneEmail.findAll({
          where: {
            statut: 'programmée',
            date_programmation: { [require('sequelize').Op.lte]: now },
          },
          limit: 5,
        })
      );

      for (const camp of dues) {
        try {
          logger.info(
            `SCHEDULER: Triggering campaign ${camp.id} scheduled at ${camp.date_programmation}`
          );
          // enviarCampagne handles state checks atomically inside, making it cluster-safe.
          // Runs in the campaign's own club context so everything it creates
          // (envois, stats) is scoped to the right tenant.
          await runWithTenant({ clubId: camp.club_id, isSystem: false }, () =>
            emailService.envoyerCampagne(camp.id)
          );
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
