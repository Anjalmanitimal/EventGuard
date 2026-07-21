const crypto = require('crypto');

const User = require('../models/User');
const { hashPassword, comparePassword } = require('../utils/password');
const { signAccessToken, signMfaChallengeToken, verifyMfaChallengeToken } = require('../utils/jwt');
const { isValidEmail, isValidPassword } = require('../utils/validators');
const {
  issueRefreshToken,
  rotateRefreshToken,
  revokeRefreshToken,
  REFRESH_TOKEN_TTL_DAYS,
} = require('../utils/refreshToken');
const { recordAudit } = require('../middleware/auditLogger');
const { generateSecret, getOtpauthUrl, verifyTotpCode } = require('../services/mfa.service');

const REFRESH_COOKIE_NAME = 'refreshToken';
const REFRESH_COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  path: '/api/auth',
  maxAge: REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
};

async function issueSession(res, user) {
  const accessToken = signAccessToken({ sub: user._id.toString(), role: user.role });
  const refreshToken = await issueRefreshToken(user._id);
  res.cookie(REFRESH_COOKIE_NAME, refreshToken, REFRESH_COOKIE_OPTS);
  return accessToken;
}

// staff/admin are never self-assignable - only granted by an admin later.
const SELF_SIGNUP_ROLES = ['attendee', 'organizer'];

async function register(req, res) {
  const { email, password, role } = req.body;

  if (!isValidEmail(email) || !isValidPassword(password)) {
    return res.status(400).json({ error: 'Valid email and password (min 8 characters) are required' });
  }

  if (role !== undefined && !SELF_SIGNUP_ROLES.includes(role)) {
    return res.status(400).json({ error: `role must be one of: ${SELF_SIGNUP_ROLES.join(', ')}` });
  }

  const normalizedEmail = email.toLowerCase();
  const existing = await User.findOne({ email: normalizedEmail });
  if (existing) {
    return res.status(409).json({ error: 'An account with this email already exists' });
  }

  const passwordHash = await hashPassword(password);
  const emailVerificationToken = crypto.randomBytes(32).toString('hex');

  const user = await User.create({
    email: normalizedEmail,
    passwordHash,
    emailVerificationToken,
    role: role || 'attendee',
  });

  // No email provider wired up yet - log the token instead of sending a real email.
  console.log(`[email-verify] token for ${user.email}: ${emailVerificationToken}`);

  await recordAudit(req, 'user.register', { userId: user._id, targetId: user._id });

  return res.status(201).json({
    id: user._id,
    email: user.email,
    role: user.role,
  });
}

async function verifyEmail(req, res) {
  const { token } = req.body;

  if (typeof token !== 'string' || token.length === 0) {
    return res.status(400).json({ error: 'Verification token is required' });
  }

  const user = await User.findOne({ emailVerificationToken: token }).select('+emailVerificationToken');
  if (!user) {
    return res.status(400).json({ error: 'Invalid or expired verification token' });
  }

  user.isEmailVerified = true;
  user.emailVerificationToken = undefined;
  await user.save();

  return res.json({ message: 'Email verified' });
}

const MAX_FAILED_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000;

