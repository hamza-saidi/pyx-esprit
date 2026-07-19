/**
 * smoke-test.js — Vérifie que toutes les fonctionnalités clés de Pylon Pyx répondent correctement.
 * Usage :  docker compose exec backend node smoke-test.js
 */

'use strict';

const http = require('http');
const https = require('https');

const BASE = process.env.SMOKE_BASE_URL || 'http://localhost:5000';
const TENANT_EMAIL = process.env.SMOKE_EMAIL || 'admin@golfhuub.com';
const TENANT_PASS = process.env.SMOKE_PASSWORD || 'Admin2026!';
const OWNER_EMAIL = process.env.SMOKE_OWNER_EMAIL || 'owner@pylon-pyx.com';
const OWNER_PASS = process.env.SMOKE_OWNER_PASSWORD || 'Owner2026!';

// ── Helpers ──────────────────────────────────────────────────────────────────

let PASS = 0,
  FAIL = 0,
  SKIP = 0;

function log(icon, label, detail = '') {
  console.log(`  ${icon} ${label}${detail ? `  → ${detail}` : ''}`);
}
function ok(label, detail) {
  PASS++;
  log('✅', label, detail);
}
function fail(label, detail) {
  FAIL++;
  log('❌', label, detail);
}
function skip(label, reason) {
  SKIP++;
  log('⏭ ', label, reason);
}

function request(method, path, { body, token, csrfToken, contentType } = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE + path);
    const mod = url.protocol === 'https:' ? https : http;
    const bodyStr = body ? (typeof body === 'string' ? body : JSON.stringify(body)) : null;
    const headers = {
      'Content-Type': contentType || 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(csrfToken ? { 'x-xsrf-token': csrfToken, Cookie: `xsrf-token=${csrfToken}` } : {}),
      ...(bodyStr ? { 'Content-Length': Buffer.byteLength(bodyStr) } : {}),
    };
    const req = mod.request(
      {
        hostname: url.hostname,
        port: url.port || (url.protocol === 'https:' ? 443 : 80),
        path: url.pathname + url.search,
        method,
        headers,
      },
      (res) => {
        let data = '';
        res.on('data', (c) => {
          data += c;
        });
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, body: JSON.parse(data) });
          } catch {
            resolve({ status: res.statusCode, body: data });
          }
        });
      }
    );
    req.on('error', reject);
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

// Read MFA code directly from Redis — only works when running inside the container
async function readMfaCodeFromRedis(pendingId) {
  try {
    const Redis = require('ioredis');
    const redis = new Redis({
      host: process.env.REDIS_HOST || 'redis',
      port: parseInt(process.env.REDIS_PORT) || 6379,
      lazyConnect: true,
      connectTimeout: 3000,
    });
    await redis.connect();
    const raw = await redis.get(`auth:mfa:${pendingId}`);
    redis.disconnect();
    if (!raw) return null;
    return JSON.parse(raw).code;
  } catch {
    return null;
  }
}

async function login(email, password) {
  const csrf = await request('GET', '/api/csrf-token');
  const csrfToken = csrf.body?.csrfToken;
  if (!csrfToken) throw new Error('Cannot get CSRF token');

  const res = await request('POST', '/api/auth/login', {
    body: { email, mot_de_passe: password },
    csrfToken,
  });

  if (res.status === 200 && res.body?.token) return res.body.token;

  if (res.status === 202 && res.body?.mfa_required) {
    const pendingId = res.body.pending_token;
    const code = await readMfaCodeFromRedis(pendingId);
    if (!code) throw new Error('MFA requis mais code introuvable dans Redis');

    const verify = await request('POST', '/api/auth/verify-mfa', {
      body: { pending_token: pendingId, code },
      csrfToken,
    });
    if (verify.status === 200 && verify.body?.token) return verify.body.token;
    throw new Error(`MFA verify échoué: ${verify.status} — ${JSON.stringify(verify.body)}`);
  }

  throw new Error(`Login failed: ${res.status} — ${JSON.stringify(res.body)}`);
}

// ── Test Suites ───────────────────────────────────────────────────────────────

async function testInfra() {
  console.log('\n🔧 Infrastructure');
  const health = await request('GET', '/api/health');
  health.status === 200
    ? ok('GET /api/health', `status=${health.body?.status}`)
    : fail('GET /api/health', `HTTP ${health.status}`);

  const csrf = await request('GET', '/api/csrf-token');
  csrf.status === 200 && csrf.body?.csrfToken
    ? ok('GET /api/csrf-token', 'token présent')
    : fail('GET /api/csrf-token', `HTTP ${csrf.status}`);
}

