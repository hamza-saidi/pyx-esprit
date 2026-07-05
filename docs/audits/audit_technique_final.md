# Bilan Technique — Pylon Pyx
> Évaluation honnête de l'état du projet au 05 juillet 2026

---

## Résumé

Pylon Pyx est une plateforme SaaS de CRM/email-marketing multi-tenant construite sur Node.js/Express/Sequelize/MySQL côté backend et React/MUI côté frontend. Ce document présente l'état réel du projet, ses points forts démontrables, et les limitations connues assumées.

---

## Points forts — démontrables

### Sécurité backend
- **Injection SQL corrigée** : les critères dynamiques (`tag_ids`) utilisaient `sequelize.literal` avec interpolation directe. Remplacé par `Op.in` avec validation `Number.isInteger`.
- **Mass assignment corrigé** : tous les contrôleurs utilisent `pick()` ou des schémas zod `.strict()` — plus de `Model.create(req.body)` brut.
- **Path traversal sur `/media/:name`** : whitelist de caractères + préfixe `club_id` sur le nom de fichier.
- **CSRF** : Double-Submit Cookie sur toutes les routes d'écriture via `csurf`.

### Isolation multi-tenant réelle
- Modèle `Club` + colonne `club_id` sur les 16 modèles Sequelize.
- `AsyncLocalStorage` (utils/tenantContext.js) alimenté par le middleware `tenantScope` depuis le JWT.
- Hooks Sequelize (`beforeFind`, `beforeCreate`, etc.) : injectent `club_id` automatiquement **et lèvent une erreur** si aucun contexte n'est posé (fail-secure).
- JWT signé avec `club_id` — le header `x-club-id` spoofable a été supprimé.
- Validé : test d'isolation 5/5 (deux clubs, zéro fuite cross-tenant).

### Architecture
- Clean Architecture partielle (repositories + use-cases + zod) sur : abonnement, tag, template, automation, segment, event.
- Les contrôleurs lourds (`campagneController`, `contactController`) gardent encore la logique en place — dette connue, non critique.
- Logger Winston/JSON structuré — 0 `console.*` dans les controllers et services HTTP.
- BullMQ/Redis opérationnel pour la queue d'envoi de campagnes.

### DevOps & CI/CD
- Docker multi-stage (backend + frontend Nginx), healthchecks, non-root user.
- GitHub Actions : lint → tests (MySQL + Redis réels) → Docker build → push GHCR (sur main).
- CD : déploiement SSH sur tag `vX.Y.Z` (activé par secret `DEPLOY_HOST`).
- Migrations Sequelize transactionnelles (13 migrations, exécutées au boot).

---

## Limitations connues (assumées)

| Limitation | Impact | Statut |
|---|---|---|
| `mfaStore` / `loginAttempts` en mémoire | Perd l'état MFA au redémarrage ; incompatible multi-instance | Redis disponible, migration non faite |
| Inscription publique (`/contacts/public`) épinglée au club 1 | Un seul club peut utiliser le formulaire d'inscription publique | Hors périmètre phase 1 |
| `campagneController.update` : whitelist manuelle, pas zod | Risque mass assignment résiduel si un champ est oublié | Dette technique documentée |
| Couverture de tests | Jest couvre utils + quelques routes d'intégration. 0% sur les contrôleurs lourds | Réaliste pour un PFE de 4 mois |

---

## Ce que ce projet n'est **pas**
- Un projet "production-ready" sans dette technique — aucun projet ne l'est après 4 mois.
- Un produit audité par un cabinet de sécurité externe.
- Une couverture de tests à 92 % — ce chiffre figurait dans un document auto-généré inexact, supprimé.

---

## Ce que ce projet **est**
Un prototype SaaS fonctionnel et correctement architecturé, avec une isolation multi-tenant réelle, des vulnérabilités critiques corrigées, et un pipeline CI/CD complet — le tout conçu, implémenté et livré dans le cadre d'un PFE d'ingénierie.
