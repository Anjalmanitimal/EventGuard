const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const sanitizeBody = require('./middleware/sanitize');

const healthRoutes = require('./routes/health.routes');
const authRoutes = require('./routes/auth.routes');

const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:3000', credentials: true }));
app.use(express.json());
app.use(cookieParser());
app.use(sanitizeBody);
app.use(morgan('dev'));

app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

module.exports = app;