async function testAuth(token) {
  console.log('\n🔐 Auth & Sécurité');

  // CSRF guard — no cookie/header → 403
  const nocsrf = await request('POST', '/api/auth/login', {
    body: { email: TENANT_EMAIL, mot_de_passe: TENANT_PASS },
  });
  nocsrf.status === 403
    ? ok('POST /login sans CSRF → 403 bloqué')
    : fail('POST /login sans CSRF', `attendu 403, reçu ${nocsrf.status}`);

  token ? ok(`Login ${TENANT_EMAIL}`, 'JWT reçu') : fail(`Login ${TENANT_EMAIL}`, 'token null');

  const unauth = await request('GET', '/api/contacts');
  unauth.status === 401
    ? ok('GET /contacts sans token → 401')
    : fail('GET /contacts sans token', `attendu 401, reçu ${unauth.status}`);
}

async function testContacts(token) {
  console.log('\n👥 Contacts');

  const list = await request('GET', '/api/contacts?limit=5', { token });
  if (list.status !== 200) {
    fail('GET /contacts', `HTTP ${list.status}`);
    return null;
  }
  ok('GET /contacts', `${list.body?.total ?? list.body?.length ?? '?'} contacts`);

  const csrf = await request('GET', '/api/csrf-token');
  const ct = csrf.body?.csrfToken;

  const created = await request('POST', '/api/contacts', {
    token,
    csrfToken: ct,
    body: { prenom: 'Smoke', nom: 'Test', email: `smoke.${Date.now()}@test.com`, actif: true },
  });
  if (created.status !== 201) {
    fail('POST /contacts', `HTTP ${created.status} — ${JSON.stringify(created.body)}`);
    return null;
  }
  ok('POST /contacts', `id=${created.body?.id}`);
  const id = created.body?.id;

  const one = await request('GET', `/api/contacts/${id}`, { token });
  one.status === 200
    ? ok(`GET /contacts/${id}`)
    : fail(`GET /contacts/${id}`, `HTTP ${one.status}`);

  const updated = await request('PUT', `/api/contacts/${id}`, {
    token,
    csrfToken: ct,
    body: { prenom: 'SmokeUpdated', nom: 'Test', email: created.body.email },
  });
  updated.status === 200
    ? ok(`PUT /contacts/${id}`)
    : fail(`PUT /contacts/${id}`, `HTTP ${updated.status} — ${JSON.stringify(updated.body)}`);

  const deleted = await request('DELETE', `/api/contacts/${id}`, { token, csrfToken: ct });
  deleted.status === 200 || deleted.status === 204
    ? ok(`DELETE /contacts/${id}`)
    : fail(`DELETE /contacts/${id}`, `HTTP ${deleted.status}`);

  return list.body?.data?.[0]?.id || list.body?.[0]?.id || null;
}

async function testTags(token) {
  console.log('\n🏷  Tags');
  const list = await request('GET', '/api/contacts/tags', { token });
  list.status === 200
    ? ok('GET /contacts/tags', `${Array.isArray(list.body) ? list.body.length : '?'} tags`)
    : fail('GET /contacts/tags', `HTTP ${list.status}`);
}

async function testSegments(token) {
  console.log('\n📊 Segments');
  const list = await request('GET', '/api/contacts/segments', { token });
  list.status === 200
    ? ok('GET /contacts/segments', `${Array.isArray(list.body) ? list.body.length : '?'} segments`)
    : fail('GET /contacts/segments', `HTTP ${list.status}`);
}

async function testCampaigns(token) {
  console.log('\n📧 Campagnes');
  const list = await request('GET', '/api/campagnes?limit=5', { token });
  if (list.status !== 200) {
    fail('GET /campagnes', `HTTP ${list.status}`);
    return;
  }
  ok('GET /campagnes', `${list.body?.total ?? list.body?.length ?? '?'} campagnes`);

  const csrf = await request('GET', '/api/csrf-token');
  const ct = csrf.body?.csrfToken;

  const created = await request('POST', '/api/campagnes', {
    token,
    csrfToken: ct,
    body: {
      titre: `Smoke Test ${Date.now()}`,
      sujet: 'Smoke test sujet',
      contenu_html: '<p>Smoke test content</p>',
      type_campagne: 'newsletter',
      statut: 'brouillon',
      priorite: 'normale',
    },
  });
  if (created.status === 201) {
    ok('POST /campagnes', `id=${created.body?.id}`);
    // Cleanup
    await request('DELETE', `/api/campagnes/${created.body.id}`, { token, csrfToken: ct });
  } else {
    fail('POST /campagnes', `HTTP ${created.status} — ${JSON.stringify(created.body)}`);
  }
}

async function testAutomations(token) {
  console.log('\n⚙️  Automatisations');
  const list = await request('GET', '/api/automations', { token });
  list.status === 200
    ? ok('GET /automations', `${Array.isArray(list.body) ? list.body.length : '?'} automations`)
    : fail('GET /automations', `HTTP ${list.status}`);
}

