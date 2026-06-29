const express = require('express');
const router = express.Router();
const tagController = require('../controllers/tagController');
const { requireAuthAndTenant } = require('../middleware/auth');

// CRUD
router.post('/', requireAuthAndTenant, tagController.create);
router.get('/', requireAuthAndTenant, tagController.getAll);
router.get('/cloud/metrics', requireAuthAndTenant, tagController.getCloudMetrics);
router.get('/:id', requireAuthAndTenant, tagController.getOne);
router.put('/:id', requireAuthAndTenant, tagController.update);
router.delete('/:id', requireAuthAndTenant, tagController.delete);

// Fusionner des tags
router.post('/merge', requireAuthAndTenant, tagController.merge);

// Lister les contacts d'un tag
router.get('/:id/contacts', requireAuthAndTenant, tagController.getContacts);

module.exports = router;
