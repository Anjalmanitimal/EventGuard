const IpRule = require('../models/IpRule');

// Loopback is never blockable - misconfiguring this in a local/dev
// environment should never be able to lock out the only person who can fix it.
const NEVER_BLOCK = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1']);

async function ipFilter(req, res, next) {
  const ip = req.ip;
  if (NEVER_BLOCK.has(ip)) {
    return next();
  }

  try {
    // If any allow-list entries exist, the app switches to allow-list mode:
    // only listed IPs may proceed. Otherwise it's deny-list mode: only
    // explicitly blocked IPs are rejected.
    const hasAllowList = await IpRule.exists({ type: 'allow' });
    if (hasAllowList) {
      const allowed = await IpRule.findOne({ ip, type: 'allow' });
      if (!allowed) {
        return res.status(403).json({ error: 'Access denied from this network' });
      }
      return next();
    }

    const blocked = await IpRule.findOne({ ip, type: 'block' });
    if (blocked) {
      return res.status(403).json({ error: 'Access denied from this network' });
    }

    return next();
  } catch (err) {
    console.error('IP filter check failed:', err);
    return next();
  }
}

module.exports = ipFilter;
