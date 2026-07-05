const express = require('express');
const router = express.Router();
const campagneController = require('../controllers/campagneController');
const statisticsController = require('../controllers/statisticsController');
const mailerController = require('../controllers/mailerController');
const { requireAuthAndTenant } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const attachmentDir = path.join(__dirname, '..', 'uploads', 'campaign-attachments');
if (!fs.existsSync(attachmentDir)) {
  fs.mkdirSync(attachmentDir, { recursive: true });
}

const attachmentStorage = multer.diskStorage({
  destination: attachmentDir,
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname || '');
    cb(null, `${unique}${ext}`);
  },
});
const uploadAttachment = multer({ storage: attachmentStorage });

// Toutes les routes nécessitent une authentification
router.use(requireAuthAndTenant);

// Upload attachment
router.post(
  '/attachments',
  requireAuthAndTenant,
  uploadAttachment.single('file'),
  campagneController.uploadAttachment
);
router.get('/attachments/:id', requireAuthAndTenant, campagneController.downloadAttachment);

// Récupérer toutes les campagnes (avec pagination et filtres)
router.get('/', campagneController.getAll);

// Récupérer une campagne par ID
router.get('/:id', campagneController.getOne);

// Créer une nouvelle campagne
router.post('/', campagneController.create);

// Mettre à jour une campagne
router.put('/:id', campagneController.update);

// Supprimer une campagne (soft delete)
router.delete('/:id', campagneController.remove);

// Programmer l'envoi d'une campagne
router.post('/:id/programmer', campagneController.programmer);

// Annuler une campagne programmée
router.post('/:id/annuler', campagneController.annuler);

// Envoyer une campagne immédiatement
router.post('/:id/envoyer', campagneController.envoyer);

// Envoyer un email de test
router.post('/:id/test', campagneController.envoyerTest);

// Calculer le nombre de destinataires
router.post('/calculer-destinataires', campagneController.calculerDestinataires);

// Récupérer les statistiques d'une campagne
router.get('/:id/statistiques', campagneController.getStatistiques);

// Dupliquer une campagne
router.post('/:id/dupliquer', campagneController.dupliquer);

// Obtenir les performances par période
router.get('/:id/performances', campagneController.getPerformancesParPeriode);

// Obtenir les groupes de suivi d'une campagne envoyée (cliqueurs, ouvreurs, non-ouvreurs)
router.get('/:id/followup-groups', campagneController.getFollowupGroups);

// ── Statistics (was /api/statistics) ──────────────────────────────────────────
router.get('/stats/campaign/:campaignId', statisticsController.getByCampaign);
router.get('/stats/dashboard', statisticsController.getDashboard);
router.get('/stats/comparaison', statisticsController.getComparaisonPeriodes);
router.get('/stats/segment/:segmentId', statisticsController.getStatsBySegment);
router.get('/stats/events', statisticsController.getEventStats);

// ── Mailer send (was /api/mailer/send*) ───────────────────────────────────────
router.post('/send', uploadAttachment.array('attachments', 10), mailerController.send);
router.get('/recipients/count', mailerController.countRecipientsByTags);
router.post(
  '/send-by-tags',
  uploadAttachment.array('attachments', 10),
  mailerController.sendByTags
);

module.exports = router;
