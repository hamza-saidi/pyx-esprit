/**
 * services/queueService.js
 *
 * Campaign send queue - hybrid adapter:
 * - BullMQ + Redis when REDIS_HOST or REDIS_URL is configured (recommended
 *   for production: persisted jobs, retries, concurrency control, cluster-safe)
 * - In-process setImmediate fallback when Redis is absent (dev/CI without
 *   a Redis service)
 *
 * IMPORTANT: the BullMQ Worker callback runs on its own async chain with
 * no connection to the original HTTP request. The tenant clubId is stored
 * inside the job payload so the worker can re-establish the tenant context
 * explicitly - see the runWithTenant call in the worker processor.
 */

const logger = require('../utils/logger');
const emailService = require('./emailService');
const { runWithTenant } = require('../utils/tenantContext');

let bullQueue = null;
let bullWorker = null;
let useBull = false;

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
          maxRetriesPerRequest: null, // required by BullMQ
          enableReadyCheck: false,
        };

    const connection = new Redis(redisConfig);

    connection.on('error', (err) => {
      logger.error('[QUEUE] Redis connection error:', { error: err.message });
    });

    bullQueue = new Queue('emailCampaigns', { connection });

    bullWorker = new Worker(
      'emailCampaigns',
      async (job) => {
        logger.info(`[QUEUE] Worker processing job ${job.id} for campaign ${job.data.campaignId}`);
        const { campaignId, clubId } = job.data;
        await runWithTenant({ clubId, isSystem: false }, () =>
          emailService.envoyerCampagne(campaignId)
        );
      },
      { connection, concurrency: 1 }
    );

    bullWorker.on('completed', (job) => {
      logger.info(`[QUEUE] Campaign job ${job.id} completed.`);
    });

    bullWorker.on('failed', (job, err) => {
      logger.error(`[QUEUE] Campaign job ${job?.id} failed:`, { error: err.message });
    });

    // Graceful shutdown - close worker before process exits so in-flight
    // jobs are not left orphaned in Redis.
    process.once('SIGTERM', async () => {
      logger.info('[QUEUE] SIGTERM received - closing BullMQ worker and queue...');
      await bullWorker.close();
      await bullQueue.close();
      logger.info('[QUEUE] BullMQ shut down cleanly.');
    });

    useBull = true;
    logger.info('🚀 QUEUE: BullMQ initialized with Redis.');
  } catch (err) {
    // If Redis is explicitly configured but fails to initialize, log an
    // error rather than silently falling back - the operator needs to know
    // their Redis configuration is broken.
    logger.error(
      '❌ QUEUE: Redis is configured (REDIS_HOST/REDIS_URL is set) but BullMQ failed to initialize. ' +
        'Campaign sends will use the in-process fallback - NOT cluster-safe. Fix the Redis connection.',
      { error: err.message }
    );
    useBull = false;
  }
} else {
  logger.info(
    '📌 QUEUE: Redis not configured. Campaign sends run in-process (not cluster-safe, OK for dev).'
  );
}

/**
 * Enqueues a campaign send job.
 *
 * @param {number|string} campaignId
 * @param {number} clubId  Required - stored in the job payload so the worker
 *   can re-establish the tenant context on its own async chain (BullMQ
 *   workers run independently of the HTTP request that enqueued the job).
 * @returns {Promise<boolean>}
 */
async function enqueueCampaign(campaignId, clubId) {
  if (!clubId) throw new Error('enqueueCampaign: clubId is required');

  if (useBull && bullQueue) {
    try {
      const job = await bullQueue.add(
        `campaign-${campaignId}`,
        { campaignId, clubId },
        {
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
          removeOnComplete: { age: 60 * 60 * 24 }, // keep 24h for debugging
          removeOnFail: { age: 60 * 60 * 24 * 7 }, // keep failures 7 days
        }
      );
      logger.info(`[QUEUE] Enqueued campaign ${campaignId} → BullMQ job ${job.id}`);
      return true;
    } catch (err) {
      logger.error(`[QUEUE] Failed to add campaign ${campaignId} to BullMQ, using fallback:`, {
        error: err.message,
      });
    }
  }

  logger.info(`[QUEUE] In-process fallback: running campaign ${campaignId} in next tick.`);
  setImmediate(() => {
    runWithTenant({ clubId, isSystem: false }, async () => {
      try {
        await emailService.envoyerCampagne(campaignId);
      } catch (err) {
        logger.error(`[QUEUE][FALLBACK] Campaign ${campaignId} failed:`, { error: err.message });
      }
    });
  });

  return true;
}

module.exports = {
  enqueueCampaign,
  isDistributed: () => useBull,
};
