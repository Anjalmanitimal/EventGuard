const jwt = require('jsonwebtoken');

function signAccessToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
  });
}

// Short-lived token that proves "this caller just supplied the correct
// password for this account" without granting a session yet - the second
// factor (mfa/verify) is required before a real access token is issued.
function signMfaChallengeToken(userId) {
  return jwt.sign({ sub: userId, purpose: 'mfa' }, process.env.JWT_SECRET, { expiresIn: '5m' });
}

function verifyMfaChallengeToken(token) {
  const payload = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
  if (payload.purpose !== 'mfa') {
    throw new Error('Invalid token purpose');
  }
  return payload;
}

module.exports = { signAccessToken, signMfaChallengeToken, verifyMfaChallengeToken };
