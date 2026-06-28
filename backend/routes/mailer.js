const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const mailerController = require('../controllers/mailerController');
const multer = require('multer');
const path = require('path');

const upload = multer({ dest: path.join(__dirname, '..', 'uploads') });

// Send an email with HTML and optional attachments
router.post('/send', authenticateToken, upload.array('attachments', 10), mailerController.send);
router.get('/recipients/count', authenticateToken, mailerController.countRecipientsByTags);
router.post(
  '/send-by-tags',
  authenticateToken,
  upload.array('attachments', 10),
  mailerController.sendByTags
);
router.post('/unsubscribe', mailerController.unsubscribe);
router.get('/unsubscribe/:token', mailerController.unsubscribe);

module.exports = router;
