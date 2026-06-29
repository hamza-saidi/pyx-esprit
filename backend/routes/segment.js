const express = require('express');
const router = express.Router();
const segmentController = require('../controllers/segmentController');
const { requireAuthAndTenant } = require('../middleware/auth');

// CRUD
router.post('/', requireAuthAndTenant, segmentController.create);
router.get('/', requireAuthAndTenant, segmentController.getAll);
router.get('/:id', requireAuthAndTenant, segmentController.getOne);
router.put('/:id', requireAuthAndTenant, segmentController.update);
router.delete('/:id', requireAuthAndTenant, segmentController.delete);

// Lister les contacts d'un segment
router.get('/:id/contacts', requireAuthAndTenant, segmentController.getContacts);

// Prévisualiser le nombre de contacts pour des critères soumis
router.post('/preview-count', requireAuthAndTenant, segmentController.previewCount);

// Détacher des campagnes d'un segment
router.post('/:id/detach-campaigns', requireAuthAndTenant, segmentController.detachCampaigns);

module.exports = router;
