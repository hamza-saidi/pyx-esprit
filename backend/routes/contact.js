const express = require('express');
const router = express.Router();
const contactController = require('../controllers/contactController');
const { authenticateToken } = require('../middleware/auth');
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });

// Public registration endpoint (no auth)
router.post('/public', contactController.create);
// CRUD
router.post('/', authenticateToken, contactController.create);
router.get('/', authenticateToken, contactController.getAll);
router.get('/obsolete', authenticateToken, contactController.getObsoleteEmails);
router.get('/:id', authenticateToken, contactController.getOne);
router.put('/:id', authenticateToken, contactController.update);
router.delete('/:id', authenticateToken, contactController.delete);

// Désactiver
router.patch('/:id/disable', authenticateToken, contactController.disable);

// Tags
router.post('/:id/tags', authenticateToken, contactController.addTag);
router.delete('/:id/tags', authenticateToken, contactController.removeTag);

// Import/export files
router.post('/import', authenticateToken, upload.single('file'), contactController.importFile);
router.get('/export/csv', authenticateToken, contactController.exportCsv);
router.get('/export/excel', authenticateToken, contactController.exportExcel);
// Dashboard stats
router.get('/stats/summary', authenticateToken, contactController.getStats);
router.get('/export/template', authenticateToken, contactController.exportTemplate);

// Audience Health
router.get('/health/stats', authenticateToken, contactController.getHealthStats);
router.post('/health/bulk-action', authenticateToken, contactController.bulkHealthAction);

// Bulk maintenance
router.post('/auto-tags', authenticateToken, contactController.generateAutoTagsForAll);

// Recherche avancée, pagination, tri : GET /?nom=&email=&statut=&ville=&pays=&page=&limit=&sort=&order=

// Notes
router.post('/:id/notes', authenticateToken, contactController.addNote);
router.put('/:id/notes/:noteId', authenticateToken, contactController.updateNote);
router.delete('/:id/notes/:noteId', authenticateToken, contactController.deleteNote);

module.exports = router;
