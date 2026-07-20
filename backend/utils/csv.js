const fs = require('fs');
const { parse } = require('csv-parse/sync');
const { stringify } = require('csv-stringify/sync');
const XLSX = require('xlsx');

// ── Normalized header → contact field mapping ──────────────────────────────
const HEADER_MAP = {
  // prenom
  prenom: 'prenom',
  firstname: 'prenom',
  first: 'prenom',
  firstnamee: 'prenom',
  firstnam: 'prenom',
  givenname: 'prenom',
  // nom
  nom: 'nom',
  lastname: 'nom',
  last: 'nom',
  surname: 'nom',
  familyname: 'nom',
  // email
  email: 'email',
  eemail: 'email',
  mail: 'email',
  courriel: 'email',
  // telephone
  telephone: 'telephone',
  phone: 'telephone',
  mobile: 'telephone',
  tel: 'telephone',
  gsm: 'telephone',
  portable: 'telephone',
  // sexe
  sexe: 'sexe',
  sex: 'sexe',
  gender: 'sexe',
  // statut
  statut: 'statut',
  status: 'statut',
  // ville
  ville: 'ville',
  city: 'ville',
  // entreprise
  entreprise: 'entreprise',
  company: 'entreprise',
  societe: 'entreprise',
  // categorie
  categorie: 'category',
  category: 'category',
  // distribution
  distribution: 'distribution',
  // tags
  tags: 'tags',
  tag: 'tags',
  // segments
  segments: 'segments',
  segment: 'segments',
  // type_adhesion
  typeadhesion: 'type_adhesion',
  typemembre: 'type_adhesion',
  membertype: 'type_adhesion',
  membership: 'type_adhesion',
  typeabonnement: 'type_adhesion',
  // numero_licence
  numerolicence: 'numero_licence',
  licence: 'numero_licence',
  licensenumber: 'numero_licence',
  licencenumber: 'numero_licence',
  nolicence: 'numero_licence',
  // date_naissance
  datenaissance: 'date_naissance',
  birthday: 'date_naissance',
  birthdate: 'date_naissance',
  naissance: 'date_naissance',
  datedenaissance: 'date_naissance',
  // remarques
  remarques: 'remarques',
  notes: 'remarques',
  note: 'remarques',
  comments: 'remarques',
  comment: 'remarques',
  observations: 'remarques',
};

// Colonnes qui signalent une ligne d'en-tête de contacts
const EMAIL_KEYS = new Set(['email', 'eemail', 'mail', 'courriel']);

// Normalise une clé d'en-tête: minuscules, sans accents, alphanum uniquement
function normalizeKey(key) {
  return (key || '')
    .toString()
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

// Retourne l'index de la première ligne contenant une colonne email, -1 sinon
function findHeaderRowIndex(rows) {
  for (let i = 0; i < Math.min(rows.length, 20); i++) {
    const row = rows[i];
    if (Array.isArray(row) && row.some((cell) => EMAIL_KEYS.has(normalizeKey(cell)))) {
      return i;
    }
  }
  return -1;
}

// Convertit un tableau de tableaux en tableau d'objets
function rowsToObjects(headerRow, dataRows) {
  return dataRows
    .filter((row) => row.some((cell) => cell !== null && cell !== undefined && cell !== ''))
    .map((row) => {
      const obj = {};
      headerRow.forEach((h, i) => {
        obj[h] = row[i] !== undefined && row[i] !== null ? String(row[i]) : '';
      });
      return obj;
    });
}

// ── Preview ────────────────────────────────────────────────────────────────
// Returns raw headers + 3 sample rows + auto-suggested mapping
async function previewFile(filePath) {
  const ext = (filePath.split('.').pop() || '').toLowerCase();
  const buffer = fs.readFileSync(filePath);
  const isZip = buffer[0] === 0x50 && buffer[1] === 0x4b;

  let allRows;
  if (ext === 'xlsx' || ext === 'xls' || isZip) {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) return { headers: [], samples: [], suggestedMapping: {} };
    const worksheet = workbook.Sheets[sheetName];
    allRows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
  } else {
    const content = fs.readFileSync(filePath);
    allRows = parse(content, { skip_empty_lines: true, trim: true, relax_column_count: true });
  }

  const headerIdx = findHeaderRowIndex(allRows);
  const realHeaderIdx = headerIdx === -1 ? 0 : headerIdx;
  const headers = (allRows[realHeaderIdx] || []).map((h) => String(h).trim()).filter(Boolean);

  const dataRows = allRows.slice(realHeaderIdx + 1, realHeaderIdx + 4);
  const samples = dataRows.map((row) => {
    const obj = {};
    headers.forEach((h, i) => {
      obj[h] = row[i] !== undefined && row[i] !== null ? String(row[i]) : '';
    });
    return obj;
  });

  const suggestedMapping = {};
  headers.forEach((h) => {
    suggestedMapping[h] = HEADER_MAP[normalizeKey(h)] || '';
  });

  return { headers, samples, suggestedMapping };
}

