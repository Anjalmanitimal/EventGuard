const express = require('express');

const requireAuth = require('../middleware/auth');
const { register, verifyEmail, login, refresh, logout, me } = require('../controllers/auth.controller');

const router = express.Router();

router.post('/register', register);
router.post('/verify-email', verifyEmail);
router.post('/login', login);
router.post('/refresh', refresh);
router.post('/logout', logout);
router.get('/me', requireAuth, me);

module.exports = router;
