const Counter = require('../models/Counter');

// Atomic findOneAndUpdate - safe under concurrent order creation without
// needing a multi-document transaction.
async function nextOrderNumber() {
  const counter = await Counter.findOneAndUpdate(
    { _id: 'orderNumber' },
    { $inc: { seq: 1 } },
    { upsert: true, new: true }
  );
  return `EG-${String(counter.seq).padStart(6, '0')}`;
}

module.exports = { nextOrderNumber };
