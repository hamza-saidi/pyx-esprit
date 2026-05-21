const express = require('express');
const router = express.Router();
const eventController = require('../controllers/eventController');
const { authenticateToken } = require('../middleware/auth');

// CRUD événements
router.post('/', authenticateToken, eventController.create);
router.get('/', authenticateToken, eventController.getAll);
router.get('/:id', authenticateToken, eventController.getOne);
router.put('/:id', authenticateToken, eventController.update);
router.delete('/:id', authenticateToken, eventController.delete);

// Inviter des contacts à un événement
router.post('/:id/invite', authenticateToken, eventController.invite);

// Mettre à jour le statut RSVP
router.patch('/rsvp/:rsvpId', authenticateToken, eventController.updateRsvp);

// Obtenir les statistiques d'un événement
router.get('/:id/statistiques', authenticateToken, eventController.getEventStats);

// Annuler un événement
router.post('/:id/annuler', authenticateToken, eventController.cancelEvent);

module.exports = router; 