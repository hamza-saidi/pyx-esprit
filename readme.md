# Pylon Pyx — SaaS CRM & Email Marketing

[![CI](https://github.com/hamza-saidi/pyx-esprit/actions/workflows/ci.yml/badge.svg)](https://github.com/hamza-saidi/pyx-esprit/actions/workflows/ci.yml)

Plateforme SaaS multi-tenant de gestion de contacts et d'email marketing. Backend Node.js/Express/Sequelize/MySQL, frontend React/MUI, infrastructure Docker complète.

---

## Démarrage rapide (3 commandes)

```bash
# 1. Copier et remplir les variables d'environnement
cp backend/.env.example backend/.env
# Éditer backend/.env : renseigner au minimum JWT_SECRET et JWT_REFRESH_SECRET

# 2. Démarrer tous les services (MySQL 8 + Redis 7 + Backend + Frontend Nginx)
docker compose up

# 3. Ouvrir dans le navigateur
open http://localhost:3000
```

> **Première fois** : MySQL initialise le schéma automatiquement, puis les 13 migrations Sequelize s'exécutent au démarrage du backend.

---

## Commandes utiles

```bash
make dev            # docker compose up (interactif, avec logs)
make dev-d          # docker compose up -d (arrière-plan)
make down           # arrêter tous les conteneurs
make migrate        # exécuter les migrations Sequelize
make test           # lancer les tests Jest
make lint           # ESLint backend
make logs           # suivre les logs (tous les services)
make logs-backend   # logs backend uniquement
make shell-backend  # shell dans le conteneur backend
make shell-db       # client MySQL interactif
make release VERSION=1.0.0  # créer un tag et déclencher le CD
```

---

## Architecture

```
pylon-pyx/
├── backend/                  Node.js 20 / Express / Sequelize / MySQL 8
│   ├── controllers/          Traduction HTTP ↔ use-case
│   ├── use-cases/            Logique métier + validation zod .strict()
│   ├── repositories/         Accès DB avec club_id obligatoire
│   ├── models/               Modèles Sequelize + hooks multi-tenant
│   │   └── hooks/tenantScopeHooks.js   Fail-secure : injecte club_id
│   ├── migrations/           13 migrations (exécutées au boot)
│   └── utils/
│       ├── tenantContext.js  AsyncLocalStorage (isolation tenant)
│       └── logger.js         Winston JSON structuré
│
├── frontend/                 React 18 / Vite / Material-UI v5
│   ├── src/pages/            Pages (lazy-loaded par route)
│   ├── src/features/         Redux Toolkit slices
│   └── src/components/       Composants partagés (layout, etc.)
│
├── docker-compose.yml        Dev (montage source, phpMyAdmin)
├── docker-compose.prod.yml   Production (pull GHCR, resource limits)
├── .github/workflows/
│   ├── ci.yml                Lint → Tests MySQL+Redis → Docker → GHCR
│   └── cd.yml                Deploy SSH sur tag vX.Y.Z
└── Makefile                  Raccourcis développeur
```

---

## Stack

| Couche | Technologie |
|--------|------------|
| Backend | Node.js 20, Express 4, Sequelize 6, MySQL 8 |
| Auth | JWT (access + refresh), CSRF Double-Submit Cookie, bcrypt |
| Queue | BullMQ + Redis 7 (envoi campagnes asynchrone) |
| Frontend | React 18, Vite, Material-UI v5, Redux Toolkit |
| Infra | Docker multi-stage, Nginx, GitHub Actions CI/CD |
| Email | SMTP ou Microsoft Graph (Azure AD) |
| IA | Groq API (génération de contenu email) |

---

## Sécurité

- **Isolation multi-tenant** — AsyncLocalStorage + hooks Sequelize fail-secure : chaque requête HTTP est scopée au `club_id` du JWT. Un oubli dans le code déclenche une erreur, pas une fuite.
- **Injection SQL** corrigée — `Op.in` avec `Number.isInteger`, suppression de tous les `sequelize.literal` avec interpolation de chaîne.
- **Mass assignment** corrigé — `pick()` ou schémas zod `.strict()` sur tous les endpoints d'écriture.
- **Path traversal** sur `/media/:name` — whitelist de caractères + préfixe `club_id` sur les noms de fichiers uploadés.

---

## Déploiement production

```bash
# Déclenche le pipeline CD (build → push GHCR → deploy SSH)
make release VERSION=1.0.0
```

**Secrets GitHub à configurer** (`Settings → Secrets → Actions`) :

| Secret | Description |
|--------|-------------|
| `DEPLOY_HOST` | IP ou hostname du VPS |
| `DEPLOY_USER` | Utilisateur SSH |
| `DEPLOY_SSH_KEY` | Clé privée SSH (contenu complet) |
| `DEPLOY_PATH` | Chemin sur le serveur (ex: `/opt/pylon-pyx`) |

---

## Variables d'environnement

Voir [`backend/.env.example`](backend/.env.example) pour la liste complète avec descriptions.

---

*Projet PFE — ESPRIT Tunis 2026 · [hamza-saidi](https://github.com/hamza-saidi)*