// ── Field applier ──────────────────────────────────────────────────────────
function applyField(contact, dbCol, value) {
  switch (dbCol) {
    case 'email':
      contact.email = value;
      break;
    case 'prenom':
      contact.prenom = value;
      break;
    case 'nom':
      contact.nom = value;
      break;
    case 'telephone':
      if (!contact.telephone) contact.telephone = value;
      break;
    case 'sexe':
      contact.sexe = mapSex(value);
      break;
    case 'statut':
      contact.statut = value;
      break;
    case 'ville':
      contact.ville = value;
      break;
    case 'entreprise':
      contact.entreprise = value;
      break;
    case 'category':
      contact._category_name = value;
      break;
    case 'distribution':
      contact._distribution_name = value;
      break;
    case 'tags':
      contact._tags = value
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
      break;
    case 'segments':
      contact._segments = value
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      break;
    case 'type_adhesion':
      contact.type_adhesion = value || null;
      break;
    case 'numero_licence':
      contact.numero_licence = value || null;
      break;
    case 'remarques':
      contact.remarques = value;
      break;
    case 'date_naissance': {
      if (value) {
        const d = new Date(value);
        if (!isNaN(d.getTime())) contact.date_naissance = d.toISOString().slice(0, 10);
      }
      break;
    }
  }
}

// ── Map raw rows to Contact objects ────────────────────────────────────────
// customMapping: { "Original Col": "contactField" } — when provided, overrides auto-detection
function mapDataToContacts(rawData, customMapping = null) {
  const emailMap = new Map();
  const processedContacts = [];

  if (rawData.length > 0) {
    if (customMapping) {
      const hasEmail = Object.values(customMapping).includes('email');
      if (!hasEmail) {
        throw new Error('Aucune colonne Email mappée. Assignez la colonne Email dans le mapping.');
      }
    } else {
      const availableColumns = Object.keys(rawData[0]);
      const normalized = availableColumns.map((c) => normalizeKey(c));
      console.log('Available columns in file:', availableColumns);
      console.log('Normalized columns:', normalized);
      const hasEmail = normalized.some((k) => HEADER_MAP[k] === 'email');
      if (!hasEmail) {
        throw new Error(
          `Invalid file format. No email column detected. Found: ${availableColumns.join(', ')}`
        );
      }
    }
  }

  rawData.forEach((row, index) => {
    const contact = {
      prenom: '',
      nom: '',
      email: '',
      telephone: '',
      sexe: null,
      handicap: null,
      home_club: '',
      date_naissance: null,
      nationalite: '',
      type_client: 'membre',
      ville: '',
      entreprise: '',
      remarques: '',
      adresse: '',
      code_postal: '',
      pays: '',
      statut: 'prospect',
      source: 'import_excel',
      date_inscription: null,
      consentement_rgpd: false,
      type_adhesion: null,
      numero_licence: null,
      _category_name: '',
      _distribution_name: '',
      _tags: [],
      _segments: [],
    };

    if (customMapping) {
      for (const [originalKey, dbCol] of Object.entries(customMapping)) {
        if (!dbCol) continue;
        const value =
          row[originalKey] !== undefined && row[originalKey] !== null
            ? String(row[originalKey]).trim()
            : '';
        applyField(contact, dbCol, value);
      }
    } else {
      const normalizedRow = {};
      Object.keys(row).forEach((key) => {
        const nk = normalizeKey(key);
        if (nk) normalizedRow[nk] = row[key];
      });
      for (const nk of Object.keys(normalizedRow)) {
        const dbCol = HEADER_MAP[nk];
        if (!dbCol) continue;
        const value = (normalizedRow[nk] || '').toString().trim();
        applyField(contact, dbCol, value);
      }
    }

    const email = contact.email.toLowerCase().trim();
    if (!email) {
      console.log(`Row ${index + 1}: Skipped - No email address found`);
      return;
    }
    if (emailMap.has(email)) {
      console.log(`Row ${index + 1}: Duplicate email ${email} - Skipped`);
      return;
    }
    emailMap.set(email, true);
    contact.email = email;

    if (index < 3) {
      console.log(`Row ${index + 1} mapping debug:`, {
        prenom: contact.prenom,
        nom: contact.nom,
        email: contact.email,
        telephone: contact.telephone,
        sexe: contact.sexe,
        category: contact._category_name,
        distribution: contact._distribution_name,
      });
    }

    processedContacts.push(contact);
  });

  console.log(
    `Processed ${processedContacts.length} contacts from ${rawData.length} rows ` +
      `(${rawData.length - processedContacts.length} duplicates/skipped)`
  );
  return processedContacts;
}

