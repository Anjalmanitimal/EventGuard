const Event = require('../models/Event');
const TicketTier = require('../models/TicketTier');
const { isNonEmptyString, isValidDate } = require('../utils/validators');
const { recordAudit } = require('../middleware/auditLogger');

const EVENT_STATUSES = ['draft', 'published', 'cancelled'];

function canManage(event, user) {
  return user.role === 'admin' || event.organizerId.toString() === user.id;
}

async function createEvent(req, res) {
  const { title, description, venue, date, tier } = req.body;

  if (!isNonEmptyString(title) || !isNonEmptyString(venue) || !isValidDate(date)) {
    return res.status(400).json({ error: 'title, venue, and a valid date are required' });
  }

  let tierInput = null;
  if (tier) {
    const { name, price, quantityTotal } = tier;
    const validTier =
      isNonEmptyString(name) &&
      typeof price === 'number' &&
      price >= 0 &&
      Number.isInteger(quantityTotal) &&
      quantityTotal >= 0;
    if (!validTier) {
      return res.status(400).json({
        error: 'Ticket tier requires a name, a non-negative price, and a non-negative integer quantity',
      });
    }
    tierInput = { name, price, quantityTotal };
  }

  const event = await Event.create({
    organizerId: req.user.id,
    title,
    description: isNonEmptyString(description) ? description : '',
    venue,
    date: new Date(date),
  });

  let createdTier = null;
  if (tierInput) {
    createdTier = await TicketTier.create({
      eventId: event._id,
      name: tierInput.name,
      price: tierInput.price,
      quantityTotal: tierInput.quantityTotal,
      quantityAvailable: tierInput.quantityTotal,
    });
  }

  await recordAudit(req, 'event.created', { targetId: event._id });

  return res.status(201).json({ event, tier: createdTier });
}

async function listEvents(req, res) {
  const events = await Event.find({ status: 'published' }).sort({ date: 1 });
  return res.json(events);
}

async function listMyEvents(req, res) {
  const events = await Event.find({ organizerId: req.user.id }).sort({ createdAt: -1 });
  return res.json(events);
}

async function getEvent(req, res) {
  const event = await Event.findById(req.params.id);
  if (!event) {
    return res.status(404).json({ error: 'Event not found' });
  }

  const isOwner = Boolean(req.user) && canManage(event, req.user);
  if (event.status !== 'published' && !isOwner) {
    return res.status(404).json({ error: 'Event not found' });
  }

  const tiers = await TicketTier.find({ eventId: event._id });
  return res.json({ event, tiers });
}

async function updateEvent(req, res) {
  const event = await Event.findById(req.params.id);
  if (!event) {
    return res.status(404).json({ error: 'Event not found' });
  }
  if (!canManage(event, req.user)) {
    return res.status(403).json({ error: 'You do not own this event' });
  }

  if ('title' in req.body) {
    if (!isNonEmptyString(req.body.title)) {
      return res.status(400).json({ error: 'title cannot be empty' });
    }
    event.title = req.body.title;
  }
  if ('description' in req.body) {
    event.description = isNonEmptyString(req.body.description) ? req.body.description : '';
  }
  if ('venue' in req.body) {
    if (!isNonEmptyString(req.body.venue)) {
      return res.status(400).json({ error: 'venue cannot be empty' });
    }
    event.venue = req.body.venue;
  }
  if ('date' in req.body) {
    if (!isValidDate(req.body.date)) {
      return res.status(400).json({ error: 'Invalid date' });
    }
    event.date = new Date(req.body.date);
  }
  if ('status' in req.body) {
    if (!EVENT_STATUSES.includes(req.body.status)) {
      return res.status(400).json({ error: `status must be one of: ${EVENT_STATUSES.join(', ')}` });
    }
    event.status = req.body.status;
  }

  await event.save();

  let action = 'event.updated';
  if (event.status === 'published') action = 'event.published';
  if (event.status === 'cancelled') action = 'event.cancelled';
  await recordAudit(req, action, { targetId: event._id });

  return res.json(event);
}

async function deleteEvent(req, res) {
  const event = await Event.findById(req.params.id);
  if (!event) {
    return res.status(404).json({ error: 'Event not found' });
  }
  if (!canManage(event, req.user)) {
    return res.status(403).json({ error: 'You do not own this event' });
  }

  await TicketTier.deleteMany({ eventId: event._id });
  await event.deleteOne();
  await recordAudit(req, 'event.deleted', { targetId: event._id });
  return res.status(204).send();
}

module.exports = { createEvent, listEvents, listMyEvents, getEvent, updateEvent, deleteEvent };
