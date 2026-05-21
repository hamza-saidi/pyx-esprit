/**
 * Fusionne plusieurs tags en un tag cible.
 * Par défaut, lance un dry-run (aucune écriture). Passez DRY_RUN=false pour appliquer.
 */
const axios = require('axios');

// --- Configuration ---------------------------------------------------------
const BASE_URL = process.env.API_BASE_URL || 'http://localhost:50000/api';
const LOGIN_EMAIL = process.env.API_LOGIN_EMAIL || 'hamza@pylon-dw.com';
const LOGIN_PASSWORD = process.env.API_LOGIN_PASSWORD || 'hamza123';

// Tags source -> tag cible
const SOURCE_TAG_NAMES = [
  'GOLFEURS FRANCAIS',
  'Golfeur France',
  'golfeur francophone',
];
const TARGET_TAG_NAME = 'Golfeurs Francais';

// Options
const PAGE_SIZE = Number(process.env.PAGE_SIZE || 200);
const DRY_RUN = (process.env.DRY_RUN || 'true').toLowerCase() === 'true';
const DELETE_OLD_TAGS = (process.env.DELETE_OLD_TAGS || 'false').toLowerCase() === 'true';

// ---------------------------------------------------------------------------
const normalize = (s) => (s || '').toString().trim().toLowerCase();

async function login() {
  const { data } = await axios.post(`${BASE_URL}/auth/login`, {
    email: LOGIN_EMAIL,
    mot_de_passe: LOGIN_PASSWORD,
  });
  return data.token;
}

function apiClient(token) {
  return axios.create({
    baseURL: BASE_URL,
    headers: { Authorization: `Bearer ${token}` },
  });
}

async function fetchAllTags(api) {
  const { data } = await api.get('/tags');
  return data;
}

async function ensureTargetTag(api, tags) {
  const existing = tags.find((t) => normalize(t.nom) === normalize(TARGET_TAG_NAME));
  if (existing) return existing;
  if (DRY_RUN) {
    console.log(`[DRY] Création du tag "${TARGET_TAG_NAME}"`);
    return { id: '__dry__', nom: TARGET_TAG_NAME };
  }
  const { data } = await api.post('/tags', { nom: TARGET_TAG_NAME });
  console.log(`Tag créé: ${data.id} - ${data.nom}`);
  return data;
}

async function fetchContactsByTagIds(api, tagIds) {
  let page = 1;
  const contacts = [];
  while (true) {
    const { data } = await api.get('/contacts', {
      params: { page, limit: PAGE_SIZE, tagIds: tagIds.join(',') },
    });
    const items = Array.isArray(data) ? data : data.data || [];
    if (!items.length) break;
    contacts.push(...items);
    const total = Array.isArray(data) ? items.length : data.total;
    const limit = Array.isArray(data) ? PAGE_SIZE : (data.limit || PAGE_SIZE);
    const totalPages = Math.ceil((total || items.length) / limit);
    if (page >= totalPages) break;
    page += 1;
  }
  return contacts;
}

async function addTagToContact(api, contactId, tagId) {
  if (DRY_RUN) return console.log(`[DRY] + tag ${tagId} -> contact ${contactId}`);
  await api.post(`/contacts/${contactId}/tags`, { tagId });
}

async function removeTagFromContact(api, contactId, tagId) {
  if (DRY_RUN) return console.log(`[DRY] - tag ${tagId} -> contact ${contactId}`);
  await api.delete(`/contacts/${contactId}/tags`, { data: { tagId } });
}

async function deleteTag(api, tagId, tagName) {
  if (DRY_RUN) return console.log(`[DRY] delete tag ${tagName} (${tagId})`);
  await api.delete(`/tags/${tagId}`);
  console.log(`Tag supprimé: ${tagName}`);
}

async function main() {
  console.log(`Base: ${BASE_URL} | Dry-run: ${DRY_RUN} | Delete old: ${DELETE_OLD_TAGS}`);
  const token = await login();
  const api = apiClient(token);

  const allTags = await fetchAllTags(api);
  const sourceTags = allTags.filter((t) =>
    SOURCE_TAG_NAMES.map(normalize).includes(normalize(t.nom))
  );
  if (!sourceTags.length) {
    console.log('Aucun des tags source n’existe, rien à faire.');
    return;
  }
  const targetTag = await ensureTargetTag(api, allTags);
  const sourceIds = sourceTags.map((t) => t.id);
  console.log(`Fusion: ${sourceTags.map((t) => t.nom).join(', ')} -> ${targetTag.nom}`);

  // Contacts concernés
  const contacts = await fetchContactsByTagIds(api, sourceIds);
  console.log(`Contacts touchés: ${contacts.length}`);

  for (const c of contacts) {
    const tagIds = (c.tags || []).map((t) => t.id);
    if (!tagIds.includes(targetTag.id)) {
      await addTagToContact(api, c.id, targetTag.id);
    }
    for (const sid of sourceIds) {
      if (sid !== targetTag.id && tagIds.includes(sid)) {
        await removeTagFromContact(api, c.id, sid);
      }
    }
  }

  if (DELETE_OLD_TAGS) {
    for (const t of sourceTags) {
      if (t.id === targetTag.id) continue;
      try {
        await deleteTag(api, t.id, t.nom);
      } catch (e) {
        console.warn(`Impossible de supprimer ${t.nom}:`, e?.response?.data || e.message);
      }
    }
  }
  console.log('Terminé.');
}

main().catch((e) => {
  console.error('Erreur:', e?.response?.data || e.message || e);
  if (e?.response) {
    console.error('Status:', e.response.status);
    console.error('Data:', e.response.data);
  } else if (e?.request) {
    console.error('Aucune réponse reçue (request)'); 
  } else {
    console.error('Stack:', e?.stack);
  }
  console.error('Raw error:', e);
  process.exit(1);
});

