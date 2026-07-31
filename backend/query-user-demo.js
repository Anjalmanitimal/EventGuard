// Prints a user document by email, for pentest report evidence screenshots.
// Usage: node backend/query-user-demo.js "someone@example.com"

const { MongoClient } = require('mongodb');

const email = process.argv[2];
if (!email) {
  console.error('Usage: node query-user-demo.js "someone@example.com"');
  process.exit(1);
}

async function main() {
  const client = new MongoClient('mongodb://127.0.0.1:27017/eventguard');
  await client.connect();
  const user = await client
    .db()
    .collection('users')
    .findOne({ email: email.toLowerCase() }, { projection: { passwordHash: 0, passwordHistory: 0 } });

  console.log(`Document for ${email}:\n`);
  console.log(JSON.stringify(user, null, 2));

  await client.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
