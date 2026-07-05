module.exports = {
  // Sélection du fournisseur d'envoi: 'smtp' | 'graph'
  provider: process.env.MAIL_PROVIDER || 'graph',
  // Configuration SMTP par défaut
  smtp: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: process.env.SMTP_PORT || 587,
    secure: false, // true pour 465, false pour autres ports
    auth: {
      user: process.env.SMTP_USER || '',
      pass: process.env.SMTP_PASS || '',
    },
    tls: {
      rejectUnauthorized: false,
    },
  },

  // Configuration de développement (MailHog)
  development: {
    host: 'localhost',
    port: 1025,
    ignoreTLS: true,
  },

  // Configuration de l'expéditeur (fallback global — préférer les paramètres par organisation)
  from: process.env.SMTP_FROM || process.env.GRAPH_FROM || 'noreply@example.com',

  // Configuration des en-têtes personnalisés
  headers: {
    'X-Mailer': 'Pylon Pyx',
    'X-Priority': '3',
  },

  // Limites d'envoi
  limits: {
    emailsPerSecond: 10, // Nombre d'emails par seconde pour éviter le spam
    maxRetries: 3, // Nombre maximum de tentatives en cas d'échec
    retryDelay: 5000, // Délai entre les tentatives en millisecondes
    batchSize: 50, // Batches plus petits
    dailyLimit: 500,
  },

  // Configuration Microsoft Graph (application Azure AD en mode client credentials)
  graph: {
    tenantId: process.env.GRAPH_TENANT_ID || '',
    clientId: process.env.GRAPH_CLIENT_ID || '',
    clientSecret: process.env.GRAPH_CLIENT_SECRET || '',
    // Utilisateur/boîte aux lettres expéditeur: email ou id Graph
    senderUserId: process.env.GRAPH_SENDER_USER_ID || '',
    senderEmail: process.env.GRAPH_SENDER_EMAIL || process.env.SMTP_FROM || 'noreply@example.com',
    saveToSentItems: (process.env.GRAPH_SAVE_TO_SENT_ITEMS || 'true') === 'true',
  },

  // Configuration des templates
  templates: {
    unsubscribeUrl: process.env.FRONTEND_URL
      ? `${process.env.FRONTEND_URL}/unsubscribe`
      : 'http://localhost:3000/unsubscribe',
    trackingPixelUrl: process.env.BACKEND_URL
      ? `${process.env.BACKEND_URL}/tracking/pixel`
      : 'http://localhost:5000/tracking/pixel',
  },
};
