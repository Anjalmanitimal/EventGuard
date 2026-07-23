const express = require('express');

const requireAuth = require('../middleware/auth');
const requireRole = require('../middleware/rbac');
const {
  listAuditLogs,
  getStats,
  listUsers,
  updateUserRole,
  listIpRules,
  createIpRule,
  deleteIpRule,
  triggerReminders,
} = require('../controllers/admin.controller');

const router = express.Router();

router.use(requireAuth, requireRole('admin'));

router.get('/audit-logs', listAuditLogs);
router.get('/stats', getStats);
router.get('/users', listUsers);
router.patch('/users/:id/role', updateUserRole);
router.get('/ip-rules', listIpRules);
router.post('/ip-rules', createIpRule);
router.delete('/ip-rules/:id', deleteIpRule);
router.post('/trigger-reminders', triggerReminders);

module.exports = router;
