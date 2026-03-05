'use strict';

const express = require('express');
const {
  showCheckout, createOrder, verifyPayment, webhook, addressRules,
} = require('../controllers/checkoutController');
const { requireAuth } = require('../../middlewares/guards');
const { doubleCsrfProtection, csrfMiddleware, checkoutLimiter } = require('../../middlewares/security');

const router = express.Router();

// Webhook: raw body required for signature verification; no rate limit on webhook (provider IP)
router.post(
  '/webhook',
  express.raw({ type: '*/*' }),
  webhook
);

// All other checkout routes require auth + CSRF + rate limit
router.use(requireAuth);
router.use(checkoutLimiter);
router.use(csrfMiddleware);

router.get('/', showCheckout);
router.post('/order', doubleCsrfProtection, addressRules, createOrder);
router.post('/verify', doubleCsrfProtection, verifyPayment);

module.exports = router;
