const { Utilisateur } = require('./models');
const bcrypt = require('bcryptjs');

async function createTempUser() {
  const hash = await bcrypt.hash('Admin123!', 12);
  try {
    const user = await Utilisateur.create({
      nom: 'Antigravity Temp',
      email: 'temp@golfhuub.com',
      mot_de_passe: hash,
      role: 'employee', // No MFA for employee
    });
    console.log('User created:', user.email);
  } catch (e) {
    console.log('User might already exist:', e.message);
  }
  process.exit();
}

createTempUser();
