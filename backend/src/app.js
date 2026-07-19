const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const healthRoutes = require('./routes/health.routes');

const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:3000', credentials: true }));
app.use(express.json());
app.use(morgan('dev'));

app.use('/api/health', healthRoutes);

module.exports = app;
