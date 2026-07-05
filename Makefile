# =============================================================
# Makefile — Pylon Pyx
# Usage : make <cible>
# =============================================================

.PHONY: help dev down build test lint migrate logs shell-backend shell-db prod release

# Couleurs
CYAN  := \033[36m
RESET := \033[0m

help: ## Afficher cette aide
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) \
	  | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(CYAN)%-18s$(RESET) %s\n", $$1, $$2}'

# ── Développement ─────────────────────────────────────────────
dev: ## Démarrer l'environnement de développement (docker compose)
	docker compose up

dev-d: ## Démarrer en arrière-plan
	docker compose up -d

down: ## Arrêter tous les conteneurs
	docker compose down

down-v: ## Arrêter et supprimer les volumes (reset complet)
	docker compose down -v

# ── Build ───���──────────────────────────────────────────────────
build: ## Rebuilder les images Docker (dev)
	docker compose build --no-cache

build-backend: ## Rebuilder uniquement l'image backend
	docker compose build --no-cache backend

build-frontend: ## Rebuilder uniquement l'image frontend
	docker compose build --no-cache frontend

# ── Tests & qualité ────────────────────────────────────────────
test: ## Lancer les tests Jest (dans le conteneur backend)
	docker compose run --rm backend npm test

test-cov: ## Tests Jest avec rapport de couverture
	docker compose run --rm backend npm run test:coverage

smoke: ## Smoke test — vérifier toutes les fonctionnalités en 1 commande
	docker compose exec backend node smoke-test.js

lint: ## ESLint backend
	docker compose run --rm backend npm run lint

lint-fix: ## ESLint backend + autofix
	docker compose run --rm backend npm run lint:fix

# ── Base de données ───────���────────────────────────────────────
migrate: ## Exécuter les migrations Sequelize
	docker compose run --rm backend npx sequelize-cli db:migrate

migrate-undo: ## Annuler la dernière migration
	docker compose run --rm backend npx sequelize-cli db:migrate:undo

migrate-status: ## Voir l'état des migrations
	docker compose run --rm backend npx sequelize-cli db:migrate:status

# ── Logs ──────��───────────────────────────────────────────────
logs: ## Suivre les logs de tous les services
	docker compose logs -f

logs-backend: ## Logs backend uniquement
	docker compose logs -f backend

logs-db: ## Logs MySQL uniquement
	docker compose logs -f db

# ── Shells interactifs ──��──────────────────────────────────────
shell-backend: ## Shell dans le conteneur backend
	docker compose exec backend sh

shell-db: ## Client MySQL dans le conteneur db
	docker compose exec db mysql -u $${DB_USER:-golf_user} -p$${DB_PASSWORD:-golf_dev_pass} $${DB_NAME:-golf_marketing}

# ── Production ─────────────────────────────────────────────────
prod: ## Démarrer en mode production (docker-compose.prod.yml)
	docker compose -f docker-compose.prod.yml up -d

prod-down: ## Arrêter la production
	docker compose -f docker-compose.prod.yml down

prod-logs: ## Logs production
	docker compose -f docker-compose.prod.yml logs -f

# ── Release ────────────────────────────────────────────────────
release: ## Créer un tag de release (ex: make release VERSION=1.2.0)
	@test -n "$(VERSION)" || (echo "Usage: make release VERSION=x.y.z" && exit 1)
	git tag v$(VERSION)
	git push origin v$(VERSION)
	@echo "Tag v$(VERSION) pushed — CD pipeline lancé automatiquement."
