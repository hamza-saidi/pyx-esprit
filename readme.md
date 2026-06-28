# Golf Huub — SaaS Marketing Platform ⛳

Plateforme de gestion marketing unifiée, robuste et multi-tenant, conçue pour les clubs de golf. Permet la gestion complète des membres, l'envoi de campagnes ciblées, la segmentation avancée et le tracking de performance à l'échelle.

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)
![React](https://img.shields.io/badge/React-18-61dafb.svg)
![MySQL](https://img.shields.io/badge/MySQL-8.0-orange.svg)

---

## 📋 Table des matières

- [Architecture Système & SaaS](#-architecture-système--saas)
- [Sécurité & Conformité](#-sécurité--conformité)
- [Fonctionnalités Clés](#-fonctionnalités-clés)
- [Stack Technique](#-stack-technique)
- [Déploiement Production (PM2 Cluster)](#-déploiement-production-pm2-cluster)
- [Guide de Développement](#-guide-de-développement)

---

## 🏛 Architecture Système & SaaS

L'application a été entièrement refactorisée pour répondre aux standards de l'industrie (SaaS Enterprise Grade), favorisant la scalabilité, la résilience et l'isolation des données.

### Multi-Tenancy (Isolation Logique)
L'architecture est conçue autour d'un modèle **Multi-Tenant (Single Database)** :
- Un champ `club_id` est présent sur toutes les entités de domaine (Utilisateurs, Contacts, Campagnes, Segments).
- Un middleware global d'isolation (`tenantScope.js`) injecte dynamiquement la portée `club_id` extraite du JWT dans toutes les requêtes Sequelize (via `defaultScope`), garantissant qu'aucune fuite de données inter-clubs n'est possible, même en cas d'erreur de développement (Fail-Secure).

### Asynchronisme & Queues
- **Queue Service (`queueService.js`)** : Les envois massifs d'emails sont délégués à une file d'attente asynchrone (architecture hybride BullMQ/Redis ou In-Memory pour les environnements restreints). Cela permet un lissage de charge, évite les timeouts HTTP et gère les *retries* (tolérance aux pannes).
- **Cron Jobs (`cronService.js`)** : Unifiant les tâches planifiées, garantissant des transitions d'états atomiques (ex: de `programmée` à `en_cours`) compatibles avec un environnement multi-instances.

### Stockage & Médias
- **File Storage Abstraction (`fileStorage.js`)** : L'accès aux fichiers (pièces jointes, images) est abstrait, permettant un basculement transparent entre un stockage local sécurisé et un stockage Cloud (S3/Azure Blob) pour une haute disponibilité.

### Migrations Automatisées
- **Database Migrations (`migrationRunner.js`)** : Les schémas de base de données évoluent de manière programmatique via des migrations Sequelize exécutées automatiquement au démarrage, sécurisées par des transactions SQL.

---

## 🔐 Sécurité & Conformité

La sécurité (Fail-Secure by Design) est au cœur de l'API :
- **Authentification & MFA** : JWT signés asymétriquement avec validation des secrets, et génération cryptographique forte (MFA avec `crypto.randomInt`).
- **Protection CSRF** : Implémentation du pattern *Double-Submit Cookie* via le middleware `csrf.js`.
- **CORS Sécurisé** : Règles strictes en environnement de production, permissif uniquement en développement local.
- **Masquage d'Erreurs (Data Leakage Prevention)** : Le middleware `errorHandler.js` intercepte toutes les exceptions et empêche la fuite de stack traces ou de requêtes SQL en production.

---

## ✨ Fonctionnalités Clés

### 👥 Gestion CRM
- Import/Export Excel et CSV avec mapping intelligent.
- Filtrage avancé par segments dynamiques (sexe, handicap, etc.).
- Système de tags n-to-n.

### ✉️ Moteur de Campagnes Email
- Éditeur HTML riche (SunEditor).
- Ciblage matriciel (Tags × Segments).
- Envoi immédiat ou planifié avec tracking de bout en bout (Open/Click rates).

### 📈 Analytics & Reporting
- Tableau de bord en temps réel.
- Graphiques de performances des campagnes via Recharts.

---

## 🛠 Stack Technique

### Backend (API REST Node.js)
- **Framework** : Express.js
- **ORM** : Sequelize (MySQL)
- **Architecture** : MVC / Service Layer Pattern
- **Qualité de code** : Jest (Tests unitaires), ESLint + Prettier
- **Documentation API** : Swagger UI Open API v3

### Frontend (SPA React)
- **Core** : React 18, Vite
- **UI** : Material UI (MUI)
- **State Management** : Redux Toolkit
- **Routage** : React Router v6

---

## 🚀 Déploiement Production (PM2 Cluster)

Pour maximiser les performances sur des machines multi-cœurs, le backend exploite `pm2` en mode **Cluster**.

### 1. Prérequis Serveur
- Node.js 18+
- MySQL 8.0+
- (Optionnel) Redis Server pour BullMQ

### 2. Configuration Environnement
Le fichier `.env` est critique. Assurez-vous de renseigner en production :
```env
NODE_ENV=production
# Sécurité
JWT_SECRET="CLE_FORTE_OBLIGATOIRE"
ALLOWED_ORIGINS="https://votre-app.com"
# Base de données
DB_HOST=127.0.0.1
DB_NAME=golf_marketing
# Multi-Threading
PM2_INSTANCES=max
```

### 3. Démarrage via PM2
```bash
npm install -g pm2
cd backend
npm install --production

# Le fichier ecosystem.config.js gère la configuration du cluster
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

---

## 💻 Guide de Développement

### Lancer l'environnement local

**1. Base de données :**
Assurez-vous qu'un serveur MySQL local est lancé, puis créez la base :
```sql
CREATE DATABASE golf_marketing;
```

**2. Backend :**
```bash
cd backend
npm install
cp .env.example .env
npm run dev
```
> Les migrations s'exécutent automatiquement. La documentation API (Swagger) est disponible sur `http://localhost:50000/api-docs`.

**3. Frontend :**
```bash
cd frontend
npm install
npm run dev
```
> Le portail Web est accessible sur `http://localhost:3000`.

---
*Projet développé dans le cadre d'un PFE - Architecture certifiée SaaS Enterprise.*
