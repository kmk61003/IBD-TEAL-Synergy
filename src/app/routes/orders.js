'use strict';

const express = require('express');
const { listOrders, showOrder } = require('../controllers/orderController');
const { requireAuth } = require('../../middlewares/guards');
const { apiLimiter } = require('../../middlewares/security');

const router = express.Router();

router.use(requireAuth);
router.use(apiLimiter);

router.get('/', listOrders);
router.get('/:id', showOrder);

module.exports = router;
