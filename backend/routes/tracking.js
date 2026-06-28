const express = require('express');
const router = express.Router();
const trackingController = require('../controllers/trackingController');

// Tracking des ouvertures d'emails
router.get('/open/:token', trackingController.trackOpen);

// Tracking des clics sur les liens
router.get('/click/:token', trackingController.trackClick);

module.exports = router;
