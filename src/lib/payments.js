'use strict';

/**
 * Payment provider abstraction.
 * Switch between Razorpay and Stripe via PAYMENT_PROVIDER env var.
 */

const PROVIDER = (process.env.PAYMENT_PROVIDER || 'razorpay').toLowerCase();

// ─── Razorpay provider ───────────────────────────────────────────────────────
class RazorpayProvider {
  constructor() {
    const Razorpay = require('razorpay');
    this.client = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_placeholder',
      key_secret: process.env.RAZORPAY_KEY_SECRET || 'placeholder',
    });
    this.name = 'razorpay';
  }

  /** Create a payment order. Returns { orderId, amount, currency, providerData } */
  async createOrder({ amount, currency = 'INR', receipt, notes }) {
    const order = await this.client.orders.create({
      amount,
      currency,
      receipt: receipt || `rcpt_${Date.now()}`,
      notes: notes || {},
    });
    return {
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      providerData: order,
    };
  }

  /** Verify payment signature after client-side capture */
  verifySignature({ orderId, paymentId, signature }) {
    const crypto = require('crypto');
    const hmac = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || 'placeholder');
    hmac.update(`${orderId}|${paymentId}`);
    const expected = hmac.digest('hex');
    return expected === signature;
  }

  /** Validate webhook signature */
  validateWebhook({ body, signature }) {
    const crypto = require('crypto');
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET || 'placeholder';
    const expected = crypto.createHmac('sha256', secret).update(body).digest('hex');
    return expected === signature;
  }

  /** Extract payment ref from a webhook event payload */
  extractPaymentRef(payload) {
    try {
      const data = JSON.parse(payload);
      return data?.payload?.payment?.entity?.id || null;
    } catch {
      return null;
    }
  }

  /** Extract order id (provider) from webhook payload */
  extractOrderId(payload) {
    try {
      const data = JSON.parse(payload);
      return data?.payload?.payment?.entity?.order_id || null;
    } catch {
      return null;
    }
  }

  /** Returns client-side config to initialize the checkout modal */
  clientConfig() {
    return {
      key: process.env.RAZORPAY_KEY_ID || 'rzp_test_placeholder',
    };
  }
}

// ─── Stripe provider ─────────────────────────────────────────────────────────
class StripeProvider {
  constructor() {
    const Stripe = require('stripe');
    this.client = Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder');
    this.name = 'stripe';
  }

  async createOrder({ amount, currency = 'gbp', receipt, notes }) {
    const intent = await this.client.paymentIntents.create({
      amount,
      currency,
      metadata: { receipt: receipt || '', ...notes },
    });
    return {
      orderId: intent.id,
      amount: intent.amount,
      currency: intent.currency,
      providerData: intent,
      clientSecret: intent.client_secret,
    };
  }

  verifySignature({ orderId, paymentId, _signature }) {
    // For Stripe, verification happens via webhook; client-side confirmation is implicit
    return Boolean(orderId && paymentId);
  }

  validateWebhook({ body, signature }) {
    try {
      this.client.webhooks.constructEvent(
        body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET || 'placeholder'
      );
      return true;
    } catch {
      return false;
    }
  }

  extractPaymentRef(payload) {
    try {
      const data = JSON.parse(payload);
      return data?.data?.object?.id || null;
    } catch {
      return null;
    }
  }

  extractOrderId(payload) {
    try {
      const data = JSON.parse(payload);
      return data?.data?.object?.id || null;
    } catch {
      return null;
    }
  }

  clientConfig() {
    return {
      publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || 'pk_test_placeholder',
    };
  }
}

// ─── Factory ──────────────────────────────────────────────────────────────────
function getPaymentProvider() {
  if (PROVIDER === 'stripe') {return new StripeProvider();}
  return new RazorpayProvider();
}

module.exports = { getPaymentProvider };
