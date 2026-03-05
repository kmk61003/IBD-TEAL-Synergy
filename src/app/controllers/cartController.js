'use strict';

const { getDb } = require('../../lib/db');
const logger = require('../../lib/logger');
const { parseProduct } = require('./catalogController');

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatPrice(minor) {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(minor / 100);
}

async function getCartWithProducts(userId) {
  const db = getDb();
  const items = await db.cartItem.findMany({
    where: { userId },
    include: { product: true },
    orderBy: { createdAt: 'asc' },
  });

  let subtotal = 0;
  const enriched = items.map((item) => {
    const product = parseProduct(item.product);
    const lineTotal = product.price * item.qty;
    subtotal += lineTotal;
    return { ...item, product, lineTotal, lineTotalFormatted: formatPrice(lineTotal) };
  });

  return { items: enriched, subtotal, subtotalFormatted: formatPrice(subtotal) };
}

// ─── Controllers ──────────────────────────────────────────────────────────────
async function showCart(req, res) {
  try {
    const cart = await getCartWithProducts(req.user.id);
    res.render('pages/cart/index', { title: 'Shopping Bag', cart });
  } catch (err) {
    logger.error({ err }, 'Show cart error');
    res.status(500).render('pages/error', { title: 'Error', message: 'Could not load cart.', status: 500 });
  }
}

async function addToCart(req, res) {
  const db = getDb();
  const { productId } = req.params;
  const qty = Math.max(1, parseInt(req.body.qty || '1', 10));

  try {
    const product = await db.product.findUnique({ where: { id: productId } });
    if (!product || product.stock < 1) {
      req.flash('error', 'Product is out of stock.');
      return res.redirect('back');
    }

    const existing = await db.cartItem.findFirst({
      where: { userId: req.user.id, productId },
    });

    if (existing) {
      const newQty = Math.min(existing.qty + qty, product.stock);
      await db.cartItem.update({ where: { id: existing.id }, data: { qty: newQty } });
    } else {
      const { v4: uuidv4 } = require('uuid');
      await db.cartItem.create({
        data: {
          id: uuidv4(),
          userId: req.user.id,
          productId,
          qty: Math.min(qty, product.stock),
        },
      });
    }

    req.flash('success', `${product.title} added to your bag.`);
    res.redirect('/cart');
  } catch (err) {
    logger.error({ err }, 'Add to cart error');
    req.flash('error', 'Could not add to bag.');
    res.redirect('back');
  }
}

async function updateCart(req, res) {
  const db = getDb();
  const { itemId } = req.params;
  const qty = parseInt(req.body.qty || '1', 10);

  try {
    const item = await db.cartItem.findFirst({ where: { id: itemId, userId: req.user.id } });
    if (!item) {return res.redirect('/cart');}

    if (qty < 1) {
      await db.cartItem.delete({ where: { id: itemId } });
    } else {
      await db.cartItem.update({ where: { id: itemId }, data: { qty } });
    }
    res.redirect('/cart');
  } catch (err) {
    logger.error({ err }, 'Update cart error');
    res.redirect('/cart');
  }
}

async function removeFromCart(req, res) {
  const db = getDb();
  const { itemId } = req.params;
  try {
    await db.cartItem.deleteMany({ where: { id: itemId, userId: req.user.id } });
    req.flash('success', 'Item removed from bag.');
  } catch (err) {
    logger.error({ err }, 'Remove from cart error');
  }
  res.redirect('/cart');
}

module.exports = { showCart, addToCart, updateCart, removeFromCart, getCartWithProducts };