// ── CSV parser ─────────────────────────────────────────────────────────────
async function parseCsv(filePath, customMapping = null) {
  const content = fs.readFileSync(filePath);

  const allRows = parse(content, {
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true,
  });

  const headerIdx = findHeaderRowIndex(allRows);

  if (headerIdx === -1) {
    const rawData = parse(content, { columns: true, skip_empty_lines: true, trim: true });
    return mapDataToContacts(rawData, customMapping);
  }

  if (headerIdx === 0) {
    const rawData = parse(content, { columns: true, skip_empty_lines: true, trim: true });
    return mapDataToContacts(rawData, customMapping);
  }

  const rawData = rowsToObjects(allRows[headerIdx], allRows.slice(headerIdx + 1));
  return mapDataToContacts(rawData, customMapping);
}

// ── Excel parser ───────────────────────────────────────────────────────────
async function parseExcel(filePath, customMapping = null) {
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return [];
  const worksheet = workbook.Sheets[sheetName];

  const allRows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
  const headerIdx = findHeaderRowIndex(allRows);

  if (headerIdx === -1 || headerIdx === 0) {
    const rawData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
    return mapDataToContacts(rawData, customMapping);
  }

  const rawData = rowsToObjects(allRows[headerIdx], allRows.slice(headerIdx + 1));
  return mapDataToContacts(rawData, customMapping);
}

// ── Détecte et parse (xlsx/xls/csv) ───────────────────────────────────────
async function parseFile(filePath, customMapping = null) {
  const ext = (filePath.split('.').pop() || '').toLowerCase();
  const buffer = fs.readFileSync(filePath);
  const isZip = buffer[0] === 0x50 && buffer[1] === 0x4b;
  if (ext === 'xlsx' || ext === 'xls' || isZip) {
    return parseExcel(filePath, customMapping);
  }
  return parseCsv(filePath, customMapping);
}

// ── CSV/Excel generation ───────────────────────────────────────────────────
function generateCsv(data) {
  return stringify(data, { header: true });
}

function generateExcel(data) {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Contacts');
  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
}

// Map sex values to ENUM('Homme','Femme','Autre') or null
function mapSex(sex) {
  if (!sex || sex === '') return null;
  const s = sex.toString().toLowerCase().trim();
  if (s === 'male' || s === 'homme' || s === 'm' || s === 'h') return 'Homme';
  if (s === 'female' || s === 'femme' || s === 'f') return 'Femme';
  if (s === 'autre' || s === 'other' || s === 'o') return 'Autre';
  return null;
}

module.exports = { parseFile, parseCsv, parseExcel, previewFile, generateCsv, generateExcel };
