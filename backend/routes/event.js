const express = require('express');
const router = express.Router();
const eventController = require('../controllers/eventController');
const { requireAuthAndTenant } = require('../middleware/auth');

// CRUD événements
router.post('/', requireAuthAndTenant, eventController.create);
router.get('/', requireAuthAndTenant, eventController.getAll);
router.get('/:id', requireAuthAndTenant, eventController.getOne);
router.put('/:id', requireAuthAndTenant, eventController.update);
router.delete('/:id', requireAuthAndTenant, eventController.delete);

// Inviter des contacts à un événement
router.post('/:id/invite', requireAuthAndTenant, eventController.invite);

// Mettre à jour le statut RSVP
router.patch('/rsvp/:rsvpId', requireAuthAndTenant, eventController.updateRsvp);

// Obtenir les statistiques d'un événement
router.get('/:id/statistiques', requireAuthAndTenant, eventController.getEventStats);

// Annuler un événement
router.post('/:id/annuler', requireAuthAndTenant, eventController.cancelEvent);

module.exports = router;
