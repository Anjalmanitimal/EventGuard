const WaitlistEntry = require('../models/WaitlistEntry');
const TicketTier = require('../models/TicketTier');
const Event = require('../models/Event');
const User = require('../models/User');
const { sendWaitlistSpotAvailableEmail } = require('./email.service');

// Notifies the oldest `spotsOpened` waitlisted users for a tier that stock
// just became available. Deliberately notify-only, not a reservation - the
// existing atomic findOneAndUpdate purchase path already guarantees fairness
// once they try to buy, so there's no need for a separate hold/expiry system.
async function notifyWaitlist(tierId, spotsOpened) {
  if (!spotsOpened || spotsOpened < 1) return;

  const entries = await WaitlistEntry.find({ tierId }).sort({ createdAt: 1 }).limit(spotsOpened);
  if (entries.length === 0) return;

  const tier = await TicketTier.findById(tierId);
  if (!tier) return;
  const event = await Event.findById(tier.eventId);
  if (!event) return;

  for (const entry of entries) {
    const user = await User.findById(entry.userId);
    if (user) {
      try {
        await sendWaitlistSpotAvailableEmail(user.email, {
          eventTitle: event.title,
          eventId: event._id.toString(),
          tierName: tier.name,
        });
      } catch (err) {
        console.error('Failed to send waitlist notification email:', err.message);
      }
    }
    await entry.deleteOne();
  }
}

module.exports = { notifyWaitlist };
