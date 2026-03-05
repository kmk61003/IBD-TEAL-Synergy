'use strict';

const { v4: uuidv4 } = require('uuid');
const { body, validationResult } = require('express-validator');
const { getDb } = require('../../lib/db');
const { getPaymentProvider } = require('../../lib/payments');
const { getCartWithProducts } = require('./cartController');
const logger = require('../../lib/logger');

const addressRules = [
  body('fullName').trim().notEmpty().withMessage('Full name is required').isLength({ max: 100 }),
  body('address1').trim().notEmpty().withMessage('Address is required'),
  body('city').trim().notEmpty().withMessage('City is required'),
  body('postcode').trim().notEmpty().withMessage('Postcode is required'),
  body('country').trim().notEmpty().withMessage('Country is required'),
];

async function showCheckout(req, res) {
  try {
    const cart = await getCartWithProducts(req.user.id);
    if (!cart.items.length) {
      req.flash('error', 'Your bag is empty.');
      return res.redirect('/cart');
    }
    const provider = getPaymentProvider();
    res.render('pages/checkout/index', {
      title: 'Checkout',
      cart,
      errors: [],
      old: {},
      paymentProvider: provider.name,
      paymentClientConfig: provider.clientConfig(),
    });
  } catch (err) {
    logger.error({ err }, 'Show checkout error');
    res.status(500).render('pages/error', { title: 'Error', message: 'Could not load checkout.', status: 500 });
  }
}

async function createOrder(req, res) {
  const errors = validationResult(req);
  const db = getDb();

  try {
    const cart = await getCartWithProducts(req.user.id);
    if (!cart.items.length) {
      req.flash('error', 'Your bag is empty.');
      return res.redirect('/cart');
    }

    if (!errors.isEmpty()) {
      const provider = getPaymentProvider();
      return res.status(422).render('pages/checkout/index', {
        title: 'Checkout',
        cart,
        errors: errors.array(),
        old: req.body,
        paymentProvider: provider.name,
        paymentClientConfig: provider.clientConfig(),
      });
    }

    const { fullName, address1, address2, city, postcode, country } = req.body;
    const shippingAddress = JSON.stringify({ fullName, address1, address2, city, postcode, country });

    const provider = getPaymentProvider();
    const receipt = `teal_${uuidv4().slice(0, 8)}`;

    // Snapshot items at purchase time
    const itemsSnapshot = cart.items.map((i) => ({
      productId: i.productId,
      title: i.product.title,
      qty: i.qty,
      price: i.product.price,
      lineTotal: i.lineTotal,
    }));

    // Create order in DB (PENDING)
    const order = await db.order.create({
      data: {
        id: uuidv4(),
        userId: req.user.id,
        status: 'PENDING',
        total: cart.subtotal,
        currency: process.env.CURRENCY || 'INR',
        paymentProvider: provider.name,
        items: JSON.stringify(itemsSnapshot),
        shippingAddress,
      },
    });

    // Create payment order at provider
    const paymentOrder = await provider.createOrder({
      amount: cart.subtotal,
      currency: process.env.CURRENCY || 'INR',
      receipt,
      notes: { orderId: order.id, userId: req.user.id },
    });

    // Store provider order id on our order
    await db.order.update({
      where: { id: order.id },
      data: { paymentOrderId: paymentOrder.orderId },
    });

    res.render('pages/checkout/payment', {
      title: 'Complete Payment',
      order,
      cart,
      paymentOrder,
      paymentProvider: provider.name,
      paymentClientConfig: provider.clientConfig(),
      user: req.user,
    });
  } catch (err) {
    logger.error({ err }, 'Create order error');
    res.status(500).render('pages/error', { title: 'Error', message: 'Could not create order. Please try again.', status: 500 });
  }
}

async function verifyPayment(req, res) {
  const db = getDb();
  const provider = getPaymentProvider();
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, stripe_payment_intent_id, order_id } = req.body;

  try {
    let orderId = order_id;
    let paymentRef;
    let valid = false;

    if (provider.name === 'razorpay') {
      valid = provider.verifySignature({
        orderId: razorpay_order_id,
        paymentId: razorpay_payment_id,
        signature: razorpay_signature,
      });
      paymentRef = razorpay_payment_id;

      // Lookup by paymentOrderId
      if (!orderId && razorpay_order_id) {
        const found = await db.order.findFirst({ where: { paymentOrderId: razorpay_order_id } });
        if (found) {orderId = found.id;}
      }
    } else {
      // Stripe: payment intent id
      valid = Boolean(stripe_payment_intent_id);
      paymentRef = stripe_payment_intent_id;
    }

    if (!valid || !orderId) {
      req.flash('error', 'Payment verification failed.');
      return res.redirect('/cart');
    }

    const order = await db.order.findFirst({ where: { id: orderId, userId: req.user.id } });
    if (!order) {
      return res.status(404).render('pages/error', { title: 'Not Found', message: 'Order not found.', status: 404 });
    }

    // Idempotent update
    if (order.status !== 'PAID') {
      await db.order.update({
        where: { id: order.id },
        data: { status: 'PAID', paymentRef },
      });
      // Clear cart
      await db.cartItem.deleteMany({ where: { userId: req.user.id } });
    }

    res.redirect(`/orders/${order.id}`);
  } catch (err) {
    logger.error({ err }, 'Verify payment error');
    res.status(500).render('pages/error', { title: 'Error', message: 'Payment verification error.', status: 500 });
  }
}

/** Webhook endpoint for payment provider callbacks */
async function webhook(req, res) {
  const provider = getPaymentProvider();
  const signature = req.headers['x-razorpay-signature'] || req.headers['stripe-signature'];
  const rawBody = req.body; // raw buffer

  try {
    const valid = provider.validateWebhook({ body: rawBody, signature });
    if (!valid) {
      logger.warn('Invalid webhook signature');
      return res.status(400).json({ error: 'Invalid signature' });
    }

    const paymentRef = provider.extractPaymentRef(rawBody.toString());
    const providerOrderId = provider.extractOrderId(rawBody.toString());

    if (providerOrderId) {
      const db = getDb();
      const order = await db.order.findFirst({ where: { paymentOrderId: providerOrderId } });
      if (order && order.status !== 'PAID') {
        await db.order.update({
          where: { id: order.id },
          data: { status: 'PAID', paymentRef },
        });
        logger.info({ orderId: order.id, paymentRef }, 'Order marked PAID via webhook');
      }
    }

    res.status(200).json({ received: true });
  } catch (err) {
    logger.error({ err }, 'Webhook error');
    res.status(500).json({ error: 'Webhook processing failed' });
  }
}

module.exports = { showCheckout, createOrder, verifyPayment, webhook, addressRules };
