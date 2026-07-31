const crypto = require('crypto');

const Ticket = require('../models/Ticket');

function generateQrToken() {
  // 256 bits of randomness - unguessable, which is what makes a ticket
  // unforgeable without needing a separate signature.
  return crypto.randomBytes(32).toString('hex');
}

async function generateTicketsForOrder(order) {
  const tickets = [];
  for (let i = 0; i < order.quantity; i += 1) {
    tickets.push({
      orderId: order._id,
      eventId: order.eventId,
      userId: order.userId,
      qrToken: generateQrToken(),
    });
  }
  return Ticket.insertMany(tickets);
}

// Atomically flips valid -> used: two simultaneous scans of a shared/replayed
// QR code can't both succeed - only the first one wins.
async function scanTicket(qrToken, scannedByUserId) {
  const ticket = await Ticket.findOneAndUpdate(
    { qrToken, status: 'valid' },
    { status: 'used', scannedAt: new Date(), scannedBy: scannedByUserId },
    { new: true }
  );

  if (ticket) {
    return { outcome: 'accepted', ticket };
  }

  const existing = await Ticket.findOne({ qrToken });
  if (!existing) {
    return { outcome: 'not_found' };
  }
  return { outcome: 'already_used', ticket: existing };
}

async function revokeTicketsForOrder(orderId) {
  await Ticket.updateMany({ orderId, status: 'valid' }, { status: 'revoked' });
}

module.exports = { generateTicketsForOrder, scanTicket, revokeTicketsForOrder };
