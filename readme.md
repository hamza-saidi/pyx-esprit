# Golf Huub - Plateforme Marketing Golf Club

Plateforme complète de gestion marketing pour les clubs de golf, incluant la gestion des contacts, campagnes email, segments, tags, statistiques et bien plus.

## 📋 Table des matières

- [Fonctionnalités](#-fonctionnalités)
- [Stack Technique](#-stack-technique)
- [Installation](#-installation)
- [Configuration](#-configuration)
- [Développement](#-développement)
- [Build et Production](#-build-et-production)
- [Structure du Projet](#-structure-du-projet)
- [Scripts Utiles](#-scripts-utiles)

## ✨ Fonctionnalités

### Gestion des Contacts
- Import/Export Excel et CSV
- Filtrage avancé par tags, segments, catégories, distributions
- Gestion des tags multiples par contact
- Pagination et recherche
- Template d'import disponible

### Campagnes Email
- Création et édition de campagnes avec éditeur HTML riche
- Ciblage par tags, segments ou les deux simultanément
- Envoi immédiat ou programmé
- Pièces jointes supportées
- Tracking des ouvertures et clics
- Statistiques détaillées par campagne

### Segments
- Création de segments avec critères multiples
- Filtrage par : sexe, handicap, ville, nationalité, type client, tags, etc.
- Aperçu du nombre de contacts correspondants
- Sélection multiple de tags dans les critères

### Tags
- Gestion des tags avec comptage des contacts liés
- Fusion de tags (script disponible)
- Affichage du nombre réel de contacts par tag
- Pagination et recherche

### Statistiques
- Tableau de bord avec métriques globales
- Statistiques par campagne (ouvertures, clics, erreurs)
- Graphiques de performance
- Export des données

### Autres
- Gestion des utilisateurs (admin peut ajouter des utilisateurs)
- Modèles d'email réutilisables
- Anniversaires des contacts
- Événements et RSVP
- Désabonnement public

## 🛠 Stack Technique

### Backend
- **Node.js** + **Express** - Serveur API REST
- **Sequelize** - ORM pour MySQL
- **JWT** - Authentification par tokens
- **Nodemailer** / **Microsoft Graph API** - Envoi d'emails
- **Multer** - Upload de fichiers
- **XLSX** - Traitement Excel
- **bcrypt** - Hashage des mots de passe

### Frontend
- **React 18** + **Vite** - Framework et build tool
- **Material UI (MUI)** - Composants UI
- **Redux Toolkit** - Gestion d'état
- **React Router** - Navigation
- **SunEditor** - Éditeur HTML riche
- **Axios** - Client HTTP
- **Recharts** - Graphiques

### Base de données
- **MySQL** (XAMPP recommandé pour le développement)

## 🚀 Installation

### Prérequis
- Node.js 18+ et npm
- MySQL (XAMPP recommandé)
- Git

### 1. Cloner le projet
```bash
git clone <repository-url>
cd "golf huub"
```

### 2. Base de données

#### Option A : XAMPP (Recommandé pour développement)
1. Démarrez XAMPP et activez MySQL
2. Créez une base de données `golf_marketing` (ou le nom de votre choix)
3. Importez le script `sql/golf_marketing_schema.sql` via phpMyAdmin

#### Option B : MySQL en ligne de commande
```bash
mysql -u root -p
CREATE DATABASE golf_marketing;
USE golf_marketing;
SOURCE sql/golf_marketing_schema.sql;
```

### 3. Backend

```bash
cd backend
npm install
```

Créez un fichier `.env` à partir de `.env.example` :
```bash
cp .env.example .env
```

Modifiez `.env` avec vos paramètres :
```env
DB_HOST=localhost
DB_PORT=3306
DB_NAME=golf_marketing
DB_USER=root
DB_PASSWORD=

JWT_SECRET=votre_secret_jwt_ici
JWT_EXPIRES_IN=7d

# Configuration Email (SMTP ou Microsoft Graph)
EMAIL_PROVIDER=smtp  # ou 'graph'
EMAIL_FROM=noreply@golfclub.com
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=votre_email@gmail.com
SMTP_PASS=votre_mot_de_passe

# Ou pour Microsoft Graph
GRAPH_TENANT_ID=votre_tenant_id
GRAPH_CLIENT_ID=votre_client_id
GRAPH_CLIENT_SECRET=votre_client_secret
GRAPH_SENDER_EMAIL=votre_email@domaine.com

PORT=50000
NODE_ENV=development
```

Démarrez le serveur :
```bash
npm run dev  # Mode développement avec nodemon
# ou
npm start   # Mode production
```

Le backend sera accessible sur `http://localhost:50000`

### 4. Frontend

```bash
cd frontend
npm install
npm run dev
```

Le frontend sera accessible sur `http://localhost:3000`

## ⚙️ Configuration

### Variables d'environnement Backend

| Variable | Description | Exemple |
|----------|-------------|---------|
| `DB_HOST` | Hôte MySQL | `localhost` |
| `DB_PORT` | Port MySQL | `3306` |
| `DB_NAME` | Nom de la base | `golf_marketing` |
| `DB_USER` | Utilisateur MySQL | `root` |
| `DB_PASSWORD` | Mot de passe MySQL | |
| `JWT_SECRET` | Secret pour les tokens JWT | |
| `PORT` | Port du serveur backend | `50000` |
| `EMAIL_PROVIDER` | `smtp` ou `graph` | `smtp` |

### Variables d'environnement Frontend (Production)

Créez `.env.production` dans `frontend/` :
```env
VITE_API_BASE_URL=https://api.votredomaine.com/api
```

Si vous utilisez un reverse proxy, cette variable n'est pas nécessaire (l'application utilisera `/api` par défaut).

## 💻 Développement

### Structure des dossiers

```
golf huub/
├── backend/
│   ├── config/          # Configuration (email, etc.)
│   ├── controllers/     # Contrôleurs API
│   ├── middleware/      # Middleware (auth, etc.)
│   ├── models/          # Modèles Sequelize
│   ├── routes/          # Routes Express
│   ├── services/        # Services métier (emailService, etc.)
│   ├── uploads/         # Fichiers uploadés
│   └── utils/           # Utilitaires
├── frontend/
│   ├── src/
│   │   ├── api/         # Configuration axios
│   │   ├── components/   # Composants réutilisables
│   │   ├── features/    # Redux slices
│   │   ├── pages/       # Pages de l'application
│   │   └── theme/       # Thème Material UI
│   └── public/          # Assets statiques
└── sql/                 # Scripts SQL
```

### Scripts disponibles

#### Backend
```bash
npm run dev          # Démarre avec nodemon (auto-reload)
npm start            # Démarre en mode production
npm run generate:auto-tags  # Génère des tags automatiques
```

#### Frontend
```bash
npm run dev          # Démarre le serveur de développement
npm run build        # Build pour la production
npm run preview      # Prévisualise le build
```

## 🏗 Build et Production

### Build du Frontend

```bash
cd frontend
npm install
npm run build
```

Les fichiers de build seront dans `frontend/dist/`

### Configuration pour la Production

#### Option 1 : Reverse Proxy (Recommandé)

Configurez votre serveur web (Nginx, Apache) pour :
- Servir les fichiers statiques depuis `frontend/dist/`
- Rediriger `/api/*` vers votre backend

**Exemple Nginx :**
```nginx
server {
    listen 80;
    server_name votredomaine.com;

    # Frontend statique
    root /chemin/vers/frontend/dist;
    index index.html;

    # API proxy
    location /api {
        proxy_pass http://localhost:50000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # React Router (SPA)
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

#### Option 2 : Variable d'environnement

Créez `frontend/.env.production` :
```env
VITE_API_BASE_URL=https://api.votredomaine.com/api
```

Puis rebuild :
```bash
npm run build
```

### Déploiement Backend

1. Installez les dépendances : `npm install --production`
2. Configurez `.env` avec les valeurs de production
3. Utilisez un process manager comme PM2 :
```bash
npm install -g pm2
pm2 start backend/server.js --name golf-huub-api
pm2 save
pm2 startup
```

### Vérifications post-déploiement

- ✅ Tous les boutons d'export/import fonctionnent
- ✅ Les appels API utilisent l'URL correcte (pas de localhost)
- ✅ L'authentification fonctionne
- ✅ Les pièces jointes sont uploadées et téléchargées
- ✅ Les emails sont envoyés correctement
- ✅ Le tracking des ouvertures/clics fonctionne

## 📝 Scripts Utiles

### Fusion de Tags
```bash
cd backend
node merge-tags-db.js
```
Modifiez les constantes `SOURCE_TAG_NAMES` et `TARGET_TAG_NAME` dans le fichier avant d'exécuter.

### Génération de Tags Automatiques
```bash
cd backend
npm run generate:auto-tags
```

## 🔐 Sécurité

- Authentification JWT avec expiration
- Hashage des mots de passe avec bcrypt
- Protection des routes avec middleware d'authentification
- Autorisation par rôles (admin/employee)
- Validation des données côté serveur
- Protection CORS configurée

## 📊 Base de Données

### Tables principales
- `contact` - Contacts du club
- `tag` - Tags pour catégoriser les contacts
- `contact_tag` - Relation many-to-many contacts/tags
- `segment` - Segments de contacts
- `campagne_email` - Campagnes email
- `envoi_email` - Historique des envois
- `statistique_campagne` - Statistiques des campagnes
- `utilisateur` - Utilisateurs de la plateforme

## 🐛 Dépannage

### Problème de connexion à la base de données
- Vérifiez que MySQL est démarré
- Vérifiez les credentials dans `.env`
- Vérifiez que la base de données existe

### Erreur "ECONNREFUSED" sur les appels API
- Vérifiez que le backend est démarré
- Vérifiez le port (50000 par défaut)
- Vérifiez la configuration CORS

### Les pièces jointes ne s'envoient pas
- Vérifiez les logs du serveur pour voir si les fichiers sont trouvés
- Vérifiez que le dossier `uploads/campaign-attachments` existe
- Vérifiez les permissions d'écriture

### Build échoue
- Vérifiez que toutes les dépendances sont installées
- Vérifiez la version de Node.js (18+)
- Supprimez `node_modules` et `package-lock.json`, puis réinstallez

## 📄 Licence

Propriétaire - Tous droits réservés

## 👥 Support

Pour toute question ou problème, contactez l'équipe de développement.

---

**Note :** Ce README est régulièrement mis à jour. Consultez les fichiers `BUILD.md` et `DEPLOYMENT_GUIDE.md` pour plus de détails sur le déploiement.
