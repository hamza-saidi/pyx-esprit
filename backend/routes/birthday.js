const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const birthdayController = require('../controllers/birthdayController');

router.get('/today', authenticateToken, birthdayController.listToday);
router.post('/today/send', authenticateToken, birthdayController.sendToday);

module.exports = router;


