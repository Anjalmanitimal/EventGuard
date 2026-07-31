const crypto = require('crypto');

const RefreshToken = require('../models/RefreshToken');

const REFRESH_TOKEN_TTL_DAYS = 15;

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

async function issueRefreshToken(userId, userAgent = '') {
  const token = crypto.randomBytes(40).toString('hex');
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
  await RefreshToken.create({ userId, tokenHash: hashToken(token), expiresAt, userAgent });
  return token;
}

// Rotates the refresh token on each use. A token presented again after
// being rotated means it was replayed (stolen) - revoke the whole session.
async function rotateRefreshToken(rawToken, userAgent = '') {
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

  if (existing.userAgent && userAgent && existing.userAgent !== userAgent) {
    await RefreshToken.updateMany(
      { userId: existing.userId, revokedAt: null },
      { revokedAt: new Date() }
    );
    return { deviceMismatch: true };
  }

  existing.revokedAt = new Date();
  await existing.save();

  const token = await issueRefreshToken(existing.userId, userAgent);
  return { userId: existing.userId, token };
}

async function revokeRefreshToken(rawToken) {
  await RefreshToken.updateOne({ tokenHash: hashToken(rawToken) }, { revokedAt: new Date() });
}

// Used when a password changes - every other session (device/browser) should
// be forced to log in again, since the old credential could have been the
// one compromised.
async function revokeAllRefreshTokensForUser(userId) {
  await RefreshToken.updateMany({ userId, revokedAt: null }, { revokedAt: new Date() });
}

module.exports = {
  issueRefreshToken,
  rotateRefreshToken,
  revokeRefreshToken,
  revokeAllRefreshTokensForUser,
  REFRESH_TOKEN_TTL_DAYS,
};
