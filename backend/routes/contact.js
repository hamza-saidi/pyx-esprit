const express = require('express');
const router = express.Router();
const contactController = require('../controllers/contactController');
const { requireAuthAndTenant } = require('../middleware/auth');
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });

// Public registration endpoint (no auth)
router.post('/public', contactController.create);
// CRUD
router.post('/', requireAuthAndTenant, contactController.create);
router.get('/', requireAuthAndTenant, contactController.getAll);
router.get('/obsolete', requireAuthAndTenant, contactController.getObsoleteEmails);
router.get('/:id', requireAuthAndTenant, contactController.getOne);
router.put('/:id', requireAuthAndTenant, contactController.update);
router.delete('/:id', requireAuthAndTenant, contactController.delete);

// Désactiver
router.patch('/:id/disable', requireAuthAndTenant, contactController.disable);

// Tags
router.post('/:id/tags', requireAuthAndTenant, contactController.addTag);
router.delete('/:id/tags', requireAuthAndTenant, contactController.removeTag);

// Import/export files
router.post('/import', requireAuthAndTenant, upload.single('file'), contactController.importFile);
router.get('/export/csv', requireAuthAndTenant, contactController.exportCsv);
router.get('/export/excel', requireAuthAndTenant, contactController.exportExcel);
// Dashboard stats
router.get('/stats/summary', requireAuthAndTenant, contactController.getStats);
router.get('/export/template', requireAuthAndTenant, contactController.exportTemplate);

// Audience Health
router.get('/health/stats', requireAuthAndTenant, contactController.getHealthStats);
router.post('/health/bulk-action', requireAuthAndTenant, contactController.bulkHealthAction);

// Bulk maintenance
router.post('/auto-tags', requireAuthAndTenant, contactController.generateAutoTagsForAll);

// Recherche avancée, pagination, tri : GET /?nom=&email=&statut=&ville=&pays=&page=&limit=&sort=&order=

// Notes
router.post('/:id/notes', requireAuthAndTenant, contactController.addNote);
router.put('/:id/notes/:noteId', requireAuthAndTenant, contactController.updateNote);
router.delete('/:id/notes/:noteId', requireAuthAndTenant, contactController.deleteNote);

module.exports = router;
