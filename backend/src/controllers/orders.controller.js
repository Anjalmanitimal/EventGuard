const mongoose = require('mongoose');

const Event = require('../models/Event');
const TicketTier = require('../models/TicketTier');
const Order = require('../models/Order');
const Ticket = require('../models/Ticket');
const User = require('../models/User');
const { nextOrderNumber } = require('../utils/orderNumber');
const { generateTicketsForOrder, revokeTicketsForOrder } = require('../services/qr.service');
const { recordAudit } = require('../middleware/auditLogger');
const { sendOrderConfirmationEmail } = require('../services/email.service');
const { notifyWaitlist } = require('../services/waitlist.service');

function canView(order, user) {
  return user.role === 'admin' || order.userId.toString() === user.id;
}

async function createOrder(req, res) {
  const { eventId, tierId, quantity } = req.body;

  if (!mongoose.isValidObjectId(eventId) || !mongoose.isValidObjectId(tierId)) {
    return res.status(400).json({ error: 'Invalid eventId or tierId' });
  }
  if (!Number.isInteger(quantity) || quantity < 1) {
    return res.status(400).json({ error: 'quantity must be a positive integer' });
  }

  const event = await Event.findById(eventId);
  if (!event || event.status !== 'published') {
    return res.status(404).json({ error: 'Event not found' });
  }

  const tier = await TicketTier.findById(tierId);
  if (!tier || tier.eventId.toString() !== eventId) {
    return res.status(404).json({ error: 'Ticket tier not found' });
  }

  // Race-condition-safe stock decrement: the availability check and the
  // decrement happen as a single atomic operation on one document, so two
  // concurrent purchases for the last tickets can never both succeed
  // (fixes the classic TOCTOU overselling bug).
  const reserved = await TicketTier.findOneAndUpdate(
    { _id: tierId, quantityAvailable: { $gte: quantity } },
    { $inc: { quantityAvailable: -quantity } },
    { new: true }
  );

  if (!reserved) {
    return res.status(409).json({ error: 'Not enough tickets available' });
  }

  let order;
  try {
    const orderNumber = await nextOrderNumber();
    order = await Order.create({
      orderNumber,
      userId: req.user.id,
      eventId,
      tierId,
      quantity,
      unitPrice: tier.price,
      totalPrice: tier.price * quantity,
      // No payment provider wired up yet, so orders are treated as paid
      // immediately on creation. Swap this for 'pending' once Stripe is
      // integrated and only mark 'paid' after a confirmed webhook/charge.
      status: 'paid',
    });
    const tickets = await generateTicketsForOrder(order);
    await recordAudit(req, 'order.created', { targetId: order._id });

    try {
      const buyer = await User.findById(req.user.id);
      await sendOrderConfirmationEmail(buyer.email, {
        orderNumber: order.orderNumber,
        eventTitle: event.title,
        eventVenue: event.venue,
        eventDate: event.date,
        quantity: order.quantity,
        totalPrice: order.totalPrice,
      });
    } catch (err) {
      console.error('Failed to send order confirmation email:', err.message);
    }

    return res.status(201).json({ order, tickets });
  } catch (err) {
    // Something failed after stock was already reserved - without a
    // multi-document transaction (needs a replica set, not set up yet) we
    // compensate manually: give the reserved tickets back, and undo the
    // order/ticket rows if they were partially created.
    await TicketTier.updateOne({ _id: tierId }, { $inc: { quantityAvailable: quantity } });
    if (order) {
      await Order.deleteOne({ _id: order._id });
      await Ticket.deleteMany({ orderId: order._id });
    }
    console.error('Order creation failed after reserving stock:', err);
    return res.status(500).json({ error: 'Could not complete order, please try again' });
  }
}

async function listMyOrders(req, res) {
  const orders = await Order.find({ userId: req.user.id }).sort({ createdAt: -1 });
  return res.json(orders);
}

async function getOrder(req, res) {
  const order = await Order.findById(req.params.id);
  if (!order) {
    return res.status(404).json({ error: 'Order not found' });
  }
  if (!canView(order, req.user)) {
    return res.status(403).json({ error: 'You do not own this order' });
  }
  return res.json(order);
}

async function cancelOrder(req, res) {
  const order = await Order.findById(req.params.id);
  if (!order) {
    return res.status(404).json({ error: 'Order not found' });
  }
  if (!canView(order, req.user)) {
    return res.status(403).json({ error: 'You do not own this order' });
  }
  if (order.status === 'cancelled' || order.status === 'refunded') {
    return res.status(400).json({ error: 'Order is already cancelled' });
  }

  order.status = 'cancelled';
  await order.save();
  await TicketTier.updateOne({ _id: order.tierId }, { $inc: { quantityAvailable: order.quantity } });
  await revokeTicketsForOrder(order._id);
  await recordAudit(req, 'order.cancelled', { targetId: order._id });

  try {
    await notifyWaitlist(order.tierId, order.quantity);
  } catch (err) {
    console.error('Failed to notify waitlist after cancellation:', err.message);
  }

  return res.json(order);
}

module.exports = { createOrder, listMyOrders, getOrder, cancelOrder };
