const express = require('express');
const router = express.Router();
const statisticsController = require('../controllers/statisticsController');
const { requireAuthAndTenant } = require('../middleware/auth');

// Obtenir les stats d'une campagne
router.get('/campaign/:campaignId', requireAuthAndTenant, statisticsController.getByCampaign);

// Tableau de bord principal
router.get('/dashboard', requireAuthAndTenant, statisticsController.getDashboard);

// Comparaison entre périodes
router.get('/comparaison', requireAuthAndTenant, statisticsController.getComparaisonPeriodes);

// Statistiques par segment
router.get('/segment/:segmentId', requireAuthAndTenant, statisticsController.getStatsBySegment);

// Statistiques des événements
router.get('/events', requireAuthAndTenant, statisticsController.getEventStats);

module.exports = router;
