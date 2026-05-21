const express = require('express');
const router = express.Router();
const campaignController = require('../controllers/campaignController');
const { authenticateToken } = require('../middleware/auth');

// CRUD
router.post('/', authenticateToken, campaignController.create);
router.get('/', authenticateToken, campaignController.getAll);
router.get('/:id', authenticateToken, campaignController.getOne);
router.put('/:id', authenticateToken, campaignController.update);
router.delete('/:id', authenticateToken, campaignController.delete);

// Envoi d'emails
router.post('/:id/send', authenticateToken, campaignController.send);

module.exports = router; 