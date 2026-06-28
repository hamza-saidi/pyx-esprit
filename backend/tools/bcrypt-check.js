const bcrypt = require('bcryptjs');

console.log('--- Bcrypt Validation Check ---');

async function check() {
  try {
    const password = 'TestPassword123!';
    console.log('Attempting to hash a password...');
    const hash = await bcrypt.hash(password, 10);
    console.log('✅ Hash successful:', hash);

    console.log('Attempting to compare password with hash...');
    const match = await bcrypt.compare(password, hash);
    console.log('✅ Compare successful. Match:', match);

    if (match) {
      console.log('✅ Bcrypt is working perfectly.');
    } else {
      console.log('❌ Bcrypt comparison failed.');
    }
  } catch (error) {
    console.error('❌ Bcrypt Failed:', error.message);
    if (error.stack) console.error(error.stack);
  }
}

check();
