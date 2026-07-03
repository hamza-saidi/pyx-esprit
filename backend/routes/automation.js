const express = require('express');
const router = express.Router();
const { requireAuthAndTenant } = require('../middleware/auth');
const automationController = require('../controllers/automationController');

router.get('/', requireAuthAndTenant, automationController.listAutomations);
router.post('/', requireAuthAndTenant, automationController.createCustomAutomation);
router.put('/:id/toggle', requireAuthAndTenant, automationController.toggleAutomation);
router.put('/:id', requireAuthAndTenant, automationController.updateAutomation);
router.delete('/:id', requireAuthAndTenant, automationController.deleteAutomation);

// Birthday trigger (was /api/birthdays)
router.get('/birthday/today', requireAuthAndTenant, automationController.listBirthdaysToday);
router.post('/birthday/today/send', requireAuthAndTenant, automationController.sendBirthdaysToday);

module.exports = router;