async function login(req, res) {
  const { email, password } = req.body;

  if (!isValidEmail(email) || typeof password !== 'string') {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const user = await User.findOne({ email: email.toLowerCase() }).select(
    '+passwordHash +failedLoginAttempts +lockoutUntil'
  );
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  if (user.lockoutUntil && user.lockoutUntil > new Date()) {
    await recordAudit(req, 'user.login_blocked_locked', { userId: user._id, targetId: user._id });
    return res.status(423).json({
      error: 'Account temporarily locked due to repeated failed logins. Try again later.',
      lockedUntil: user.lockoutUntil,
    });
  }

  const valid = await comparePassword(password, user.passwordHash);
  if (!valid) {
    user.failedLoginAttempts += 1;

    if (user.failedLoginAttempts >= MAX_FAILED_LOGIN_ATTEMPTS) {
      user.lockoutUntil = new Date(Date.now() + LOCKOUT_DURATION_MS);
      user.failedLoginAttempts = 0;
      await user.save();
      await recordAudit(req, 'user.login_locked', { userId: user._id, targetId: user._id });
      return res.status(423).json({
        error: 'Account temporarily locked due to repeated failed logins. Try again later.',
        lockedUntil: user.lockoutUntil,
      });
    }

    await user.save();
    await recordAudit(req, 'user.login_failed', { userId: user._id, targetId: user._id });
    return res.status(401).json({
      error: 'Invalid credentials',
      remainingAttempts: MAX_FAILED_LOGIN_ATTEMPTS - user.failedLoginAttempts,
    });
  }

  if (!user.isEmailVerified) {
    return res.status(403).json({ error: 'Email not verified' });
  }

  user.failedLoginAttempts = 0;
  user.lockoutUntil = null;
  await user.save();

  if (user.mfaEnabled) {
    await recordAudit(req, 'user.login_mfa_challenge', { userId: user._id, targetId: user._id });
    const mfaToken = signMfaChallengeToken(user._id.toString());
    return res.json({ mfaRequired: true, mfaToken });
  }

  await recordAudit(req, 'user.login_success', { userId: user._id, targetId: user._id });

  const accessToken = await issueSession(res, user);

  return res.json({ mfaRequired: false, accessToken });
}

async function mfaVerifyLogin(req, res) {
  const { mfaToken, code } = req.body;

  if (typeof mfaToken !== 'string' || typeof code !== 'string') {
    return res.status(400).json({ error: 'mfaToken and code are required' });
  }

  let payload;
  try {
    payload = verifyMfaChallengeToken(mfaToken);
  } catch {
    return res.status(401).json({ error: 'Invalid or expired MFA challenge' });
  }

  const user = await User.findById(payload.sub).select('+mfaSecret');
  if (!user || !user.mfaEnabled || !user.mfaSecret) {
    return res.status(401).json({ error: 'Invalid or expired MFA challenge' });
  }

  if (!verifyTotpCode(code, user.mfaSecret)) {
    await recordAudit(req, 'user.login_mfa_failed', { userId: user._id, targetId: user._id });
    return res.status(401).json({ error: 'Invalid authentication code' });
  }

  await recordAudit(req, 'user.login_success', { userId: user._id, targetId: user._id });

  const accessToken = await issueSession(res, user);

  return res.json({ accessToken });
}

async function mfaSetup(req, res) {
  const user = await User.findById(req.user.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  if (user.mfaEnabled) {
    return res.status(400).json({ error: 'MFA is already enabled' });
  }

  const secret = generateSecret();
  user.mfaSecret = secret;
  await user.save();

  return res.json({ secret, otpauthUrl: getOtpauthUrl(user.email, secret) });
}

async function mfaEnable(req, res) {
  const { code } = req.body;

  const user = await User.findById(req.user.id).select('+mfaSecret');
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  if (!user.mfaSecret) {
    return res.status(400).json({ error: 'Call mfa/setup first to generate a secret' });
  }
  if (!verifyTotpCode(code, user.mfaSecret)) {
    return res.status(400).json({ error: 'Invalid authentication code' });
  }

  user.mfaEnabled = true;
  await user.save();
  await recordAudit(req, 'user.mfa_enabled', { targetId: user._id });

  return res.json({ message: 'MFA enabled' });
}

async function mfaDisable(req, res) {
  const { password } = req.body;

  const user = await User.findById(req.user.id).select('+passwordHash');
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  if (typeof password !== 'string' || !(await comparePassword(password, user.passwordHash))) {
    return res.status(401).json({ error: 'Invalid password' });
  }

  user.mfaEnabled = false;
  user.mfaSecret = null;
  await user.save();
  await recordAudit(req, 'user.mfa_disabled', { targetId: user._id });

  return res.json({ message: 'MFA disabled' });
}

async function refresh(req, res) {
  const rawToken = req.cookies?.[REFRESH_COOKIE_NAME];
  if (!rawToken) {
    return res.status(401).json({ error: 'Refresh token required' });
  }

  const rotated = await rotateRefreshToken(rawToken);
  if (!rotated) {
    res.clearCookie(REFRESH_COOKIE_NAME, { path: REFRESH_COOKIE_OPTS.path });
    return res.status(401).json({ error: 'Invalid or expired refresh token' });
  }

  const user = await User.findById(rotated.userId);
  if (!user) {
    res.clearCookie(REFRESH_COOKIE_NAME, { path: REFRESH_COOKIE_OPTS.path });
    return res.status(401).json({ error: 'Invalid or expired refresh token' });
  }

  res.cookie(REFRESH_COOKIE_NAME, rotated.token, REFRESH_COOKIE_OPTS);
  const accessToken = signAccessToken({ sub: user._id.toString(), role: user.role });

  return res.json({ accessToken });
}

async function logout(req, res) {
  const rawToken = req.cookies?.[REFRESH_COOKIE_NAME];
  if (rawToken) {
    await revokeRefreshToken(rawToken);
  }
  res.clearCookie(REFRESH_COOKIE_NAME, { path: REFRESH_COOKIE_OPTS.path });
  return res.status(204).send();
}

async function me(req, res) {
  const user = await User.findById(req.user.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  return res.json({
    id: user._id,
    email: user.email,
    role: user.role,
    isEmailVerified: user.isEmailVerified,
    mfaEnabled: user.mfaEnabled,
  });
}

module.exports = {
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
};
