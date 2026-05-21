const { Sequelize } = require('sequelize');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();

console.log('--- Database Connection Check ---');
console.log('DB_HOST:', process.env.DB_HOST);
console.log('DB_USER:', process.env.DB_USER);
console.log('DB_NAME:', process.env.DB_NAME);

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    dialect: 'mysql',
    logging: console.log
  }
);

async function check() {
  try {
    await sequelize.authenticate();
    console.log('✅ Connection has been established successfully.');

    const [results] = await sequelize.query('SHOW TABLES');
    console.log('Tables in database:', results);

    const tables = results.map(r => Object.values(r)[0]);
    if (tables.includes('utilisateur')) {
      console.log('✅ Table "utilisateur" exists.');
      const [users] = await sequelize.query('SELECT count(*) as count FROM utilisateur');
      console.log('Number of users in table:', users[0].count);
    } else {
      console.log('❌ Table "utilisateur" MISSING.');
    }

  } catch (error) {
    console.error('❌ Unable to connect to the database:', error.message);
  } finally {
    await sequelize.close();
  }
}

check();
