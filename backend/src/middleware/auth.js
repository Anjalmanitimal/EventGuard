const jwt = require('jsonwebtoken');

function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
    req.user = { id: payload.sub, role: payload.role };
    return next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// Populates req.user when a valid token is present, but never rejects the
// request - for routes that behave differently for logged-in vs anonymous
// callers (e.g. viewing an event as its owner vs. as the public).
function optionalAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme === 'Bearer' && token) {
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
      req.user = { id: payload.sub, role: payload.role };
    } catch {
      // invalid/expired token on an optional-auth route - treat as anonymous
    }
  }

  return next();
}

module.exports = requireAuth;
module.exports.optional = optionalAuth;
