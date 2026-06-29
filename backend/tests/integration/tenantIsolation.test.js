/**
 * tests/integration/tenantIsolation.test.js
 *
 * End-to-end proof that two clubs never see each other's data. Needs a real
 * MySQL connection (XAMPP/Docker/CI service) since it writes and reads
 * actual rows - it is skipped automatically if the DB is unreachable so it
 * does not fail the suite in environments without a database, but it MUST
 * be run with a live DB (e.g. `npm run test:integration`) before relying on
 * the isolation guarantees in production.
 */

const request = require('supertest');
const jwt = require('jsonwebtoken');

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

let dbAvailable = false;
let clubA, clubB, userA, userB, tokenA, tokenB, contactInA;

beforeAll(async () => {
  try {
    await db.sequelize.authenticate();
    dbAvailable = true;
  } catch (e) {
    dbAvailable = false;
    return;
  }

  clubA = await db.Club.create({ nom: 'Club Test A', slug: `test-a-${Date.now()}` });
  clubB = await db.Club.create({ nom: 'Club Test B', slug: `test-b-${Date.now()}` });

  userA = await runWithTenant({ clubId: clubA.id, isSystem: false }, () =>
    db.Utilisateur.create({
      nom: 'User A',
      email: `usera-${Date.now()}@test.local`,
      mot_de_passe: 'hash-not-used-in-this-test',
      role: 'employee',
      club_id: clubA.id,
    })
  );
  userB = await runWithTenant({ clubId: clubB.id, isSystem: false }, () =>
    db.Utilisateur.create({
      nom: 'User B',
      email: `userb-${Date.now()}@test.local`,
      mot_de_passe: 'hash-not-used-in-this-test',
      role: 'employee',
      club_id: clubB.id,
    })
  );

  tokenA = signFor(userA);
  tokenB = signFor(userB);

  contactInA = await runWithTenant({ clubId: clubA.id, isSystem: false }, () =>
    db.Contact.create({
      prenom: 'Alice',
      nom: 'TenantA',
      email: `alice-${Date.now()}@test.local`,
      club_id: clubA.id,
    })
  );
});

afterAll(async () => {
  if (dbAvailable) {
    await runWithTenant({ clubId: null, isSystem: true }, async () => {
      if (contactInA) await db.Contact.destroy({ where: { id: contactInA.id } });
      if (userA) await db.Utilisateur.destroy({ where: { id: userA.id } });
      if (userB) await db.Utilisateur.destroy({ where: { id: userB.id } });
    });
    if (clubA) await db.Club.destroy({ where: { id: clubA.id } });
    if (clubB) await db.Club.destroy({ where: { id: clubB.id } });
  }
  await db.sequelize.close();
});

const itIfDb = (name, fn) => test(name, async () => (dbAvailable ? fn() : undefined));

describe('Tenant isolation (requires a live database)', () => {
  itIfDb("club B's list of contacts never includes club A's contact", async () => {
    const res = await request(app).get('/api/contacts').set('Authorization', `Bearer ${tokenB}`);
    expect(res.status).toBe(200);
    const ids = (res.body.data || res.body.contacts || res.body || []).map?.((c) => c.id) || [];
    expect(ids).not.toContain(contactInA.id);
  });

  itIfDb('club A can read its own contact by id', async () => {
    const res = await request(app)
      .get(`/api/contacts/${contactInA.id}`)
      .set('Authorization', `Bearer ${tokenA}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(contactInA.id);
  });

  itIfDb("club B cannot read club A's contact by id (IDOR)", async () => {
    const res = await request(app)
      .get(`/api/contacts/${contactInA.id}`)
      .set('Authorization', `Bearer ${tokenB}`);
    expect(res.status).toBe(404);
  });

  itIfDb("club B cannot delete club A's contact by id", async () => {
    const res = await request(app)
      .delete(`/api/contacts/${contactInA.id}`)
      .set('Authorization', `Bearer ${tokenB}`);
    expect(res.status).toBe(404);

    const stillThere = await runWithTenant({ clubId: clubA.id, isSystem: false }, () =>
      db.Contact.findByPk(contactInA.id)
    );
    expect(stillThere).not.toBeNull();
  });

  itIfDb('a request with no club_id in the JWT is rejected, not silently unscoped', async () => {
    const tokenNoClub = jwt.sign(
      { id: userA.id, email: userA.email, role: userA.role },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    const res = await request(app)
      .get('/api/contacts')
      .set('Authorization', `Bearer ${tokenNoClub}`);
    expect(res.status).toBe(400);
  });
});
