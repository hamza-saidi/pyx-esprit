# Module des Campagnes Email - Golf Hub

## Vue d'ensemble

Le module des campagnes email a été entièrement refactorisé et amélioré pour offrir une solution complète et professionnelle de marketing par email. Il inclut la création, la programmation, l'envoi et le suivi des campagnes email avec des fonctionnalités avancées.

## 🚀 Fonctionnalités principales

### 1. Gestion des campagnes
- **Création** : Interface intuitive pour créer des campagnes avec éditeur HTML intégré
- **Programmation** : Planification d'envoi avec dates et heures
- **Envoi immédiat** : Possibilité d'envoyer immédiatement ou de programmer
- **Tests** : Envoi d'emails de test avant diffusion
- **Statuts** : Brouillon, programmée, en cours, envoyée, annulée, erreur

### 2. Éditeur d'email avancé
- **Mode HTML** : Édition directe du code HTML
- **Mode aperçu** : Visualisation en temps réel
- **Mode texte** : Édition du contenu texte avec conversion automatique
- **Barre d'outils** : Formatage, insertion de tableaux, images, liens
- **Variables** : Personnalisation avec {{email}}, {{unsubscribe_link}}, {{tracking_pixel}}
- **Historique** : Annuler/rétablir les modifications

### 3. Gestion des destinataires
- **Segments** : Ciblage par critères (handicap, ville, type client, etc.)
- **Tags** : Filtrage par étiquettes
- **Contacts spécifiques** : Ajout manuel de contacts
- **Calcul en temps réel** : Nombre de destinataires avant envoi

### 4. Envoi et suivi
- **Service SMTP** : Configuration flexible (Gmail, serveur privé, etc.)
- **Limitation de débit** : Respect des bonnes pratiques anti-spam
- **Retry automatique** : Tentatives en cas d'échec
- **Tracking** : Pixels de suivi, liens de désabonnement
- **Statistiques** : Ouvertures, clics, erreurs en temps réel

### 5. Statistiques et rapports
- **Métriques clés** : Taux d'ouverture, taux de clic, erreurs
- **Suivi des envois** : Statut de chaque email individuel
- **Rapports détaillés** : Bounces, spam, désabonnements
- **Visualisations** : Graphiques et indicateurs de performance

## 🛠️ Installation et configuration

### Prérequis
- Node.js 16+
- MySQL 8.0+
- NPM ou Yarn

### 1. Installation des dépendances
```bash
cd backend
npm install

cd ../frontend
npm install
```

### 2. Configuration de la base de données
```bash
# Créer la base de données
mysql -u root -p < sql/golf_marketing_schema.sql

# Peupler avec des données de test
cd backend
node seed.js
```

### 3. Configuration des variables d'environnement
Créer un fichier `.env` dans le dossier `backend/` :

```env
# Base de données
DB_HOST=localhost
DB_PORT=3306
DB_NAME=golf_marketing
DB_USER=root
DB_PASS=votre_mot_de_passe

# JWT
JWT_SECRET=votre_secret_jwt_super_securise
JWT_EXPIRES_IN=24h

# SMTP pour l'envoi d'emails
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=votre_email@gmail.com
SMTP_PASS=votre_mot_de_passe_app
SMTP_FROM=noreply@golfclub.com

# Configuration de l'application
NODE_ENV=development
PORT=5000
FRONTEND_URL=http://localhost:3000

# IMPORTANT (liens dans les emails)
# URL publique du backend utilisée pour générer les liens de tracking (clics/ouvertures).
# En production, elle doit pointer vers votre domaine accessible publiquement (pas localhost).
PUBLIC_BASE_URL=http://localhost:5000
```

### 4. Configuration SMTP

#### Gmail
1. Activer l'authentification à 2 facteurs
2. Générer un mot de passe d'application
3. Utiliser ce mot de passe dans `SMTP_PASS`

#### Serveur privé
```env
SMTP_HOST=votre_serveur_smtp.com
SMTP_PORT=587
SMTP_USER=votre_utilisateur
SMTP_PASS=votre_mot_de_passe
```

#### Mode développement (MailHog)
```bash
# Installer MailHog
# Sur Windows avec Chocolatey :
choco install mailhog

# Sur macOS avec Homebrew :
brew install mailhog

# Démarrer MailHog
mailhog
```

### 5. Démarrage des services
```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm start
```

## 📧 Utilisation

### 1. Créer une campagne

1. **Accéder au module** : Menu "Campagnes" → "Nouvelle Campagne"
2. **Remplir les informations** :
   - Titre et sujet
   - Type de campagne (newsletter, promotion, etc.)
   - Priorité et date de programmation
   - Segment cible ou contacts spécifiques
3. **Éditer le contenu** :
   - Utiliser l'éditeur HTML avec aperçu en temps réel
   - Insérer des variables de personnalisation
   - Tester avec l'aperçu
