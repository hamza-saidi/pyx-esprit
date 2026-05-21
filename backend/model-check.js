const { Utilisateur, sequelize } = require('./models');
const dotenv = require('dotenv');

dotenv.config();

console.log('--- Model Validation Check ---');

async function check() {
  try {
    await sequelize.authenticate();
    console.log('✅ Connection established.');

    console.log('Attempting to find one user via Utilisateur model...');
    const user = await Utilisateur.findOne();
    
    if (user) {
      console.log('✅ Success! Found user:', { id: user.id, email: user.email, role: user.role });
    } else {
      console.log('ℹ️ No users found in table, but query succeeded.');
    }

  } catch (error) {
    console.error('❌ Model Query Failed:', error.message);
    if (error.stack) console.error(error.stack);
  } finally {
    await sequelize.close();
  }
}

check();
