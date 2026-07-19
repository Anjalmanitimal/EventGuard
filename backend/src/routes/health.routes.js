const express = require('express');
const mongoose = require('mongoose');

const router = express.Router();

const MONGO_STATES = ['disconnected', 'connected', 'connecting', 'disconnecting'];

router.get('/', (req, res) => {
  res.json({
    status: 'ok',
    db: MONGO_STATES[mongoose.connection.readyState] || 'unknown',
  });
});

module.exports = router;
