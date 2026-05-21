# Guide de Build pour la Production

## Configuration de l'API

L'application utilise une instance axios configurée dans `src/api/axios.js` qui :
- Utilise la variable d'environnement `VITE_API_BASE_URL` si définie
- Sinon, utilise `/api` par défaut (pour un reverse proxy)

### Pour le développement local
Pas besoin de configuration, le proxy Vite redirige `/api` vers `http://localhost:50000`

### Pour la production

1. **Option 1 : Reverse Proxy (Recommandé)**
   - Configurez votre serveur web (Nginx, Apache, etc.) pour rediriger `/api` vers votre backend
   - Pas besoin de définir `VITE_API_BASE_URL`
   - L'application utilisera automatiquement `/api`

2. **Option 2 : Variable d'environnement**
   - Créez un fichier `.env.production` dans le dossier `frontend/`
   - Ajoutez :
     ```
     VITE_API_BASE_URL=https://api.votredomaine.com/api
     ```
   - Remplacez par l'URL réelle de votre API

## Build

```bash
cd frontend
npm install
npm run build
```

Les fichiers de build seront dans le dossier `frontend/dist/`

## Déploiement

1. Copiez le contenu de `frontend/dist/` vers votre serveur web
2. Configurez votre serveur web pour servir les fichiers statiques
3. Configurez le reverse proxy pour `/api` si vous utilisez l'Option 1

## Vérification

Après le build, vérifiez que :
- ✅ Tous les boutons d'export/import fonctionnent
- ✅ Les appels API utilisent l'URL correcte (pas de localhost)
- ✅ L'authentification fonctionne
- ✅ Les pièces jointes sont uploadées et téléchargées correctement





