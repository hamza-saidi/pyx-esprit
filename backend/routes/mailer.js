const express = require('express');
const router = express.Router();
const mailerController = require('../controllers/mailerController');

// These two routes are embedded as links in already-sent emails — never change or remove them.
router.post('/unsubscribe', mailerController.unsubscribe);
router.get('/unsubscribe/:token', mailerController.unsubscribe);

module.exports = router;
