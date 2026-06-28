const { Sequelize } = require('sequelize');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');

dotenv.config();

// Prefer .env values, fallback to config-temp defaults
const DB_NAME = process.env.DB_NAME || 'golf_marketing';
const DB_USER = process.env.DB_USER || 'root';
const DB_PASSWORD = process.env.DB_PASSWORD || '';
const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = Number(process.env.DB_PORT || 3306);

async function createTestUser() {
  console.log("🔧 Création d'un utilisateur de test...\n");

  try {
    // Connexion à la base de données (utilise .env si présent)
    const sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASSWORD, {
      host: DB_HOST,
      port: DB_PORT,
      dialect: 'mysql',
      logging: false,
    });

    await sequelize.authenticate();
    console.log('✅ Connexion à la base de données réussie');

    // Vérifier les utilisateurs existants
    const [users] = await sequelize.query('SELECT id, nom, email, role FROM utilisateur LIMIT 5');
    console.log(`\n📊 Utilisateurs existants: ${users.length}`);
    users.forEach((user) => {
      console.log(`   - ${user.nom} (${user.email}) - ${user.role}`);
    });

    if (users.length === 0) {
      console.log("\n👤 Création d'un utilisateur de test...");
      const hashedPassword = await bcrypt.hash('password', 10);

      await sequelize.query(`
        INSERT INTO utilisateur (nom, email, mot_de_passe, role, date_creation) 
        VALUES ('Admin Test', 'admin@test.com', '${hashedPassword}', 'admin', NOW())
      `);

      console.log('✅ Utilisateur de test créé: admin@test.com / password');
    } else {
      console.log('\n✅ Utilisateurs existants trouvés');
    }

    // Vérifier les campagnes
    const [campagnes] = await sequelize.query(
      'SELECT id, titre, statut FROM campagne_email LIMIT 5'
    );
    console.log(`\n📧 Campagnes existantes: ${campagnes.length}`);
    campagnes.forEach((camp) => {
      console.log(`   - ${camp.titre} (${camp.statut})`);
    });

    await sequelize.close();
    console.log('\n🎉 Vérification terminée !');
  } catch (error) {
    console.error('\n❌ Erreur:', error.message);
    process.exit(1);
  }
}

createTestUser();
