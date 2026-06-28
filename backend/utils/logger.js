const fs = require('fs');
const path = require('path');

const LOGS_DIR = path.join(__dirname, '..', 'logs');
let LOG_FILE = path.join(LOGS_DIR, 'app.log');

// Ensure logs directory exists with extreme fallback
try {
  if (!fs.existsSync(LOGS_DIR)) {
    fs.mkdirSync(LOGS_DIR, { recursive: true });
  }
} catch (err) {
  console.error('CRITICAL: Failed to create logs directory. Falling back to root.', err.message);
  // Fallback: write log in the current directory if logs/ is inaccessible
  LOG_FILE = path.join(__dirname, '..', 'local_app_fallback.log');
}

/**
 * writeLog
 * Appends a message to the logs/app.log file with a timestamp
 */
function writeLog(level, message, details = '') {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] [${level.toUpperCase()}] ${message} ${details ? JSON.stringify(details) : ''}\n`;

  // Console logging (fallback)
  if (level === 'error') console.error(logEntry.trim());
  else if (level === 'warn') console.warn(logEntry.trim());
  else console.log(logEntry.trim());

  // File logging
  try {
    fs.appendFileSync(LOG_FILE, logEntry);
  } catch (err) {
    console.error('Failed to write to log file:', err);
  }
}

module.exports = {
  info: (msg, details) => writeLog('info', msg, details),
  warn: (msg, details) => writeLog('warn', msg, details),
  error: (msg, details) => writeLog('error', msg, details),
};
