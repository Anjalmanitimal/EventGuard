const express = require('express');

const requireAuth = require('../middleware/auth');
const requireRole = require('../middleware/rbac');
const {
  createEvent,
  listEvents,
  listMyEvents,
  getEvent,
  updateEvent,
  deleteEvent,
} = require('../controllers/events.controller');

const router = express.Router();

router.get('/', listEvents);
router.get('/mine', requireAuth, requireRole('organizer', 'admin'), listMyEvents);
router.get('/:id', requireAuth.optional, getEvent);
router.post('/', requireAuth, requireRole('organizer', 'admin'), createEvent);
router.patch('/:id', requireAuth, requireRole('organizer', 'admin'), updateEvent);
router.delete('/:id', requireAuth, requireRole('organizer', 'admin'), deleteEvent);

module.exports = router;
