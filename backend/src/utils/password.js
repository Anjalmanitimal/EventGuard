const bcrypt = require('bcrypt');

// 12 rounds: slow enough to resist offline cracking, fast enough not to
// bottleneck login. Never store or compare plaintext passwords.
const SALT_ROUNDS = 12;

function hashPassword(plain) {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

function comparePassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}

module.exports = { hashPassword, comparePassword };
