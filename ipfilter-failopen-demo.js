// Demonstrates ipFilter.js failing OPEN when its DB lookup throws (e.g. a
// Mongo outage/timeout) - an active block rule stops being enforced at
// exactly the moment the DB is unhealthy. Exercises the real middleware
// function directly with the DB call stubbed to throw - no live connection
// needed since we monkey-patch the Mongoose model's query methods.

const ipFilter = require('./backend/src/middleware/ipFilter.js');
const IpRule = require('./backend/src/models/IpRule.js');

function fakeReqRes(ip) {
  const req = { ip };
  const res = {
    statusCode: null,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
  return { req, res };
}

async function run(label, mockExists, mockFindOne, ip) {
  IpRule.exists = mockExists;
  IpRule.findOne = mockFindOne;

  const { req, res } = fakeReqRes(ip);
  let nextCalled = false;
  await ipFilter(req, res, () => {
    nextCalled = true;
  });

  console.log(
    `${label}: next() called = ${nextCalled}, response = ${res.statusCode ?? '(none - request proceeded)'}`
  );
  return nextCalled;
}

async function main() {
  console.log('--- Baseline: DB healthy, IP is on the block list ---');
  await run(
    'healthy DB, blocked IP',
    async () => false,
    async () => ({ ip: '203.0.113.7', type: 'block' }),
    '203.0.113.7'
  );

  console.log('\n--- Fault: DB lookup throws (simulated Mongo outage), same blocked IP ---');
  const passedThrough = await run(
    'DB throws, same blocked IP',
    async () => {
      throw new Error('simulated MongoNetworkError: connection timed out');
    },
    async () => {
      throw new Error('simulated MongoNetworkError: connection timed out');
    },
    '203.0.113.7'
  );

  if (passedThrough) {
    console.log(
      '\n*** FAIL-OPEN CONFIRMED: a request from a blocklisted IP was let through because the DB call threw. ***'
    );
  } else {
    console.log('\nRequest was correctly blocked despite the DB error.');
  }
}

main().catch((err) => {
  console.error('Demo failed:', err);
  process.exit(1);
});
