const express = require('express');
const router = express.Router();
const abonnementController = require('../controllers/abonnementController');
const { requireAuthAndTenant } = require('../middleware/auth');

router.get('/', requireAuthAndTenant, abonnementController.getAll);
router.get('/:id', requireAuthAndTenant, abonnementController.getOne);
router.post('/', requireAuthAndTenant, abonnementController.create);
router.put('/:id', requireAuthAndTenant, abonnementController.update);
router.delete('/:id', requireAuthAndTenant, abonnementController.delete);

module.exports = router;
