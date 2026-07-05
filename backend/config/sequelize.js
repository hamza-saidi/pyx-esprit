require('dotenv').config();

let configTemp = { database: {} };
try {
  configTemp = require('../config-temp');
} catch {
  /* absent in CI/prod — env vars take over */
}

const db = configTemp.database || {};

const connection = {
  username: process.env.DB_USER || db.user,
  password: process.env.DB_PASSWORD || db.password || null,
  database: process.env.DB_NAME || db.name,
  host: process.env.DB_HOST || db.host || '127.0.0.1',
  port: Number(process.env.DB_PORT || db.port || 3306),
  dialect: 'mysql',
  dialectOptions: { charset: 'utf8mb4' },
  define: { charset: 'utf8mb4', collate: 'utf8mb4_general_ci' },
};

module.exports = { development: connection, test: connection, production: connection };
