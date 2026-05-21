const express = require('express');
const router = express.Router();
const abonnementController = require('../controllers/abonnementController');
const { authenticateToken } = require('../middleware/auth');

router.get('/', authenticateToken, abonnementController.getAll);
router.get('/:id', authenticateToken, abonnementController.getOne);
router.post('/', authenticateToken, abonnementController.create);
router.put('/:id', authenticateToken, abonnementController.update);
router.delete('/:id', authenticateToken, abonnementController.delete);

module.exports = router;
