const express = require('express');
const router = express.Router();
const statisticsController = require('../controllers/statisticsController');
const { authenticateToken } = require('../middleware/auth');

// Obtenir les stats d'une campagne
router.get('/campaign/:campaignId', authenticateToken, statisticsController.getByCampaign);

// Tableau de bord principal
router.get('/dashboard', authenticateToken, statisticsController.getDashboard);

// Comparaison entre périodes
router.get('/comparaison', authenticateToken, statisticsController.getComparaisonPeriodes);

// Statistiques par segment
router.get('/segment/:segmentId', authenticateToken, statisticsController.getStatsBySegment);

// Statistiques des événements
router.get('/events', authenticateToken, statisticsController.getEventStats);

module.exports = router; 