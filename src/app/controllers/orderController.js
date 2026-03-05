'use strict';

const { getDb } = require('../../lib/db');
const logger = require('../../lib/logger');

function formatPrice(minor) {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(minor / 100);
}

async function listOrders(req, res) {
  const db = getDb();
  try {
    const orders = await db.order.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
    });

    const parsed = orders.map((o) => ({
      ...o,
      items: JSON.parse(o.items || '[]'),
      totalFormatted: formatPrice(o.total),
    }));

    res.render('pages/orders/list', { title: 'My Orders', orders: parsed });
  } catch (err) {
    logger.error({ err }, 'List orders error');
    res.status(500).render('pages/error', { title: 'Error', message: 'Could not load orders.', status: 500 });
  }
}

async function showOrder(req, res) {
  const db = getDb();
  const { id } = req.params;
  try {
    const order = await db.order.findFirst({ where: { id, userId: req.user.id } });
    if (!order) {
      return res.status(404).render('pages/error', { title: 'Not Found', message: 'Order not found.', status: 404 });
    }

    const parsed = {
      ...order,
      items: JSON.parse(order.items || '[]'),
      shippingAddress: order.shippingAddress ? JSON.parse(order.shippingAddress) : null,
      totalFormatted: formatPrice(order.total),
    };

    res.render('pages/orders/detail', { title: `Order #${order.id.slice(0, 8).toUpperCase()}`, order: parsed });
  } catch (err) {
    logger.error({ err }, 'Show order error');
    res.status(500).render('pages/error', { title: 'Error', message: 'Could not load order.', status: 500 });
  }
}

module.exports = { listOrders, showOrder };
