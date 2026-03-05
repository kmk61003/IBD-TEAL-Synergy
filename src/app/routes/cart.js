'use strict';

const express = require('express');
const { showCart, addToCart, updateCart, removeFromCart } = require('../controllers/cartController');
const { requireAuth } = require('../../middlewares/guards');
const { doubleCsrfProtection, csrfMiddleware, apiLimiter } = require('../../middlewares/security');

const router = express.Router();

router.use(requireAuth);
router.use(apiLimiter);
router.use(csrfMiddleware);

router.get('/', showCart);
router.post('/add/:productId', doubleCsrfProtection, addToCart);
router.post('/update/:itemId', doubleCsrfProtection, updateCart);
router.post('/remove/:itemId', doubleCsrfProtection, removeFromCart);

module.exports = router;
