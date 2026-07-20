/**
 * utils/healthChecks.js
 *
 * DB/Redis health probes, shared by /api/health and the SaaS monitoring
 * endpoint so both report the exact same thing.
 */

const fs = require('fs');
const path = require('path');
const { sequelize } = require('../models');

async function checkDb() {
  try {
    await sequelize.authenticate();
    return { status: 'ok' };
  } catch (err) {
    return { status: 'error', message: err.message };
  }
}

async function checkRedis() {
  if (!process.env.REDIS_HOST && !process.env.REDIS_URL) {
    return { status: 'not_configured' };
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
    return { status: 'ok' };
  } catch (err) {
    return { status: 'error', message: err.message };
  }
}

const LOG_FILE = path.join(__dirname, '..', 'logs', 'app.log');
const TAIL_BYTES = 500 * 1024; // last ~500KB is enough for a day of activity at normal volume

/**
 * Reads recent [ERROR]/[WARN] lines from logger.js's plain-text log file,
 * limited to the last 24h. logger.js is a custom file logger (not Winston),
 * so this parses its `[<iso timestamp>] [<LEVEL>] <message> <json>` format.
 */
function getRecentErrors() {
  let raw;
  try {
    const { size } = fs.statSync(LOG_FILE);
    const start = Math.max(0, size - TAIL_BYTES);
    const fd = fs.openSync(LOG_FILE, 'r');
    const buffer = Buffer.alloc(size - start);
    fs.readSync(fd, buffer, 0, buffer.length, start);
    fs.closeSync(fd);
    raw = buffer.toString('utf8');
  } catch {
    return [];
  }

  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  const lineRegex = /^\[([^\]]+)\]\s\[(ERROR|WARN)\]\s(.*)$/;
  const events = [];

  for (const line of raw.split('\n')) {
    const match = line.match(lineRegex);
    if (!match) continue;
    const [, timestamp, level, message] = match;
    const time = Date.parse(timestamp);
    if (Number.isNaN(time) || time < cutoff) continue;
    events.push({ timestamp, level: level.toLowerCase(), message: message.trim() });
  }

  return events.slice(-50).reverse();
}

module.exports = { checkDb, checkRedis, getRecentErrors };
