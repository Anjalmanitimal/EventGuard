const Ticket = require('../models/Ticket');
const { scanTicket } = require('../services/qr.service');
const { recordAudit } = require('../middleware/auditLogger');

async function listMyTickets(req, res) {
  const tickets = await Ticket.find({ userId: req.user.id }).sort({ createdAt: -1 });
  return res.json(tickets);
}

async function scan(req, res) {
  const { qrToken } = req.body;

  if (typeof qrToken !== 'string' || qrToken.length === 0) {
    return res.status(400).json({ error: 'qrToken is required' });
  }

  const result = await scanTicket(qrToken, req.user.id);

  if (result.outcome === 'not_found') {
    await recordAudit(req, 'ticket.scan_rejected_unknown');
    return res.status(404).json({ error: 'Invalid ticket' });
  }
  if (result.outcome === 'already_used') {
    await recordAudit(req, 'ticket.scan_rejected_replay', { targetId: result.ticket._id });
    return res.status(409).json({
      error: 'Ticket already used',
      scannedAt: result.ticket.scannedAt,
    });
  }

  await recordAudit(req, 'ticket.scanned', { targetId: result.ticket._id });
  return res.json({ message: 'Ticket accepted', ticket: result.ticket });
}

module.exports = { listMyTickets, scan };
