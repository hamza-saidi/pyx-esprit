const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/refresh', authController.refresh);
router.post('/logout', authController.logout);
router.post('/verify-mfa', authController.verifyMfa);

// TOTP MFA setup (app-based) — requires a logged-in session, unlike
// /verify-mfa above which happens mid-login before a full session exists.
router.post('/mfa/totp/setup', authenticateToken, authController.mfaTotpSetup);
router.post('/mfa/totp/verify-setup', authenticateToken, authController.mfaTotpVerifySetup);
router.post('/mfa/totp/disable', authenticateToken, authController.mfaTotpDisable);

module.exports = router;
