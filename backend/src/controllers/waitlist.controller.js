const mongoose = require('mongoose');

const WaitlistEntry = require('../models/WaitlistEntry');
const TicketTier = require('../models/TicketTier');
const { recordAudit } = require('../middleware/auditLogger');

async function joinWaitlist(req, res) {
  const { tierId } = req.body;

  if (!mongoose.isValidObjectId(tierId)) {
    return res.status(400).json({ error: 'Invalid tierId' });
  }

  const tier = await TicketTier.findById(tierId);
  if (!tier) {
    return res.status(404).json({ error: 'Ticket tier not found' });
  }
  if (tier.quantityAvailable > 0) {
    return res.status(400).json({ error: 'Tickets are still available - no need to join the waitlist' });
  }

  const existing = await WaitlistEntry.findOne({ tierId, userId: req.user.id });
  if (existing) {
    return res.status(409).json({ error: 'You are already on the waitlist for this tier' });
  }

  const entry = await WaitlistEntry.create({ eventId: tier.eventId, tierId, userId: req.user.id });
  await recordAudit(req, 'waitlist.joined', { targetId: entry._id });

  return res.status(201).json(entry);
}

async function listMyWaitlist(req, res) {
  const entries = await WaitlistEntry.find({ userId: req.user.id }).sort({ createdAt: -1 });
  return res.json(entries);
}

async function leaveWaitlist(req, res) {
  const entry = await WaitlistEntry.findById(req.params.id);
  if (!entry) {
    return res.status(404).json({ error: 'Waitlist entry not found' });
  }
  if (entry.userId.toString() !== req.user.id) {
    return res.status(403).json({ error: 'You are not on this waitlist entry' });
  }

  await entry.deleteOne();
  await recordAudit(req, 'waitlist.left', { targetId: entry._id });

  return res.status(204).send();
}

module.exports = { joinWaitlist, listMyWaitlist, leaveWaitlist };
