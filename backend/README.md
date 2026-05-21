# Golf Huub Backend

## Setup

1. Copiez `.env.example` en `.env` et remplissez vos valeurs.
2. Installez les dépendances :
   ```
   npm install
   ```
3. Démarrez le serveur :
   ```
   npm run dev
   ```
4. Assurez-vous que MySQL (XAMPP) tourne et que la base est créée avec le script SQL fourni.

## Scripts

- `npm run dev` — Démarrage avec nodemon (développement)
- `npm start` — Démarrage normal

## Stack

- Node.js, Express.js
- Sequelize ORM (MySQL)
- JWT Auth, bcrypt
- Nodemailer (SMTP) 

## Envoi d'emails via Microsoft Graph

L'application peut envoyer des emails soit via SMTP (par défaut), soit via Microsoft Graph. Pour activer Microsoft Graph, configurez les variables d'environnement suivantes et définissez le fournisseur.

Variables d'environnement requises:

```
# Sélection du fournisseur d'envoi
MAIL_PROVIDER=graph # valeurs possibles: smtp | graph

# Identifiants application Azure AD (mode client credentials)
GRAPH_TENANT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
GRAPH_CLIENT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
GRAPH_CLIENT_SECRET=your_client_secret

# Expéditeur
GRAPH_SENDER_EMAIL=noreply@votre-domaine.com
# Optionnel: si vous envoyez au nom d'un utilisateur/boîte aux lettres spécifique
GRAPH_SENDER_USER_ID=utilisateur@votre-domaine.com # ou l'id Graph

# Enregistrement dans les éléments envoyés (true/false)
GRAPH_SAVE_TO_SENT_ITEMS=true

# Optionnel: fallback pour le champ From
SMTP_FROM=noreply@votre-domaine.com
```

Notes:
- Si `MAIL_PROVIDER` vaut `graph`, le backend utilise Microsoft Graph avec `client_credentials` pour envoyer.
- `GRAPH_SENDER_EMAIL` est utilisé comme adresse d'expédition dans le message.
- Si `GRAPH_SENDER_USER_ID` est défini, l'API utilisera `users/{id}/sendMail`. Sinon, `me/sendMail`.
- Conservez vos secrets dans `.env` (ne pas committer).
- Pour SMTP, laissez `MAIL_PROVIDER=smtp` et configurez `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`.

## Seed (Données factices)

Pour remplir la base de données avec des données de test :

```
cd backend
node seed.js
```

Cela va supprimer toutes les données existantes et recréer la base avec des données factices. 