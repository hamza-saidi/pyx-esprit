'use strict';
const express = require('express');
const router = express.Router();
const templateController = require('../controllers/templateController');
const { requireAuthAndTenant } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { getPublicBaseUrl } = require('../utils/url');
const fileStorage = require('../utils/fileStorage');

// CRUD
router.post('/', requireAuthAndTenant, templateController.create);
router.get('/', requireAuthAndTenant, templateController.getAll);
router.get('/:id', requireAuthAndTenant, templateController.getOne);
router.put('/:id', requireAuthAndTenant, templateController.update);
router.delete('/:id', requireAuthAndTenant, templateController.delete);

// Suggestion (AI stub)
router.post('/suggest', requireAuthAndTenant, templateController.suggest);
router.post('/text-to-html', requireAuthAndTenant, templateController.textToHtml);

// ── Media library ────────────────────────────────────────────────────────────
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

// 10 MB — consistent with campagne and contact routes
const MEDIA_MAX_BYTES = parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024;

const IMAGE_RE = /^image\/(jpeg|jpg|png|webp|avif|tiff|bmp)/i;

// Buffered in memory — the storage adapter (fileStorage.js) decides whether
// bytes end up on S3/MinIO or on local disk, so multer must not write to
// disk itself.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MEDIA_MAX_BYTES },
  fileFilter: (_req, file, cb) => {
    const allowed = /^(image\/|application\/pdf|video\/)/i.test(file.mimetype);
    cb(null, allowed);
  },
});

// Local-mode saveFile() returns a root-relative URL (/uploads/xxx) — make it
// absolute so it also resolves correctly once embedded in a sent email.
// Cloud (S3/MinIO) URLs are already absolute and pass through untouched.
function toAbsoluteUrl(url, req) {
  return url.startsWith('/') ? `${getPublicBaseUrl(req)}${url}` : url;
}

// ── POST /media/upload  ──────────────────────────────────────────────────────
router.post('/media/upload', requireAuthAndTenant, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'Fichier manquant ou type non autorisé' });

  const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
  const ext = path.extname(req.file.originalname || '') || '';
  let finalFilename = `${unique}${ext}`;
  let finalBuffer = req.file.buffer;
  let finalMime = req.file.mimetype;
  let finalSize = req.file.size;
  let compressed = false;

  // ── Image optimisation (email-safe: max 640 px wide, JPEG 82 %) ──────────
  if (IMAGE_RE.test(req.file.mimetype)) {
    try {
      const sharp = require('sharp');
      const outBuffer = await sharp(req.file.buffer)
        .rotate() // honour EXIF orientation
        .resize({ width: 640, withoutEnlargement: true }) // keep aspect ratio
        .jpeg({ quality: 82, progressive: true })
        .toBuffer();

      finalFilename = `${unique}.jpg`;
      finalBuffer = outBuffer;
      finalMime = 'image/jpeg';
      finalSize = outBuffer.length;
      compressed = true;
    } catch (err) {
      // sharp not available or processing failed — store original as-is
    }
  }

  try {
    const fileUrl = await fileStorage.saveFile(finalFilename, finalBuffer, finalMime);
    res.json({
      url: toAbsoluteUrl(fileUrl, req),
      name: req.file.originalname,
      size: finalSize,
      mimeType: finalMime,
      compressed,
    });
  } catch (err) {
    res.status(500).json({ message: "Échec de l'enregistrement du fichier" });
  }
});

// ── GET /media/recent  ───────────────────────────────────────────────────────
router.get('/media/recent', requireAuthAndTenant, async (req, res) => {
  if (fileStorage.isCloud()) {
    const files = await fileStorage.listRecent(50);
    return res.json(files);
  }

  if (!fs.existsSync(uploadsDir)) return res.json([]);
  const files = fs
    .readdirSync(uploadsDir)
    .filter((name) => {
      try {
        return fs.statSync(path.join(uploadsDir, name)).isFile();
      } catch {
        return false;
      }
    })
    .map((name) => ({
      name,
      mtime: fs.statSync(path.join(uploadsDir, name)).mtime.getTime(),
      url: `${getPublicBaseUrl(req)}/api/templates/media/${name}`,
    }))
    .sort((a, b) => b.mtime - a.mtime)
    .slice(0, 50);
  res.json(files);
});

// ── DELETE /media/:name  ─────────────────────────────────────────────────────
router.delete('/media/:name', requireAuthAndTenant, async (req, res) => {
  if (!/^[A-Za-z0-9_.-]+$/.test(req.params.name)) {
    return res.status(400).json({ message: 'Nom de fichier invalide' });
  }

  const deleted = await fileStorage.deleteFile(req.params.name);
  if (!deleted) return res.status(404).json({ message: 'Fichier introuvable' });
  res.json({ message: 'Fichier supprimé' });
});

// ── GET /media/:name (public — used in emails) ───────────────────────────────
router.get('/media/:name', (req, res) => {
  if (!/^[A-Za-z0-9_.-]+$/.test(req.params.name)) {
    return res.status(400).send('Invalid file name');
  }
  const filePath = path.join(uploadsDir, req.params.name);
  if (!filePath.startsWith(uploadsDir + path.sep)) {
    return res.status(400).send('Invalid file name');
  }
  if (!fs.existsSync(filePath)) return res.status(404).send('Not found');
  res.sendFile(filePath);
});

// ── Saved Blocks (custom GrapesJS blocks stored per club) ────────────────────
const blocksDir = path.join(__dirname, '..', 'uploads', 'blocks');
if (!fs.existsSync(blocksDir)) fs.mkdirSync(blocksDir, { recursive: true });

const getBlocksFile = (clubId) => path.join(blocksDir, `club-${clubId || 'default'}.json`);
const readBlocks = (clubId) => {
  try {
    return JSON.parse(fs.readFileSync(getBlocksFile(clubId), 'utf8'));
  } catch {
    return [];
  }
};

router.get('/blocks', requireAuthAndTenant, (req, res) => {
  res.json(readBlocks(req.clubId));
});

router.post('/blocks', requireAuthAndTenant, (req, res) => {
  const { nom, html } = req.body;
  if (!nom || !html) return res.status(400).json({ message: 'nom et html requis' });
  const blocks = readBlocks(req.clubId);
  const block = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    nom,
    html,
    createdAt: new Date().toISOString(),
  };
  blocks.push(block);
  fs.writeFileSync(getBlocksFile(req.clubId), JSON.stringify(blocks));
  res.status(201).json(block);
});

router.delete('/blocks/:id', requireAuthAndTenant, (req, res) => {
  const blocks = readBlocks(req.clubId).filter((b) => b.id !== req.params.id);
  fs.writeFileSync(getBlocksFile(req.clubId), JSON.stringify(blocks));
  res.json({ message: 'Bloc supprimé' });
});

module.exports = router;
