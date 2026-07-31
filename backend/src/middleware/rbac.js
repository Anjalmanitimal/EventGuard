// Route guard: rejects unless the authenticated user's role is on the
// allow-list passed in (e.g. requireRole('admin')).
function requireRole(...roles) {
  return function (req, res, next) {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    return next();
  };
}

module.exports = requireRole;
