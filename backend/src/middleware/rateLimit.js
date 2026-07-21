const rateLimit = require('express-rate-limit');

// Network-level throttle, separate from and in addition to the per-account
// lockout in auth.controller.js - this limits brute-force attempts spread
// across many different accounts/emails from the same source. Deliberately
// well above the per-account lockout threshold so testing/using the lockout
// on one account doesn't also trip this for unrelated accounts on the same IP.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts from this network. Try again later.' },
});

const scanLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many scan attempts. Slow down.' },
});

module.exports = { loginLimiter, scanLimiter };
