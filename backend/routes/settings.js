const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settingsController');
const { requireAuthAndTenant, authorizeRoles } = require('../middleware/auth');

router.use(requireAuthAndTenant);

router.get('/email', settingsController.getEmailSettings);
router.patch('/email', authorizeRoles('admin', 'global_admin'), settingsController.updateEmailSettings);
router.post('/email/test', authorizeRoles('admin', 'global_admin'), settingsController.testEmailSettings);

module.exports = router;
