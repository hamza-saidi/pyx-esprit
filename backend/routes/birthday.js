const express = require('express');
const router = express.Router();
const { requireAuthAndTenant } = require('../middleware/auth');
const birthdayController = require('../controllers/birthdayController');

router.get('/today', requireAuthAndTenant, birthdayController.listToday);
router.post('/today/send', requireAuthAndTenant, birthdayController.sendToday);

module.exports = router;
