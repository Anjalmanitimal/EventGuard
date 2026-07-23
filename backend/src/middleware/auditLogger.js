const AuditLog = require('../models/AuditLog');

// Records a security-relevant action. Deliberately never throws - a failure
// to write an audit entry must not break the request it's describing.
// `userId` defaults to req.user.id (set by requireAuth) but can be
// overridden for routes like login/register where req.user isn't set yet.
async function recordAudit(req, action, { targetId = null, userId } = {}) {
  try {
    await AuditLog.create({
      userId: userId !== undefined ? userId : req.user?.id || null,
      action,
      targetId,
      ip: req.ip,
    });
  } catch (err) {
    console.error('Failed to record audit log:', err);
  }
}

module.exports = { recordAudit };
