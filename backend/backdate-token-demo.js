// Sets emailVerificationExpires into the past for a given user, so we can
// prove verifyEmail() no longer enforces it (Appendix A.2 "before" state).
// Usage: node backend/backdate-token-demo.js "someone@example.com"

const { MongoClient } = require('mongodb');

const email = process.argv[2];
if (!email) {
  console.error('Usage: node backdate-token-demo.js "someone@example.com"');
  process.exit(1);
}

async function main() {
  const client = new MongoClient('mongodb://127.0.0.1:27017/eventguard');
  await client.connect();
  const users = client.db().collection('users');

  const pastDate = new Date(Date.now() - 400 * 24 * 60 * 60 * 1000); // 400 days ago
  const result = await users.updateOne(
    { email: email.toLowerCase() },
    { $set: { emailVerificationExpires: pastDate } }
  );

  console.log(`Matched ${result.matchedCount}, modified ${result.modifiedCount}`);
  console.log(`emailVerificationExpires set to: ${pastDate.toISOString()} (400 days in the past)`);

  await client.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
