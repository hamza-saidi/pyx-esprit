const express = require('express');
const router = express.Router();
const contactController = require('../controllers/contactController');
const tagController = require('../controllers/tagController');
const segmentController = require('../controllers/segmentController');
const abonnementController = require('../controllers/abonnementController');
const eventController = require('../controllers/eventController');
const { requireAuthAndTenant } = require('../middleware/auth');
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });

// Public registration endpoint (no auth)
router.post('/public', contactController.create);
// CRUD
router.post('/', requireAuthAndTenant, contactController.create);
router.get('/', requireAuthAndTenant, contactController.getAll);
router.get('/obsolete', requireAuthAndTenant, contactController.getObsoleteEmails);

// ── Tags sub-resource (was /api/tags) ─────────────────────────────────────────
// Static paths before /:id to avoid param capture
router.get('/tags/cloud/metrics', requireAuthAndTenant, tagController.getCloudMetrics);
router.post('/tags/merge', requireAuthAndTenant, tagController.merge);
router.get('/tags/:id/contacts', requireAuthAndTenant, tagController.getContacts);
router.post('/tags', requireAuthAndTenant, tagController.create);
router.get('/tags', requireAuthAndTenant, tagController.getAll);
router.get('/tags/:id', requireAuthAndTenant, tagController.getOne);
router.put('/tags/:id', requireAuthAndTenant, tagController.update);
router.delete('/tags/:id', requireAuthAndTenant, tagController.delete);

// ── Segments sub-resource (was /api/segments) ─────────────────────────────────
router.post('/segments/preview-count', requireAuthAndTenant, segmentController.previewCount);
router.post('/segments/:id/detach-campaigns', requireAuthAndTenant, segmentController.detachCampaigns);
router.get('/segments/:id/contacts', requireAuthAndTenant, segmentController.getContacts);
router.post('/segments', requireAuthAndTenant, segmentController.create);
router.get('/segments', requireAuthAndTenant, segmentController.getAll);
router.get('/segments/:id', requireAuthAndTenant, segmentController.getOne);
router.put('/segments/:id', requireAuthAndTenant, segmentController.update);
router.delete('/segments/:id', requireAuthAndTenant, segmentController.delete);

// ── Memberships sub-resource (was /api/abonnements) ───────────────────────────
router.get('/memberships', requireAuthAndTenant, abonnementController.getAll);
router.get('/memberships/:id', requireAuthAndTenant, abonnementController.getOne);
router.post('/memberships', requireAuthAndTenant, abonnementController.create);
router.put('/memberships/:id', requireAuthAndTenant, abonnementController.update);
router.delete('/memberships/:id', requireAuthAndTenant, abonnementController.delete);

// ── Events sub-resource (was /api/events) ─────────────────────────────────────
router.patch('/events/rsvp/:rsvpId', requireAuthAndTenant, eventController.updateRsvp);
router.post('/events', requireAuthAndTenant, eventController.create);
router.get('/events', requireAuthAndTenant, eventController.getAll);
router.get('/events/:id', requireAuthAndTenant, eventController.getOne);
router.put('/events/:id', requireAuthAndTenant, eventController.update);
router.delete('/events/:id', requireAuthAndTenant, eventController.delete);
router.post('/events/:id/invite', requireAuthAndTenant, eventController.invite);
router.get('/events/:id/statistiques', requireAuthAndTenant, eventController.getEventStats);
router.post('/events/:id/annuler', requireAuthAndTenant, eventController.cancelEvent);

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

// Recherche avancée, pagination, tri : GET /?nom=&email=&statut=&ville=&pays=&page=&limit=&sort=&order=

// Notes
router.post('/:id/notes', requireAuthAndTenant, contactController.addNote);
router.put('/:id/notes/:noteId', requireAuthAndTenant, contactController.updateNote);
router.delete('/:id/notes/:noteId', requireAuthAndTenant, contactController.deleteNote);

module.exports = router;