4. **Sauvegarder** : La campagne est créée en statut "Brouillon"

### 2. Programmer l'envoi

1. **Sélectionner la campagne** dans la liste
2. **Cliquer sur "Programmer"**
3. **Choisir la date et l'heure** d'envoi
4. **Confirmer** : La campagne passe en statut "Programmée"

### 3. Envoyer immédiatement

1. **Sélectionner la campagne**
2. **Cliquer sur "Envoyer"**
3. **Confirmer** : L'envoi démarre immédiatement

### 4. Tester avant envoi

1. **Ouvrir la campagne**
2. **Cliquer sur "Test"**
3. **Saisir l'email de test**
4. **Envoyer** : L'email de test est envoyé avec le préfixe [TEST]

### 5. Suivre les performances

1. **Accéder aux statistiques** de la campagne
2. **Consulter les métriques** : envois, ouvertures, clics
3. **Analyser les erreurs** et taux de livraison

## 🔧 Configuration avancée

### Limites d'envoi
```javascript
// backend/config/email.js
limits: {
  emailsPerSecond: 10,        // Emails par seconde
  maxRetries: 3,              // Tentatives en cas d'échec
  retryDelay: 5000            // Délai entre tentatives (ms)
}
```

### Personnalisation des templates
```javascript
// Variables disponibles dans les emails
{{email}}              // Email du destinataire
{{unsubscribe_link}}   // Lien de désabonnement
{{tracking_pixel}}     // Pixel de suivi invisible
```

### Hooks et événements
```javascript
// Écouter les événements d'envoi
emailService.on('email_sent', (data) => {
  console.log('Email envoyé:', data);
});

emailService.on('campagne_complete', (data) => {
  console.log('Campagne terminée:', data);
});
```

## 📊 Structure de la base de données

### Tables principales
- `campagne_email` : Campagnes et leurs métadonnées
- `envoi_email` : Suivi individuel de chaque email
- `statistique_campagne` : Statistiques agrégées
- `segment` : Critères de ciblage
- `contact` : Base de contacts
- `tag` : Système d'étiquetage

### Relations
- Une campagne peut cibler un segment
- Une campagne peut avoir plusieurs envois
- Chaque envoi est lié à un contact
- Les statistiques sont calculées en temps réel

## 🚨 Dépannage

### Problèmes courants

#### 1. Erreur de connexion SMTP
```bash
# Vérifier la configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=votre_email@gmail.com
SMTP_PASS=mot_de_passe_app_gmail
```

#### 2. Emails non reçus
- Vérifier le dossier spam
- Contrôler les logs du serveur
- Tester avec MailHog en développement

#### 3. Erreurs de base de données
```bash
# Vérifier la connexion
mysql -u root -p golf_marketing

# Recréer les tables
cd backend
node seed.js
```

#### 4. Performance lente
- Réduire `emailsPerSecond` dans la config
- Vérifier la bande passante SMTP
- Optimiser les requêtes de base de données

### Logs et monitoring
```bash
# Logs du backend
tail -f backend/logs/app.log

# Vérifier la santé du service email
curl http://localhost:5000/api/health/email
```

## 🔒 Sécurité

### Bonnes pratiques
1. **Authentification** : Toutes les routes nécessitent un token JWT
2. **Validation** : Vérification des données d'entrée
3. **Rate limiting** : Limitation du débit d'envoi
4. **Logs** : Traçabilité complète des actions
5. **HTTPS** : En production, utiliser HTTPS

### Variables d'environnement sensibles
- `JWT_SECRET` : Secret pour les tokens JWT
- `SMTP_PASS` : Mot de passe SMTP
- `DB_PASS` : Mot de passe de base de données

## 📈 Évolutions futures

### Fonctionnalités prévues
- [ ] Templates d'emails prédéfinis
- [ ] A/B testing automatique
- [ ] Intégration avec des services tiers (Mailchimp, SendGrid)
- [ ] Rapports automatisés par email
- [ ] API webhook pour les événements
- [ ] Interface mobile responsive

### Optimisations techniques
- [ ] Cache Redis pour les statistiques
- [ ] Queue Redis pour l'envoi asynchrone
- [ ] Compression des emails
- [ ] CDN pour les images
- [ ] Monitoring Prometheus/Grafana

## 🤝 Contribution

### Développement
1. Fork le projet
2. Créer une branche feature
3. Implémenter les améliorations
4. Tester avec les tests unitaires
5. Soumettre une pull request

### Tests
```bash
# Backend
cd backend
npm test

# Frontend
cd frontend
npm test
```

## 📞 Support

Pour toute question ou problème :
- Créer une issue sur GitHub
- Consulter la documentation technique
- Contacter l'équipe de développement

---

**Version** : 2.0.0  
**Dernière mise à jour** : Décembre 2024  
**Maintenu par** : Équipe Golf Hub
