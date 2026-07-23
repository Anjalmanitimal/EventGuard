const rateLimit = require('express-rate-limit');

function makeLimiter(windowMs, limit, message) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: message },
  });
}

// Network-level throttle, separate from and in addition to the per-account
// lockout in auth.controller.js - this limits brute-force attempts spread
// across many different accounts/emails from the same source. Deliberately
// well above the per-account lockout threshold so testing/using the lockout
// on one account doesn't also trip this for unrelated accounts on the same IP.
const loginLimiter = makeLimiter(15 * 60 * 1000, 50, 'Too many login attempts from this network. Try again later.');

const scanLimiter = makeLimiter(60 * 1000, 60, 'Too many scan attempts. Slow down.');

const registerLimiter = makeLimiter(15 * 60 * 1000, 20, 'Too many accounts created from this network. Try again later.');

const verifyEmailLimiter = makeLimiter(15 * 60 * 1000, 20, 'Too many verification attempts. Try again later.');

// TOTP codes are only 6 digits (1 in a million) - without a tight limit here,
// an attacker with a stolen mfaToken could brute-force the code directly.
const mfaVerifyLimiter = makeLimiter(15 * 60 * 1000, 10, 'Too many authentication code attempts. Try again later.');

module.exports = {
  loginLimiter,
  scanLimiter,
  registerLimiter,
  verifyEmailLimiter,
  mfaVerifyLimiter,
};
