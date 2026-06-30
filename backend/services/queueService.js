/**
 * services/queueService.js
 *
 * Centralized Queue Service.
 * Implements a hybrid/adapter pattern:
 * - Uses BullMQ if Redis configuration is active (production scalability).
 * - Falls back to a local database/in-memory task runner (seamless developer setup).
 */

const logger = require('../utils/logger');
const emailService = require('./emailService');
const { runWithTenant } = require('../utils/tenantContext');

let bullQueue = null;
let useBull = false;

// Attempt to initialize BullMQ if Redis is configured
if (process.env.REDIS_HOST || process.env.REDIS_URL) {
  try {
    const { Queue, Worker } = require('bullmq');
    const Redis = require('ioredis');

    const redisConfig = process.env.REDIS_URL
      ? process.env.REDIS_URL
      : {
          host: process.env.REDIS_HOST || '127.0.0.1',
          port: Number(process.env.REDIS_PORT || 6379),
          password: process.env.REDIS_PASSWORD || undefined,
        };

    const connection = new Redis(redisConfig);

    bullQueue = new Queue('emailCampaigns', { connection });
    useBull = true;

    // Worker initialization
    const worker = new Worker(
      'emailCampaigns',
      async (job) => {
        logger.info(`[QUEUE] Worker processing job ${job.id} for campaign ${job.data.campaignId}`);
        // BullMQ dequeues this on its own async chain, with no relation to
        // the HTTP request that originally enqueued it - there is no tenant
        // context here unless we re-establish one from the job data.
        const { campaignId, clubId } = job.data;
        await runWithTenant({ clubId, isSystem: false }, () =>
          emailService.envoyerCampagne(campaignId)
        );
      },
      { connection, concurrency: 1 }
    );

    worker.on('completed', (job) => {
      logger.info(`[QUEUE] Campaign job ${job.id} completed successfully.`);
    });

    worker.on('failed', (job, err) => {
      logger.error(`[QUEUE] Campaign job ${job?.id} failed:`, { error: err.message });
    });

    logger.info('🚀 QUEUE: BullMQ successfully initialized with Redis connection.');
  } catch (err) {
    logger.warn(
      '⚠️ QUEUE: Failed to initialize BullMQ. Falling back to internal DB-backed queue handler.',
      {
        error: err.message,
      }
    );
    useBull = false;
  }
} else {
  logger.info('📌 QUEUE: Redis is not configured. Running in internal DB/in-memory queue mode.');
}

/**
 * Enqueues a campaign send job.
 *
 * @param {number|string} campaignId
 * @param {number} clubId - required so whichever async path actually sends
 *   the campaign (BullMQ worker on its own chain, or the local setImmediate
 *   fallback) can re-establish the right tenant context explicitly instead
 *   of relying on it having propagated.
 * @returns {Promise<boolean>}
 */
async function enqueueCampaign(campaignId, clubId) {
  if (!clubId) throw new Error('enqueueCampaign: clubId is required');

  if (useBull && bullQueue) {
    try {
      const job = await bullQueue.add(`campaign-${campaignId}`, { campaignId, clubId });
      logger.info(`[QUEUE] Enqueued campaign ${campaignId} with Job ID: ${job.id}`);
      return true;
    } catch (err) {
      logger.error(`[QUEUE] Failed to add campaign ${campaignId} to BullMQ:`, {
        error: err.message,
      });
    }
  }

  // Fallback: process asynchronously in next tick (in-memory)
  logger.info(`[QUEUE] Local fallback: Triggering campaign ${campaignId} execution in next tick.`);
  setImmediate(() => {
    runWithTenant({ clubId, isSystem: false }, async () => {
      try {
        await emailService.envoyerCampagne(campaignId);
      } catch (err) {
        logger.error(`[QUEUE][FALLBACK] Local campaign run failed for ${campaignId}:`, {
          error: err.message,
        });
      }
    });
  });

  return true;
}

module.exports = { enqueueCampaign, isDistributed: () => useBull };
