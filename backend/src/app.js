const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const sanitizeBody = require('./middleware/sanitize');
const ipFilter = require('./middleware/ipFilter');

const healthRoutes = require('./routes/health.routes');
const authRoutes = require('./routes/auth.routes');
const eventsRoutes = require('./routes/events.routes');
const ordersRoutes = require('./routes/orders.routes');
const ticketsRoutes = require('./routes/tickets.routes');
const adminRoutes = require('./routes/admin.routes');
const waitlistRoutes = require('./routes/waitlist.routes');

const app = express();

// Baseline security headers: CSP, HSTS, X-Frame-Options, no X-Powered-By, etc.
app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:3000', credentials: true }));
app.use(ipFilter);
app.use(express.json());
app.use(cookieParser());
app.use(sanitizeBody);
app.use(morgan('dev'));

app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/events', eventsRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/tickets', ticketsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/waitlist', waitlistRoutes);

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

module.exports = app;
