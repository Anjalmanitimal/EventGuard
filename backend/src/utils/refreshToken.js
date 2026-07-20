const crypto = require('crypto');

const RefreshToken = require('../models/RefreshToken');

const REFRESH_TOKEN_TTL_DAYS = 15;

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

async function issueRefreshToken(userId) {
  const token = crypto.randomBytes(40).toString('hex');
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
  await RefreshToken.create({ userId, tokenHash: hashToken(token), expiresAt });
  return token;
}

// Rotates a refresh token: the presented token is consumed and a new one issued.
// If a token that was already rotated gets presented again, that's a sign of theft
// (someone replayed a stolen token) - revoke every active token for that user.
async function rotateRefreshToken(rawToken) {
  const tokenHash = hashToken(rawToken);
  const existing = await RefreshToken.findOne({ tokenHash });

  if (!existing || existing.expiresAt < new Date()) {
    return null;
  }

  if (existing.revokedAt) {
    await RefreshToken.updateMany(
      { userId: existing.userId, revokedAt: null },
      { revokedAt: new Date() }
    );
    return null;
  }

  existing.revokedAt = new Date();
  await existing.save();

  const token = await issueRefreshToken(existing.userId);
  return { userId: existing.userId, token };
}

async function revokeRefreshToken(rawToken) {
  await RefreshToken.updateOne({ tokenHash: hashToken(rawToken) }, { revokedAt: new Date() });
}

module.exports = {
  issueRefreshToken,
  rotateRefreshToken,
  revokeRefreshToken,
  REFRESH_TOKEN_TTL_DAYS,
};
