const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const automationController = require('../controllers/automationController');

router.get('/', authenticateToken, automationController.listAutomations);
router.post('/', authenticateToken, automationController.createCustomAutomation);
router.put('/:id/toggle', authenticateToken, automationController.toggleAutomation);
router.put('/:id', authenticateToken, automationController.updateAutomation);
router.delete('/:id', authenticateToken, automationController.deleteAutomation);

module.exports = router;
