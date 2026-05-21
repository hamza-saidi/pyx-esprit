const express = require('express');
const router = express.Router();
const segmentController = require('../controllers/segmentController');
const { authenticateToken } = require('../middleware/auth');

// CRUD
router.post('/', authenticateToken, segmentController.create);
router.get('/', authenticateToken, segmentController.getAll);
router.get('/:id', authenticateToken, segmentController.getOne);
router.put('/:id', authenticateToken, segmentController.update);
router.delete('/:id', authenticateToken, segmentController.delete);

// Lister les contacts d'un segment
router.get('/:id/contacts', authenticateToken, segmentController.getContacts);

// Prévisualiser le nombre de contacts pour des critères soumis
router.post('/preview-count', authenticateToken, segmentController.previewCount);

// Détacher des campagnes d'un segment
router.post('/:id/detach-campaigns', authenticateToken, segmentController.detachCampaigns);

module.exports = router; 