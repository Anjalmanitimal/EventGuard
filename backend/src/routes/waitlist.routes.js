const express = require('express');

const requireAuth = require('../middleware/auth');
const { joinWaitlist, listMyWaitlist, leaveWaitlist } = require('../controllers/waitlist.controller');

const router = express.Router();

router.use(requireAuth);

router.post('/', joinWaitlist);
router.get('/mine', listMyWaitlist);
router.delete('/:id', leaveWaitlist);

module.exports = router;
