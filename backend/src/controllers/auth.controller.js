const crypto = require('crypto');

const User = require('../models/User');
const { hashPassword, comparePassword } = require('../utils/password');
const { signAccessToken } = require('../utils/jwt');
const { isValidEmail, isValidPassword } = require('../utils/validators');

async function register(req, res) {
  const { email, password } = req.body;

  if (!isValidEmail(email) || !isValidPassword(password)) {
    return res.status(400).json({ error: 'Valid email and password (min 8 characters) are required' });
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

  const accessToken = signAccessToken({ sub: user._id.toString(), role: user.role });

  return res.json({ accessToken });
}

module.exports = { register, verifyEmail, login };
