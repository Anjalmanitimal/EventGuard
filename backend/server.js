require('dotenv').config();

const app = require('./src/app');
const connectDB = require('./src/config/db');
const { startReminderScheduler } = require('./src/services/reminder.service');

const PORT = process.env.PORT || 4000;

// A short/guessable JWT_SECRET is offline-crackable (dictionary/brute-force
// against the HMAC signature), letting an attacker forge tokens for any
// role. Refuse to boot rather than run with a weak signing key.
const MIN_JWT_SECRET_LENGTH = 32;
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < MIN_JWT_SECRET_LENGTH) {
  console.error(
    `JWT_SECRET is missing or too short (must be at least ${MIN_JWT_SECRET_LENGTH} characters). ` +
      'Generate one with: node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'base64url\'))"'
  );
  process.exit(1);
}

async function start() {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`EventGuard API listening on port ${PORT}`);
  });
  startReminderScheduler();
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
