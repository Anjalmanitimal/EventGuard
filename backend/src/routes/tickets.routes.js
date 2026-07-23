const express = require('express');

const requireAuth = require('../middleware/auth');
const requireRole = require('../middleware/rbac');
const { scanLimiter } = require('../middleware/rateLimit');
const { listMyTickets, scan } = require('../controllers/tickets.controller');

const router = express.Router();

router.use(requireAuth);

router.get('/mine', listMyTickets);
router.post('/scan', scanLimiter, requireRole('admin'), scan);

module.exports = router;
