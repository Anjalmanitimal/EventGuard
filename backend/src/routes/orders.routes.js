const express = require('express');

const requireAuth = require('../middleware/auth');
const { createOrder, listMyOrders, getOrder, cancelOrder } = require('../controllers/orders.controller');

const router = express.Router();

router.use(requireAuth);

router.post('/', createOrder);
router.get('/mine', listMyOrders);
router.get('/:id', getOrder);
router.post('/:id/cancel', cancelOrder);

module.exports = router;
