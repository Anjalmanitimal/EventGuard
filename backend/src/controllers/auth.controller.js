const crypto = require('crypto');

const User = require('../models/User');
const { hashPassword, comparePassword } = require('../utils/password');
const { signAccessToken } = require('../utils/jwt');
const { isValidEmail, isValidPassword } = require('../utils/validators');
const {
  issueRefreshToken,
  rotateRefreshToken,
  revokeRefreshToken,
  REFRESH_TOKEN_TTL_DAYS,
} = require('../utils/refreshToken');

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

async function login(req, res) {
  const { email, password } = req.body;

  if (!isValidEmail(email) || typeof password !== 'string') {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const user = await User.findOne({ email: email.toLowerCase() }).select('+passwordHash');
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const valid = await comparePassword(password, user.passwordHash);
  if (!valid) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  if (!user.isEmailVerified) {
    return res.status(403).json({ error: 'Email not verified' });
  }

  const accessToken = await issueSession(res, user);

  return res.json({ accessToken });
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
  });
}

module.exports = { register, verifyEmail, login, refresh, logout, me };
