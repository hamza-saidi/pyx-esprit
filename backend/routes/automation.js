const express = require('express');
const router = express.Router();
const { requireAuthAndTenant } = require('../middleware/auth');
const automationController = require('../controllers/automationController');

router.get('/', requireAuthAndTenant, automationController.listAutomations);
router.post('/', requireAuthAndTenant, automationController.createCustomAutomation);
router.put('/:id/toggle', requireAuthAndTenant, automationController.toggleAutomation);
router.put('/:id', requireAuthAndTenant, automationController.updateAutomation);
router.delete('/:id', requireAuthAndTenant, automationController.deleteAutomation);

module.exports = router;
