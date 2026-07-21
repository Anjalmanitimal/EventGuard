const { authenticator } = require('otplib');

function generateSecret() {
  return authenticator.generateSecret();
}

function getOtpauthUrl(email, secret) {
  return authenticator.keyuri(email, 'EventGuard', secret);
}

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
