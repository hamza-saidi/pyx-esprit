const express = require('express');
const router = express.Router();
const templateController = require('../controllers/templateController');
const { authenticateToken } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { getPublicBaseUrl } = require('../utils/url');

// CRUD
router.post('/', authenticateToken, templateController.create);
router.get('/', authenticateToken, templateController.getAll);
router.get('/:id', authenticateToken, templateController.getOne);
router.put('/:id', authenticateToken, templateController.update);
router.delete('/:id', authenticateToken, templateController.delete);

// Suggestion (AI stub)
router.post('/suggest', authenticateToken, templateController.suggest);
router.post('/text-to-html', authenticateToken, templateController.textToHtml);

// Media library: upload & list recent assets
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: uploadsDir,
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname || '') || '';
    cb(null, `${unique}${ext}`);
  },
});

const upload = multer({ storage });
router.post('/media/upload', authenticateToken, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'Fichier manquant' });
  const fileUrl = `${getPublicBaseUrl(req)}/api/templates/media/${req.file.filename}`;
  res.json({
    url: fileUrl,
    name: req.file.originalname,
    size: req.file.size,
    mimeType: req.file.mimetype,
  });
});

router.get('/media/recent', authenticateToken, (req, res) => {
  const dir = path.join(__dirname, '..', 'uploads');
  if (!fs.existsSync(dir)) return res.json([]);
  const files = fs
    .readdirSync(dir)
    .map((name) => ({
      name,
      mtime: fs.statSync(path.join(dir, name)).mtime.getTime(),
      url: `${getPublicBaseUrl(req)}/api/templates/media/${name}`,
    }))
    .sort((a, b) => b.mtime - a.mtime)
    .slice(0, 50);
  res.json(files);
});

// Public serve media so images render in emails and previews
router.get('/media/:name', (req, res) => {
  const filePath = path.join(__dirname, '..', 'uploads', req.params.name);
  if (!fs.existsSync(filePath)) return res.status(404).send('Not found');
  res.sendFile(filePath);
});

module.exports = router;
