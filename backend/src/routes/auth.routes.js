const express = require('express');

const requireAuth = require('../middleware/auth');
const {
  loginLimiter,
  registerLimiter,
  verifyEmailLimiter,
  mfaVerifyLimiter,
} = require('../middleware/rateLimit');
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
  updateProfile,
  changePassword,
  exportMyData,
} = require('../controllers/auth.controller');

const router = express.Router();

router.post('/register', registerLimiter, register);
router.post('/verify-email', verifyEmailLimiter, verifyEmail);
router.post('/login', loginLimiter, login);
router.post('/mfa/verify', mfaVerifyLimiter, mfaVerifyLogin);
router.post('/mfa/setup', requireAuth, mfaSetup);
router.post('/mfa/enable', requireAuth, mfaEnable);
router.post('/mfa/disable', requireAuth, mfaDisable);
router.post('/refresh', refresh);
router.post('/logout', logout);
router.get('/me', requireAuth, me);
router.patch('/me', requireAuth, updateProfile);
router.get('/me/export', requireAuth, exportMyData);
router.post('/change-password', requireAuth, loginLimiter, changePassword);

module.exports = router;
