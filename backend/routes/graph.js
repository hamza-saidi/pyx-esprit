const express = require('express');
const router = express.Router();
const graphController = require('../controllers/graphController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

// Admin-only: only 'admin' role can connect/disconnect Graph for the club.
const requireAdmin = [authenticateToken, authorizeRoles('admin', 'global_admin')];

// GET /api/auth/graph/status — check if club's Graph integration is active
router.get('/status', authenticateToken, graphController.getStatus);

// GET /api/auth/graph/connect?from_email=... — get consent URL to open in browser
router.get('/connect', ...requireAdmin, graphController.getConsentUrl);

// GET /api/auth/graph/callback — Microsoft redirects here after admin consent
// No JWT (browser redirect from Microsoft), secured via `state` parameter.
router.get('/callback', graphController.handleCallback);

// PATCH /api/auth/graph/from-email — update sender mailbox without re-consenting
router.patch('/from-email', ...requireAdmin, graphController.updateFromEmail);

// DELETE /api/auth/graph/disconnect — revoke Graph integration for this club
router.delete('/disconnect', ...requireAdmin, graphController.disconnect);

module.exports = router;
