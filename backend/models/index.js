const { Sequelize } = require('sequelize');
const fs = require('fs');
const path = require('path');
const config = require('../config-temp');
const dotenv = require('dotenv');

// Load environment variables from .env if present
dotenv.config();

// Prefer environment variables for local/dev, fallback to config-temp
const databaseName = process.env.DB_NAME || config.database.name;
const databaseUser = process.env.DB_USER || config.database.user;
const databasePassword = process.env.DB_PASSWORD || config.database.password;
const databaseHost = process.env.DB_HOST || config.database.host;
const databasePort = Number(process.env.DB_PORT || config.database.port || 3306);

const sequelize = new Sequelize(databaseName, databaseUser, databasePassword, {
  host: databaseHost,
  port: databasePort,
  dialect: 'mysql',
  logging: false,
  dialectOptions: {
    charset: 'utf8mb4',
  },
  define: {
    charset: 'utf8mb4',
    collate: 'utf8mb4_general_ci',
  },
  // Conservative pool but expanded for production stability
  pool: {
    max: 15,
    min: 2,
    acquire: 30000,
    idle: 10000,
    evict: 10000,
  },
});

const db = {};

fs.readdirSync(__dirname)
  .filter((file) => file !== 'index.js' && file.endsWith('.js'))
  .forEach((file) => {
    const model = require(path.join(__dirname, file))(sequelize, Sequelize.DataTypes);
    db[model.name] = model;
  });

// Associations
Object.keys(db).forEach((modelName) => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

// Multi-tenancy fail-secure safety net (see models/hooks/tenantScopeHooks.js)
const { applyTenantHooks } = require('./hooks/tenantScopeHooks');
applyTenantHooks(db);

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;
