'use strict';

const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/memberController');
const { requireAuthAndTenant } = require('../middleware/auth');

router.get('/stats', requireAuthAndTenant, ctrl.getStats);
router.get('/', requireAuthAndTenant, ctrl.getMembers);
router.patch('/:id', requireAuthAndTenant, ctrl.updateMember);
router.post('/bulk-action', requireAuthAndTenant, ctrl.bulkAction);

module.exports = router;
