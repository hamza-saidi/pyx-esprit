# Architecture Multi-Tenant — Golf Huub

## Problème résolu

Un SaaS hébergeant plusieurs clubs de golf sur une base de données partagée doit garantir qu'un utilisateur du Club A ne peut jamais voir ni modifier les données du Club B — même en cas d'erreur de développement (mauvais ID dans l'URL, oubli de filtre dans une requête). On appelle ce principe **isolation fail-secure** : le système se ferme par défaut plutôt que de laisser fuiter des données.

---

## Mécanisme — deux couches complémentaires

### Couche 1 : Repository explicite (lisible, auditable)

Chaque repository (`backend/repositories/*.js`) exige `clubId` comme paramètre obligatoire sur toutes ses méthodes :

```js
// repositories/contactRepository.js
async function findById(id, { clubId }) {
  if (!clubId) throw new Error('clubId is required');
  return Contact.findOne({ where: { id, club_id: clubId } });
}
```

Le jury ou un développeur qui lit ce code voit **explicitement** que chaque accès est scopé à un club. C'est la couche lisible et auditable.

### Couche 2 : Hooks Sequelize globaux (filet de sécurité, fail-secure)

Chaque modèle tenant-scoped reçoit des hooks Sequelize enregistrés au démarrage (`backend/models/hooks/tenantScopeHooks.js`) :

```
beforeFind / beforeCount → injecte club_id dans WHERE
beforeCreate / beforeBulkCreate → injecte club_id sur l'instance
beforeBulkUpdate / beforeBulkDestroy → injecte club_id dans WHERE
```

Ces hooks lisent le `clubId` depuis un **AsyncLocalStorage** (contexte ambient, sans paramètre explicite). Si aucun contexte n'est posé, ils **lèvent une exception** au lieu de laisser passer une requête non-scopée :

```
Error: TENANT_CONTEXT_MISSING: query on "Contact" executed with no tenant context.
```

**Pourquoi deux couches ?** Le repository est lisible mais repose sur la discipline du développeur (un oubli = fuite). Le hook est invisible mais robuste : même du code legacy qui appelle `Contact.findAll()` sans passer par un repository est automatiquement scopé. Les deux ensemble donnent un système doublement défendu.

---

## Flux d'une requête HTTP normale

```
HTTP Request
  └─ routes/*.js  →  [authenticateToken] + [tenantScope]
                          │
                     JWT vérifié
                     club_id extrait du payload
                          │
                     runWithTenant({ clubId, isSystem:false }, next)
                          │
                     AsyncLocalStorage.run() → stocke le contexte
                          │
                    Controller  →  Use-case  →  Repository
                                                    │
                                              Sequelize.findOne(...)
                                                    │
                                          beforeFind hook déclenché
                                          ↓
                                   WHERE ... AND club_id = 5
```

---

## Cas particuliers

### Process système (cron, queue BullMQ)

Les jobs de background n'ont pas de requête HTTP, donc pas de JWT. Ils utilisent `isSystem: true` comme bypass explicite et documenté :

```js
// cronService.js — boucle par club
for (const club of activeClubs) {
  await runWithTenant({ clubId: club.id, isSystem: false }, () =>
    automationService.processTasks()
  );
}
```

Pour BullMQ, le `clubId` est stocké dans le payload du job lors de l'enqueue, et re-établi dans le worker callback :

```js
// queueService.js — worker BullMQ
async (job) => {
  await runWithTenant({ clubId: job.data.clubId, isSystem: false }, () =>
    emailService.envoyerCampagne(job.data.campaignId)
  );
}
```

### Routes publiques (inscription, tracking pixel, désabonnement)

Ces routes n'ont pas de JWT. L'authorization est par la possession d'un token unique (`token_tracking`) — elles utilisent `isSystem: true` :

```js
exports.unsubscribe = (req, res) =>
  runWithTenant({ clubId: null, isSystem: true }, async () => {
    const envoi = await EnvoiEmail.findOne({ where: { token_tracking: token } });
    // ...
  });
```

---

## Schéma DB

Chaque table tenant-scoped possède une colonne `club_id INT NOT NULL DEFAULT 1` avec un index et une FK vers `club(id) ON DELETE RESTRICT`.

Les contraintes uniques qui étaient globales (ex: `abonnement.nom UNIQUE`) ont été converties en composites `(club_id, nom)` : deux clubs peuvent avoir un abonnement "VIP" sans collision.

---

## Tests

- `tests/tenantScopeHooks.test.js` — 8 tests unitaires sur les hooks (pas de DB nécessaire) : throw sans contexte, injection club_id, isolation entre requêtes concurrentes, wrap d'un `sequelize.literal(...)`.
- `tests/integration/tenantIsolation.test.js` — 5 tests HTTP end-to-end avec 2 clubs, 2 JWT : isolation de liste, IDOR sur lecture, IDOR sur suppression, rejet JWT sans club_id. Nécessite `npm run test:integration` avec une DB live.

---

## Discours de soutenance suggéré

> "L'isolation multi-tenant est garantie à deux niveaux. Le premier, visible dans le code, est le pattern Repository : chaque méthode d'accès à la base reçoit `clubId` comme paramètre obligatoire — si vous lisez n'importe quelle query, vous voyez explicitement le filtre club. Le second niveau est un filet de sécurité structurel : des hooks Sequelize globaux, alimentés par un AsyncLocalStorage, injectent automatiquement `club_id` dans toutes les requêtes ORM, même celles qui n'utilisent pas encore les repositories. Si un développeur oublie le filtre, le hook refuse la requête plutôt que de laisser fuiter des données. C'est ce qu'on appelle un design fail-secure."
