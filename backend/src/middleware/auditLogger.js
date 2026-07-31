const AuditLog = require('../models/AuditLog');

// Records a security-relevant action (actor, action, target, IP).
// Never throws - a logging failure must not break the request itself.
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
