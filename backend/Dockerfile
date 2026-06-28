# ==========================================================
# Dockerfile — Golf Huub Backend (Node.js)
# Multi-stage build: sépare les dépendances de dev du runtime
# ==========================================================

# ── Stage 1 : Installation des dépendances ─────────────────
FROM node:20-alpine AS deps

WORKDIR /app

# Copier uniquement les manifestes de dépendances (optimise le cache Docker)
COPY package.json package-lock.json ./

# Installer uniquement les dépendances de production (npm ci = installation propre et déterministe)
RUN npm ci --only=production

# ── Stage 2 : Image de production finale ────────────────────
FROM node:20-alpine AS runner

# Sécurité : ne pas tourner en root
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nodeapp

WORKDIR /app

# Copier les dépendances depuis le stage précédent
COPY --from=deps --chown=nodeapp:nodejs /app/node_modules ./node_modules

# Copier le code source (exclu par .dockerignore: node_modules, .env, logs)
COPY --chown=nodeapp:nodejs . .

# Créer le dossier uploads avec les bonnes permissions
RUN mkdir -p uploads && chown nodeapp:nodejs uploads

# Changer d'utilisateur avant de démarrer
USER nodeapp

# Port exposé (doit correspondre à PORT dans .env ou docker-compose)
EXPOSE 5000

# Healthcheck Docker natif : vérifie que l'API répond
HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5000/api/csrf-token', (r) => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

# Démarrer l'application
CMD ["node", "server.js"]
