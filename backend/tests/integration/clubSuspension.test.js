/**
 * tests/integration/clubSuspension.test.js
 *
 * Proves the bug this feature fixes: suspending/reactivating a club through
 * PATCH /api/superadmin/clubs/:id must take effect immediately for
 * already-issued JWTs, not just at next login. Needs a real MySQL
 * connection - skipped automatically if the DB is unreachable, same as
 * tenantIsolation.test.js.
 */

const request = require('supertest');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-at-least-32-characters-long';
process.env.FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

const app = require('../../app');
const db = require('../../models');
const { runWithTenant } = require('../../utils/tenantContext');

function signFor(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, club_id: user.club_id },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
}

const CSRF = 'clubsuspensiontesttoken000000000000000000000000000';
function withCsrf(req) {
  return req.set('Cookie', `xsrf-token=${CSRF}`).set('x-xsrf-token', CSRF);
}

let dbAvailable = false;
let club, user, globalAdmin, tokenUser, tokenGlobalAdmin;
const PASSWORD = 'TestPass123';

beforeAll(async () => {
  try {
    await db.sequelize.authenticate();
    dbAvailable = true;
  } catch (e) {
    dbAvailable = false;
    return;
  }

  club = await db.Club.create({ nom: 'Club Suspension Test', slug: `test-susp-${Date.now()}` });

  const hash = await bcrypt.hash(PASSWORD, 12);
  user = await runWithTenant({ clubId: club.id, isSystem: false }, () =>
    db.Utilisateur.create({
      nom: 'User Suspension Test',
      email: `susp-user-${Date.now()}@test.local`,
      mot_de_passe: hash,
      role: 'employee',
      club_id: club.id,
    })
  );

  globalAdmin = await runWithTenant({ clubId: null, isSystem: true }, () =>
    db.Utilisateur.create({
      nom: 'Global Admin Test',
      email: `susp-owner-${Date.now()}@test.local`,
      mot_de_passe: hash,
      role: 'global_admin',
      club_id: null,
    })
  );

  tokenUser = signFor(user);
  tokenGlobalAdmin = signFor(globalAdmin);
});

afterAll(async () => {
  if (dbAvailable) {
    await runWithTenant({ clubId: null, isSystem: true }, async () => {
      if (user) await db.Utilisateur.destroy({ where: { id: user.id } });
      if (globalAdmin) await db.Utilisateur.destroy({ where: { id: globalAdmin.id } });
    });
    if (club) await db.Club.destroy({ where: { id: club.id } });
  }
  await db.sequelize.close();
});

const itIfDb = (name, fn) => test(name, async () => (dbAvailable ? fn() : undefined));

describe('Club suspension enforcement (requires a live database)', () => {
  itIfDb('a user of an active club can access a tenant route normally', async () => {
    const res = await request(app).get('/api/contacts').set('Authorization', `Bearer ${tokenUser}`);
    expect(res.status).toBe(200);
  });

  itIfDb(
    'suspending a club immediately blocks its already-issued token, without waiting for expiry',
    async () => {
      const patchRes = await withCsrf(
        request(app)
          .patch(`/api/superadmin/clubs/${club.id}`)
          .set('Authorization', `Bearer ${tokenGlobalAdmin}`)
      ).send({ statut: 'suspendu' });
      expect(patchRes.status).toBe(200);

      // Same token, never re-issued - must now be rejected.
      const res = await request(app)
        .get('/api/contacts')
        .set('Authorization', `Bearer ${tokenUser}`);
      expect(res.status).toBe(403);
      expect(res.body.code).toBe('CLUB_SUSPENDED');
    }
  );

  itIfDb('a suspended club also cannot obtain a brand-new token via login', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: user.email, mot_de_passe: PASSWORD });
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('CLUB_SUSPENDED');
  });

  itIfDb('reactivating the club restores access for the same token', async () => {
    const patchRes = await withCsrf(
      request(app)
        .patch(`/api/superadmin/clubs/${club.id}`)
        .set('Authorization', `Bearer ${tokenGlobalAdmin}`)
    ).send({ statut: 'actif' });
    expect(patchRes.status).toBe(200);

    const res = await request(app).get('/api/contacts').set('Authorization', `Bearer ${tokenUser}`);
    expect(res.status).toBe(200);
  });
});
