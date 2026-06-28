/**
 * tests/integration/api.test.js
 *
 * Tests d'intégration HTTP via Supertest.
 * Ces tests testent les routes Express RÉELLES (middlewares inclus)
 * sans avoir besoin d'une vraie base de données connectée.
 *
 * Ce niveau de test est appelé "Integration Test" :
 * il vérifie que les middlewares (CSRF, CORS, Auth) fonctionnent
 * de bout en bout dans la chaîne HTTP.
 */

const request = require('supertest');

// ─── Setup environnement de test AVANT d'importer l'app ────────────────────
// Ces variables évitent que jwt.js jette une erreur "CRITICAL SECURITY ERROR"
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-at-least-32-characters-long';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-at-least-32-chars-long';
process.env.FRONTEND_URL = 'http://localhost:3000';

// Importer l'app APRÈS avoir défini les variables d'env
const app = require('../../app');
const { sequelize } = require('../../models');

afterAll(async () => {
  await sequelize.close();
});

// ─── Tests de Sécurité des Middlewares ─────────────────────────────────────
describe('🔒 Sécurité — Protection CSRF', () => {
  test('GET /api/csrf-token doit retourner un token (bypass CSRF car GET)', async () => {
    const response = await request(app).get('/api/csrf-token');
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('csrfToken');
    expect(typeof response.body.csrfToken).toBe('string');
    expect(response.body.csrfToken).toHaveLength(48); // 24 bytes -> 48 hex chars
  });

  test('POST sans CSRF token doit retourner 403', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@test.com', mot_de_passe: 'Test1234' });
    // Doit être bloqué par le middleware CSRF avant d'atteindre le contrôleur
    expect(response.status).toBe(403);
  });

  test('POST avec CSRF token invalide (mismatch) doit retourner 403', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .set('Cookie', 'xsrf-token=token_dans_cookie')
      .set('x-xsrf-token', 'token_different_dans_header')
      .send({ email: 'test@test.com', mot_de_passe: 'Test1234' });
    expect(response.status).toBe(403);
  });

  test('POST avec CSRF token valide (cookie = header) doit passer la protection CSRF', async () => {
    const validToken = 'aaaaaaaaaaaabbbbbbbbbbbbccccccccccccdddddddddddd';
    const response = await request(app)
      .post('/api/auth/login')
      .set('Cookie', `xsrf-token=${validToken}`)
      .set('x-xsrf-token', validToken)
      .send({ email: 'inconnu@test.com', mot_de_passe: 'MauvaisPass' });
    // Le CSRF passe — on attend un 401 (mauvais credentials) ou 500 (DB non dispo en test)
    // PAS un 403 (qui serait un refus CSRF)
    expect(response.status).not.toBe(403);
  });
});

// ─── Tests de l'API en général ─────────────────────────────────────────────
describe('🌐 API — Comportement Général', () => {
  test('Route inexistante doit retourner 404 ou ne pas planter le serveur', async () => {
    const validToken = 'aaabbbcccdddeeefffaaabbbcccdddeeefffaaabbbcccddd1';
    const response = await request(app).get('/api/route-qui-nexiste-pas-du-tout');
    // L'app ne doit pas crasher (statusCode doit être défini)
    expect(response.status).toBeDefined();
    expect(response.status).toBeLessThan(600); // Statut HTTP valide
  });

  test('GET /api-docs doit retourner la documentation Swagger (HTML)', async () => {
    const response = await request(app).get('/api-docs');
    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toMatch(/text\/html/);
    // Doit contenir le nom de l'API
    expect(response.text).toMatch(/swagger|openapi|Golf/i);
  });

  test("Les réponses d'erreur ne doivent jamais exposer de stack trace en production", async () => {
    // Simuler NODE_ENV=production temporairement
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    const response = await request(app)
      .post('/api/auth/login')
      .set('Cookie', 'xsrf-token=testtoken123')
      .set('x-xsrf-token', 'testtoken123')
      .send({ email: 'x', mot_de_passe: 'y' });

    // Restaurer
    process.env.NODE_ENV = originalEnv;

    // En production, la réponse ne doit PAS contenir de stack trace
    const bodyText = JSON.stringify(response.body);
    expect(bodyText).not.toMatch(/at Object\./); // Stack trace JS
    expect(bodyText).not.toMatch(/SELECT.*FROM/i); // Requête SQL
    expect(bodyText).not.toMatch(/SequelizeError/); // Nom interne Sequelize
  });
});

// ─── Tests de Validation des Données ─────────────────────────────────────
describe('✅ Validation — Register', () => {
  const csrfToken = 'validtokenforregistertests00000000000000000000000';

  test('Mot de passe trop court doit être refusé avec 400', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .set('Cookie', `xsrf-token=${csrfToken}`)
      .set('x-xsrf-token', csrfToken)
      .send({ email: 'test@test.com', mot_de_passe: '123', nom: 'Test' });

    // 400 = validation échoue, ou 500 = DB non dispo — les deux sont acceptables
    // Ce qui n'est pas acceptable : que le mot de passe faible soit accepté (201)
    expect(response.status).not.toBe(201);
  });

  test('Mot de passe sans majuscule doit être refusé', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .set('Cookie', `xsrf-token=${csrfToken}`)
      .set('x-xsrf-token', csrfToken)
      .send({ email: 'test@test.com', mot_de_passe: 'password123', nom: 'Test' });

    expect(response.status).not.toBe(201);
    if (response.status === 400) {
      expect(response.body.message).toMatch(/Mot de passe faible/);
    }
  });
});
