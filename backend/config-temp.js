// Configuration temporaire pour le développement
// Remplace les variables d'environnement manquantes

module.exports = {
  // Base de données
  database: {
    name: 'golf_marketing',
    user: 'root',
    password: '',
    host: 'localhost',
    port: 3306
  },

  // JWT
  jwt: {
    secret: 'your-super-secret-jwt-key-here-12345',
    expiresIn: '24h'
  },

  // Application
  app: {
    port: 5000,
    nodeEnv: 'development',
    frontendUrl: 'http://localhost:3000'
  },

  // SMTP (optionnel pour les tests)
  smtp: {
    host: 'smtp.gmail.com',
    port: 587,
    user: 'your-email@gmail.com',
    pass: 'your-app-password',
    from: 'noreply@golfclub.com'
  }
};
