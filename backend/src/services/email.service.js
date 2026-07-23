const nodemailer = require('nodemailer');

let transporter = null;

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_APP_PASSWORD,
      },
    });
  }
  return transporter;
}

function frontendUrl() {
  return process.env.FRONTEND_URL || 'http://localhost:3000';
}

function sendEmail({ to, subject, html }) {
  return getTransporter().sendMail({
    from: `"EventGuard" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    html,
  });
}

async function sendVerificationEmail(toEmail, token) {
  const verifyUrl = `${frontendUrl()}/verify-email?token=${token}`;

  await sendEmail({
    to: toEmail,
    subject: 'Verify your EventGuard account',
    html: `
      <p>Welcome to EventGuard.</p>
      <p><a href="${verifyUrl}">Click here to verify your email</a></p>
      <p>Or enter this code on the verify-email page:</p>
      <p style="font-size: 28px; font-weight: bold; letter-spacing: 4px;">${token}</p>
    `,
  });
}

async function sendOrderConfirmationEmail(toEmail, { orderNumber, eventTitle, eventVenue, eventDate, quantity, totalPrice }) {
  await sendEmail({
    to: toEmail,
    subject: `Order confirmed: ${eventTitle}`,
    html: `
      <p>Your order is confirmed.</p>
      <table style="border-collapse: collapse;">
        <tr><td style="padding: 4px 12px 4px 0; color: #666;">Order</td><td>${orderNumber}</td></tr>
        <tr><td style="padding: 4px 12px 4px 0; color: #666;">Event</td><td>${eventTitle}</td></tr>
        <tr><td style="padding: 4px 12px 4px 0; color: #666;">Venue</td><td>${eventVenue}</td></tr>
        <tr><td style="padding: 4px 12px 4px 0; color: #666;">Date</td><td>${new Date(eventDate).toLocaleString()}</td></tr>
        <tr><td style="padding: 4px 12px 4px 0; color: #666;">Tickets</td><td>${quantity}</td></tr>
        <tr><td style="padding: 4px 12px 4px 0; color: #666;">Total</td><td>$${totalPrice.toFixed(2)}</td></tr>
      </table>
      <p><a href="${frontendUrl()}/orders">View your tickets</a></p>
    `,
  });
}

async function sendEventReminderEmail(toEmail, { eventTitle, eventVenue, eventDate }) {
  await sendEmail({
    to: toEmail,
    subject: `Reminder: ${eventTitle} is coming up`,
    html: `
      <p><strong>${eventTitle}</strong> is happening soon.</p>
      <p>${eventVenue} - ${new Date(eventDate).toLocaleString()}</p>
      <p><a href="${frontendUrl()}/orders">View your ticket</a></p>
    `,
  });
}

async function sendWaitlistSpotAvailableEmail(toEmail, { eventTitle, eventId, tierName }) {
  await sendEmail({
    to: toEmail,
    subject: `A spot opened up: ${eventTitle}`,
    html: `
      <p>Good news - a "${tierName}" ticket for <strong>${eventTitle}</strong> just became available.</p>
      <p>Spots are first-come, first-served, so grab it before someone else does:</p>
      <p><a href="${frontendUrl()}/events/${eventId}">Buy now</a></p>
    `,
  });
}

module.exports = {
  sendVerificationEmail,
  sendOrderConfirmationEmail,
  sendEventReminderEmail,
  sendWaitlistSpotAvailableEmail,
};