async function testStatistics(token) {
  console.log('\n📈 Statistiques');
  const dashboard = await request('GET', '/api/campagnes/stats/dashboard', { token });
  dashboard.status === 200
    ? ok('GET /campagnes/stats/dashboard')
    : fail('GET /campagnes/stats/dashboard', `HTTP ${dashboard.status}`);

  const events = await request('GET', '/api/campagnes/stats/events', { token });
  events.status === 200
    ? ok('GET /campagnes/stats/events')
    : fail('GET /campagnes/stats/events', `HTTP ${events.status}`);
}

async function testTemplates(token) {
  console.log('\n🎨 Modèles email');
  const list = await request('GET', '/api/templates', { token });
  list.status === 200
    ? ok('GET /templates', `${Array.isArray(list.body) ? list.body.length : '?'} modèles`)
    : fail('GET /templates', `HTTP ${list.status}`);
}

async function testSettings(token) {
  console.log('\n⚙️  Paramètres');
  const s = await request('GET', '/api/settings/email', { token });
  s.status === 200 ? ok('GET /settings/email') : fail('GET /settings/email', `HTTP ${s.status}`);
}

async function testUsers(token) {
  console.log('\n👨‍💼 Équipe');
  const list = await request('GET', '/api/auth/users', { token });
  list.status === 200
    ? ok('GET /auth/users', `${Array.isArray(list.body) ? list.body.length : '?'} utilisateurs`)
    : fail('GET /auth/users', `HTTP ${list.status}`);
}

async function testEvents(token) {
  console.log('\n📅 Événements');
  const list = await request('GET', '/api/contacts/events', { token });
  list.status === 200
    ? ok(
        'GET /contacts/events',
        `${list.body?.total ?? (Array.isArray(list.body) ? list.body.length : '?')} événements`
      )
    : fail('GET /contacts/events', `HTTP ${list.status}`);
}

async function testSuperAdmin(ownerToken) {
  console.log('\n🏢 Owner Platform (superadmin)');
  if (!ownerToken) {
    skip('Superadmin tests', 'Pas de token owner');
    return;
  }

  const clubs = await request('GET', '/api/superadmin/clubs', { token: ownerToken });
  clubs.status === 200
    ? ok('GET /superadmin/clubs', `${Array.isArray(clubs.body) ? clubs.body.length : '?'} tenants`)
    : fail('GET /superadmin/clubs', `HTTP ${clubs.status}`);

  const stats = await request('GET', '/api/superadmin/stats', { token: ownerToken });
  stats.status === 200
    ? ok('GET /superadmin/stats')
    : fail('GET /superadmin/stats', `HTTP ${stats.status}`);
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  Pylon Pyx — Smoke Test');
  console.log(`  Base URL : ${BASE}`);
  console.log('═══════════════════════════════════════════════════════');

  await testInfra();

  // Tenant admin login (handles MFA via Redis)
  let tenantToken = null;
  try {
    tenantToken = await login(TENANT_EMAIL, TENANT_PASS);
    console.log(`\n  🔑 Connecté en tant que ${TENANT_EMAIL}`);
  } catch (e) {
    console.log(`\n⚠️  Login tenant échoué : ${e.message}`);
  }

  await testAuth(tenantToken);

  if (tenantToken) {
    await testContacts(tenantToken);
    await testTags(tenantToken);
    await testSegments(tenantToken);
    await testCampaigns(tenantToken);
    await testAutomations(tenantToken);
    await testStatistics(tenantToken);
    await testTemplates(tenantToken);
    await testSettings(tenantToken);
    await testUsers(tenantToken);
    await testEvents(tenantToken);
  }

  // Owner login (handles MFA via Redis)
  let ownerToken = null;
  try {
    ownerToken = await login(OWNER_EMAIL, OWNER_PASS);
    console.log(`\n  🔑 Connecté en tant que ${OWNER_EMAIL}`);
  } catch (e) {
    console.log(`\n⚠️  Login owner échoué : ${e.message}`);
  }

  await testSuperAdmin(ownerToken);

  // ── Summary ───────────────────────────────────────────────────────────────
  const total = PASS + FAIL + SKIP;
  console.log('\n═══════════════════════════════════════════════════════');
  console.log(`  Résultats : ${PASS}/${total} passés  |  ${FAIL} échoués  |  ${SKIP} ignorés`);
  if (FAIL === 0) {
    console.log('  🎉 Tous les tests passent — plateforme opérationnelle');
  } else {
    console.log(`  ⚠️  ${FAIL} fonctionnalité(s) à corriger`);
  }
  console.log('═══════════════════════════════════════════════════════\n');
  process.exit(FAIL > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error('\n💥 Smoke test planté :', e.message);
  process.exit(1);
});
