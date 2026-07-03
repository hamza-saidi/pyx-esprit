'use strict';

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const aiController = require('../controllers/aiController');

router.post('/campaign-suggest', authenticateToken, aiController.campaignSuggest);

module.exports = router;
