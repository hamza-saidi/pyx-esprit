const fs = require('fs');
const { parse } = require('csv-parse/sync');
const { stringify } = require('csv-stringify/sync');
const XLSX = require('xlsx');

// Parse un fichier CSV en tableau d'objets (puis map)
async function parseCsv(filePath) {
  const content = fs.readFileSync(filePath);
  const rawData = parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });
  return mapDataToContacts(rawData);
}

// Parse un fichier Excel en tableau d'objets (puis map)
async function parseExcel(filePath) {
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return [];
  const worksheet = workbook.Sheets[sheetName];
  const rawData = XLSX.utils.sheet_to_json(worksheet);
  return mapDataToContacts(rawData);
}

// Détecte et parse (xlsx/xls/csv)
async function parseFile(filePath) {
  const ext = (filePath.split('.').pop() || '').toLowerCase();
  // Test header PK (ZIP)
  const buffer = fs.readFileSync(filePath);
  const isZip = buffer[0] === 0x50 && buffer[1] === 0x4b;
  if (ext === 'xlsx' || ext === 'xls' || isZip) {
    return parseExcel(filePath);
  }
  return parseCsv(filePath);
}

// Génère un CSV à partir d'un tableau d'objets
function generateCsv(data) {
  return stringify(data, {
    header: true,
  });
}

// Génère un fichier Excel à partir d'un tableau d'objets
function generateExcel(data) {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Contacts');
  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
}

// Normalise une clé d'en-tête: minuscules, sans accents, alphanum uniquement
function normalizeKey(key) {
  return (key || '')
    .toString()
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove accents
    .replace(/[^a-z0-9]/g, '');
}

// Map data to Contact model fields with flexible column mapping for your platform
function mapDataToContacts(rawData) {
  const emailMap = new Map(); // For duplicate elimination
  const processedContacts = [];

  // Flexible header -> field mapping using normalized keys
  const headerMap = {
    // prenom
    prenom: 'prenom',
    firstname: 'prenom',
    first: 'prenom',
    firstnamee: 'prenom',
    firstnam: 'prenom',
    // nom
    nom: 'nom',
    lastname: 'nom',
    last: 'nom',
    surname: 'nom',
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
  };

  // Check columns at first row and build a normalized header set for debugging
  if (rawData.length > 0) {
    const firstRow = rawData[0];
    const availableColumns = Object.keys(firstRow);
    const normalized = availableColumns.map((c) => normalizeKey(c));
    console.log('Available columns in file:', availableColumns);
    console.log('Normalized columns:', normalized);
    // Verify presence of an email-like column after normalization
    const hasEmail = normalized.some((k) => headerMap[k] === 'email');
    if (!hasEmail) {
      throw new Error(
        `Invalid file format. No email column detected. Found: ${availableColumns.join(', ')}`
      );
    }
  }

  rawData.forEach((row, index) => {
    // Build normalizedRow map: normalizedKey -> value
    const normalizedRow = {};
    Object.keys(row).forEach((key) => {
      const nk = normalizeKey(key);
      if (nk) normalizedRow[nk] = row[key];
    });
    // Find email using normalized mapping
    let email = '';
    for (const nk of Object.keys(normalizedRow)) {
      if (headerMap[nk] === 'email') {
        email = (normalizedRow[nk] || '').toString().toLowerCase().trim();
        if (email) break;
      }
    }

    // Skip if no email
    if (!email) {
      console.log(`Row ${index + 1}: Skipped - No email address found`);
      return;
    }

    // Check for duplicates
    if (emailMap.has(email)) {
      console.log(`Row ${index + 1}: Duplicate email ${email} - Skipped`);
      return;
    }

    emailMap.set(email, true);

    // Map data using the column mapping
    const contact = {
      prenom: '',
      nom: '',
      email: email,
      telephone: '',
      sexe: '',
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

      // Store category and distribution names for later processing
      _category_name: '',
      _distribution_name: '',

      // Store tags and segments for later processing
      _tags: [],
      _segments: [],
    };

    // Map each field using normalized headers
    for (const nk of Object.keys(normalizedRow)) {
      const dbCol = headerMap[nk];
      if (!dbCol) continue;
      const value = (normalizedRow[nk] || '').toString().trim();
      switch (dbCol) {
        case 'prenom':
          contact.prenom = value;
          break;
        case 'nom':
          contact.nom = value;
          break;
        case 'telephone':
          // Handle telephone field - prefer telephone over mobile if both exist
          if (!contact.telephone || contact.telephone === '') {
            contact.telephone = value;
          }
          break;
        case 'sexe':
          // Use the mapSex function to normalize sex values
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
          // Split tags by comma and store for later processing
          contact._tags = value
            .split(',')
            .map((tag) => tag.trim())
            .filter((tag) => tag);
          break;
        case 'segments':
          // Split segments by comma and store for later processing
          contact._segments = value
            .split(',')
            .map((seg) => seg.trim())
            .filter((seg) => seg);
          break;
      }
    }

    // Debug logging for first few rows
    if (index < 3) {
      console.log(`Row ${index + 1} mapping debug:`);
      console.log(`  - Raw row:`, row);
      console.log(`  - Mapped contact:`, {
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
    `Processed ${processedContacts.length} contacts from ${rawData.length} rows (${rawData.length - processedContacts.length} duplicates/skipped)`
  );
  return processedContacts;
}

// Map sex values to standardized format
function mapSex(sex) {
  if (!sex || sex === '') return '';

  const sexLower = sex.toString().toLowerCase().trim();

  // Map various sex values to standardized format
  if (sexLower === 'male' || sexLower === 'homme' || sexLower === 'm' || sexLower === 'h') {
    return 'Homme';
  }
  if (sexLower === 'female' || sexLower === 'femme' || sexLower === 'f') {
    return 'Femme';
  }
  if (sexLower === 'autre' || sexLower === 'other' || sexLower === 'o') {
    return 'Autre';
  }

  // If it doesn't match known values, return the original value
  return sex;
}

module.exports = { parseFile, parseCsv, parseExcel, generateCsv, generateExcel };
