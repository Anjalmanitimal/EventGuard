const express = require('express');

const requireAuth = require('../middleware/auth');
const { loginLimiter } = require('../middleware/rateLimit');
const {
  register,
  verifyEmail,
  login,
  mfaVerifyLogin,
  mfaSetup,
  mfaEnable,
  mfaDisable,
  refresh,
  logout,
  me,
} = require('../controllers/auth.controller');

const router = express.Router();

router.post('/register', register);
router.post('/verify-email', verifyEmail);
router.post('/login', loginLimiter, login);
router.post('/mfa/verify', loginLimiter, mfaVerifyLogin);
router.post('/mfa/setup', requireAuth, mfaSetup);
router.post('/mfa/enable', requireAuth, mfaEnable);
router.post('/mfa/disable', requireAuth, mfaDisable);
router.post('/refresh', refresh);
router.post('/logout', logout);
router.get('/me', requireAuth, me);

module.exports = router;
