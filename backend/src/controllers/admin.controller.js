const AuditLog = require('../models/AuditLog');
const User = require('../models/User');
const Event = require('../models/Event');
const Order = require('../models/Order');
const Ticket = require('../models/Ticket');
const IpRule = require('../models/IpRule');
const { recordAudit } = require('../middleware/auditLogger');
const { isNonEmptyString } = require('../utils/validators');
const { checkAndSendReminders } = require('../services/reminder.service');

async function listAuditLogs(req, res) {
  const limit = Math.min(Number(req.query.limit) || 50, 200);
  const skip = Math.max(Number(req.query.skip) || 0, 0);

  const [logs, total] = await Promise.all([
    AuditLog.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('userId', 'email role'),
    AuditLog.countDocuments(),
  ]);

  return res.json({ logs, total });
}

async function getStats(req, res) {
  const [userCount, eventCount, orderCount, ticketCount, revenueAgg] = await Promise.all([
    User.countDocuments(),
    Event.countDocuments(),
    Order.countDocuments(),
    Ticket.countDocuments(),
    Order.aggregate([
      { $match: { status: 'paid' } },
      { $group: { _id: null, total: { $sum: '$totalPrice' } } },
    ]),
  ]);

  return res.json({
    userCount,
    eventCount,
    orderCount,
    ticketCount,
    totalRevenue: revenueAgg[0]?.total || 0,
  });
}

const ASSIGNABLE_ROLES = ['attendee', 'organizer', 'admin'];

async function listUsers(req, res) {
  const limit = Math.min(Number(req.query.limit) || 100, 200);
  const skip = Math.max(Number(req.query.skip) || 0, 0);

  const [users, total] = await Promise.all([
    User.find().sort({ createdAt: -1 }).skip(skip).limit(limit),
    User.countDocuments(),
  ]);

  return res.json({ users, total });
}

async function updateUserRole(req, res) {
  const { role } = req.body;

  if (!ASSIGNABLE_ROLES.includes(role)) {
    return res.status(400).json({ error: `role must be one of: ${ASSIGNABLE_ROLES.join(', ')}` });
  }

  if (req.params.id === req.user.id && role !== 'admin') {
    return res.status(400).json({ error: 'You cannot change your own role' });
  }

  const user = await User.findById(req.params.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const previousRole = user.role;
  user.role = role;
  await user.save();

  await recordAudit(req, 'user.role_changed', { targetId: user._id });
  console.log(`[admin] ${req.user.id} changed ${user.email}'s role: ${previousRole} -> ${role}`);

  return res.json({ id: user._id, email: user.email, role: user.role });
}

const IP_RE = /^(\d{1,3}\.){3}\d{1,3}$|^[a-fA-F0-9:]+$/;

async function listIpRules(req, res) {
  const rules = await IpRule.find().sort({ createdAt: -1 }).populate('createdBy', 'email');
  return res.json(rules);
}

async function createIpRule(req, res) {
  const { ip, type, reason } = req.body;

  if (typeof ip !== 'string' || !IP_RE.test(ip)) {
    return res.status(400).json({ error: 'A valid IP address is required' });
  }
  if (type !== 'block' && type !== 'allow') {
    return res.status(400).json({ error: 'type must be "block" or "allow"' });
  }

  const existing = await IpRule.findOne({ ip });
  if (existing) {
    return res.status(409).json({ error: 'A rule for this IP already exists' });
  }

  const rule = await IpRule.create({
    ip,
    type,
    reason: isNonEmptyString(reason) ? reason : '',
    createdBy: req.user.id,
  });

  await recordAudit(req, `ip_rule.${type}ed`, { targetId: rule._id });

  return res.status(201).json(rule);
}

async function deleteIpRule(req, res) {
  const rule = await IpRule.findById(req.params.id);
  if (!rule) {
    return res.status(404).json({ error: 'Rule not found' });
  }

  await rule.deleteOne();
  await recordAudit(req, 'ip_rule.removed', { targetId: rule._id });

  return res.status(204).send();
}

// Manually runs the 24h-reminder sweep instead of waiting for the interval -
// useful for ops (re-running after a deploy) and for verifying delivery.
async function triggerReminders(req, res) {
  const count = await checkAndSendReminders();
  await recordAudit(req, 'admin.reminders_triggered');
  return res.json({ eventsProcessed: count });
}

module.exports = {
  listAuditLogs,
  getStats,
  listUsers,
  updateUserRole,
  listIpRules,
  createIpRule,
  deleteIpRule,
  triggerReminders,
};
