const { authenticator } = require('otplib');

function generateSecret() {
  return authenticator.generateSecret();
}

function getOtpauthUrl(email, secret) {
  return authenticator.keyuri(email, 'EventGuard', secret);
}

// Verifies a 6-digit time-based one-time code (RFC 6238) against the
// user's enrolled secret - the second factor required at login.
function verifyTotpCode(code, secret) {
  if (typeof code !== 'string') {
    return false;
  }
  try {
    return authenticator.verify({ token: code, secret });
  } catch {
    return false;
  }
}

module.exports = { generateSecret, getOtpauthUrl, verifyTotpCode };
