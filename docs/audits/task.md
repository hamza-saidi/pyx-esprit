# Refactoring Golf Huub — Plan d'Exécution Complet

## PHASE 0 — Corrections Immédiates (Jury)
- [x] Créer task.md
- [x] Supprimer 6 fichiers Campaigns*.jsx morts
- [x] Corriger Math.random() → crypto.randomInt() (authController.js)
- [x] Supprimer méthode _convertBase64ImagesToFiles dupliquée (emailService.js)
- [x] Déplacer scripts de debug vers backend/tools/
- [x] Corriger double requête SQL dans personnaliserContenu (emailService.js)
- [x] Corriger SyntaxError statisticsController.js (const dupliqués → vérification)
- [x] Fixer CORS permissif (app.js)
- [x] Masquer les erreurs raw en production (errorHandler.js)
- [x] Fixer JWT secret fallback dangereux (jwt.js utility)

## PHASE 1 — Architecture
- [x] Créer utils/queryBuilder.js (extraire buildContactQueryFromCriteria)
- [x] Supprimer scheduler setInterval de server.js (doublon)
- [x] Unifier le scheduler dans cronService.js (statut de campagne atomique)
- [x] Ajouter indexes SQL manquants (migration SQL)
- [x] Synchroniser golf_marketing_schema.sql avec le schéma réel
- [x] Configurer ESLint + Prettier (.eslintrc.js, .prettierrc)
- [x] Écrire 5+ tests Jest (queryBuilder, jwt config)
- [x] Configurer Jest (package.json backend)
- [x] Corriger dépendance circulaire service→controller

## PHASE 2 — Fiabilité Production
- [x] Ajouter structure BullMQ/Queue (queueService.js avec fallback local)
- [x] Abstraire emailService pour utiliser la queue (campagneController.js)
- [x] Ajouter Sequelize Migrations (migrationRunner.js transactionnel auto-exécuté)
- [x] Ajouter documentation OpenAPI/Swagger (swagger.js UI interactive)
- [x] Ajouter abstraction storage (fileStorage.js avec S3 / fallback local)
- [x] Configurer PM2 (ecosystem.config.js en mode cluster)
- [x] Ajouter CSRF protection (csrf.js double-submit cookie)

## PHASE 3 — SaaS Grade
- [x] Ajouter club_id (multi-tenancy) sur les modèles clés (Utilisateur, Contact, CampagneEmail, etc.)
- [x] Migration SQL multi-tenant (ajout dynamique des colonnes et index)
- [x] Middleware tenantScope automatique (isolation des données par JWT club_id)
- [x] README mis à jour avec architecture complète
