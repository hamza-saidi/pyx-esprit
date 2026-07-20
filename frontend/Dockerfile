# ==========================================================
# Dockerfile — Golf Huub Frontend (React + Vite)
# Multi-stage build: compile le bundle, puis le sert avec Nginx
# ==========================================================

# ── Stage 1 : Build du bundle React ────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# La variable d'environnement pour pointer l'API (injectée au build)
ARG VITE_API_BASE_URL=/api
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

RUN npm run build
# Le résultat est dans /app/dist

# ── Stage 2 : Serveur Nginx statique léger ──────────────────
FROM nginx:alpine AS runner

# Copier le bundle compilé
COPY --from=builder /app/dist /usr/share/nginx/html

# Configuration Nginx pour React Router (SPA)
# Toutes les routes inconnues renvoient vers index.html
# Copy Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
