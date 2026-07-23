const crypto = require('crypto');

const User = require('../models/User');
const { hashPassword, comparePassword } = require('../utils/password');
const { signAccessToken, signMfaChallengeToken, verifyMfaChallengeToken } = require('../utils/jwt');
const { isValidEmail, getPasswordIssues, isNonEmptyString } = require('../utils/validators');
const {
  issueRefreshToken,
  rotateRefreshToken,
  revokeRefreshToken,
  revokeAllRefreshTokensForUser,
  REFRESH_TOKEN_TTL_DAYS,
} = require('../utils/refreshToken');
const { recordAudit } = require('../middleware/auditLogger');
const { generateSecret, getOtpauthUrl, verifyTotpCode } = require('../services/mfa.service');
const { sendVerificationEmail } = require('../services/email.service');
const Order = require('../models/Order');
const Ticket = require('../models/Ticket');
const Event = require('../models/Event');

const REFRESH_COOKIE_NAME = 'refreshToken';
const REFRESH_COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  path: '/api/auth',
  maxAge: REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
};

async function issueSession(req, res, user) {
  const accessToken = signAccessToken({ sub: user._id.toString(), role: user.role });
  const refreshToken = await issueRefreshToken(user._id, req.headers['user-agent'] || '');
  res.cookie(REFRESH_COOKIE_NAME, refreshToken, REFRESH_COOKIE_OPTS);
  return accessToken;
}

// admin is never self-assignable - only granted by an existing admin later.
const SELF_SIGNUP_ROLES = ['attendee', 'organizer'];

async function register(req, res) {
  const { email, password, role } = req.body;

  if (!isValidEmail(email)) {
    return res.status(400).json({ error: 'A valid email is required' });
  }

  const passwordIssues = getPasswordIssues(password);
  if (passwordIssues.length > 0) {
    return res.status(400).json({
      error: `Password must contain ${passwordIssues.join(', ')}`,
      passwordIssues,
    });
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
  // A 6-digit code, not a long hex string - easy to type by hand, matching
  // the same familiar pattern as the MFA code. Still cryptographically
  // random (crypto.randomInt, not Math.random), and rate-limited on the
  // verify endpoint, so brute-forcing the 1-in-a-million space isn't practical.
  const emailVerificationToken = crypto.randomInt(100000, 1000000).toString();

  const user = await User.create({
    email: normalizedEmail,
    passwordHash,
    passwordChangedAt: new Date(),
    emailVerificationToken,
    role: role || 'attendee',
  });

  try {
    await sendVerificationEmail(user.email, emailVerificationToken);
  } catch (err) {
    // Don't fail registration just because the email provider hiccuped -
    // the token still works if entered manually. Log it as a fallback.
    console.error('Failed to send verification email:', err.message);
    console.log(`[email-verify] token for ${user.email}: ${emailVerificationToken}`);
  }

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

  const accessToken = await issueSession(req, res, user);

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

  const accessToken = await issueSession(req, res, user);

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

  const rotated = await rotateRefreshToken(rawToken, req.headers['user-agent'] || '');

  if (rotated?.deviceMismatch) {
    res.clearCookie(REFRESH_COOKIE_NAME, { path: REFRESH_COOKIE_OPTS.path });
    await recordAudit(req, 'user.refresh_device_mismatch');
    return res.status(401).json({ error: 'Session invalidated - refresh used from an unexpected device' });
  }

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

// NIST 800-63B advises against forced periodic password rotation (it tends to
// produce weaker, incrementally-tweaked passwords). We surface an optional
// notice instead of hard-blocking login once a password is this old.
const PASSWORD_EXPIRY_DAYS = 90;

async function me(req, res) {
  const user = await User.findById(req.user.id).select('+passwordChangedAt');
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const passwordAgeDays = (Date.now() - user.passwordChangedAt.getTime()) / (24 * 60 * 60 * 1000);

  return res.json({
    id: user._id,
    email: user.email,
    name: user.name,
    role: user.role,
    isEmailVerified: user.isEmailVerified,
    mfaEnabled: user.mfaEnabled,
    passwordExpired: passwordAgeDays >= PASSWORD_EXPIRY_DAYS,
  });
}

async function exportMyData(req, res) {
  const user = await User.findById(req.user.id).select('+passwordChangedAt');
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const [orders, tickets] = await Promise.all([
    Order.find({ userId: user._id }).lean(),
    Ticket.find({ userId: user._id }).select('-qrToken').lean(),
  ]);

  const eventIds = [...new Set(orders.map((o) => o.eventId.toString()))];
  const events = await Event.find({ _id: { $in: eventIds } })
    .select('title venue date')
    .lean();

  await recordAudit(req, 'user.data_exported', { targetId: user._id });

  return res.json({
    exportedAt: new Date().toISOString(),
    profile: {
      id: user._id,
      email: user.email,
      name: user.name,
      role: user.role,
      isEmailVerified: user.isEmailVerified,
      mfaEnabled: user.mfaEnabled,
      accountCreatedAt: user.createdAt,
      passwordLastChangedAt: user.passwordChangedAt,
    },
    orders,
    tickets,
    events,
  });
}

// Explicit field whitelist - only `name` can ever be changed here. Even if a
// caller sends { name: 'x', role: 'admin', email: '...' }, everything except
// name is silently ignored. This is the mass-assignment protection required
// for profile updates.
async function updateProfile(req, res) {
  const { name } = req.body;

  if (name !== undefined && !isNonEmptyString(name)) {
    return res.status(400).json({ error: 'name must be a non-empty string' });
  }

  const user = await User.findById(req.user.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  if (name !== undefined) {
    user.name = name;
  }
  await user.save();
  await recordAudit(req, 'user.profile_updated', { targetId: user._id });

  return res.json({ id: user._id, email: user.email, name: user.name, role: user.role });
}

const PASSWORD_HISTORY_LIMIT = 5;

async function changePassword(req, res) {
  const { currentPassword, newPassword } = req.body;

  if (typeof currentPassword !== 'string') {
    return res.status(400).json({ error: 'currentPassword is required' });
  }

  const passwordIssues = getPasswordIssues(newPassword);
  if (passwordIssues.length > 0) {
    return res.status(400).json({
      error: `Password must contain ${passwordIssues.join(', ')}`,
      passwordIssues,
    });
  }

  const user = await User.findById(req.user.id).select('+passwordHash +passwordHistory');
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  if (!(await comparePassword(currentPassword, user.passwordHash))) {
    return res.status(401).json({ error: 'Current password is incorrect' });
  }

  const priorHashes = [user.passwordHash, ...user.passwordHistory];
  for (const priorHash of priorHashes) {
    if (await comparePassword(newPassword, priorHash)) {
      return res.status(400).json({ error: 'You cannot reuse a recent password' });
    }
  }

  user.passwordHistory = [user.passwordHash, ...user.passwordHistory].slice(0, PASSWORD_HISTORY_LIMIT);
  user.passwordHash = await hashPassword(newPassword);
  user.passwordChangedAt = new Date();
  await user.save();

  // Force every other session to log in again with the new password.
  await revokeAllRefreshTokensForUser(user._id);
  await recordAudit(req, 'user.password_changed', { targetId: user._id });

  const accessToken = await issueSession(req, res, user);

  return res.json({ message: 'Password changed', accessToken });
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
  updateProfile,
  changePassword,
  exportMyData,
};
