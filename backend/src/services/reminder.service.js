const Event = require('../models/Event');
const Order = require('../models/Order');
const User = require('../models/User');
const { sendEventReminderEmail } = require('./email.service');

const REMINDER_WINDOW_MS = 24 * 60 * 60 * 1000;
const CHECK_INTERVAL_MS = 10 * 60 * 1000;

// Finds published events starting within the next 24h that haven't had a
// reminder sent yet, emails everyone with a paid order for that event, and
// marks the event so it's never reminded twice. Exported separately from the
// interval so it can be invoked directly (e.g. in tests) without waiting.
async function checkAndSendReminders() {
  const now = new Date();
  const windowEnd = new Date(now.getTime() + REMINDER_WINDOW_MS);

  const dueEvents = await Event.find({
    status: 'published',
    date: { $gte: now, $lte: windowEnd },
    reminderSentAt: null,
  });

  for (const event of dueEvents) {
    const orders = await Order.find({ eventId: event._id, status: 'paid' });
    const userIds = [...new Set(orders.map((o) => o.userId.toString()))];

    for (const userId of userIds) {
      const user = await User.findById(userId);
      if (!user) continue;
      try {
        await sendEventReminderEmail(user.email, {
          eventTitle: event.title,
          eventVenue: event.venue,
          eventDate: event.date,
        });
      } catch (err) {
        console.error('Failed to send event reminder email:', err.message);
      }
    }

    event.reminderSentAt = new Date();
    await event.save();
  }

  return dueEvents.length;
}

function startReminderScheduler() {
  checkAndSendReminders().catch((err) => console.error('Reminder check failed:', err));
  setInterval(() => {
    checkAndSendReminders().catch((err) => console.error('Reminder check failed:', err));
  }, CHECK_INTERVAL_MS);
}

module.exports = { checkAndSendReminders, startReminderScheduler };
