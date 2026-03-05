'use strict';

const { v4: uuidv4 } = require('uuid');
const { body, validationResult } = require('express-validator');
const { getDb } = require('../../lib/db');
const logger = require('../../lib/logger');

const productRules = [
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('slug').trim().notEmpty().withMessage('Slug is required')
    .matches(/^[a-z0-9-]+$/).withMessage('Slug must be lowercase alphanumeric and hyphens'),
  body('price').isInt({ min: 1 }).withMessage('Price must be a positive integer (pence)'),
  body('stock').isInt({ min: 0 }).withMessage('Stock must be 0 or more'),
];

function formatPrice(minor) {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(minor / 100);
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
async function dashboard(req, res) {
  const db = getDb();
  try {
    const [productCount, orderCount, pendingOrders, revenue] = await Promise.all([
      db.product.count(),
      db.order.count(),
      db.order.count({ where: { status: 'PENDING' } }),
      db.order.aggregate({ _sum: { total: true }, where: { status: 'PAID' } }),
    ]);

    res.render('pages/admin/dashboard', {
      title: 'Admin Dashboard',
      stats: {
        productCount,
        orderCount,
        pendingOrders,
        revenue: formatPrice(revenue._sum.total || 0),
      },
    });
  } catch (err) {
    logger.error({ err }, 'Admin dashboard error');
    res.status(500).render('pages/error', { title: 'Error', message: 'Dashboard error.', status: 500 });
  }
}

// ─── Products CRUD ────────────────────────────────────────────────────────────
async function listAdminProducts(req, res) {
  const db = getDb();
  try {
    const products = await db.product.findMany({ orderBy: { createdAt: 'desc' } });
    const parsed = products.map((p) => ({ ...p, priceFormatted: formatPrice(p.price) }));
    res.render('pages/admin/products', { title: 'Manage Products', products: parsed });
  } catch (err) {
    logger.error({ err }, 'Admin list products error');
    res.status(500).render('pages/error', { title: 'Error', message: 'Could not load products.', status: 500 });
  }
}

async function showCreateProduct(req, res) {
  res.render('pages/admin/product-form', { title: 'New Product', product: null, errors: [], old: {} });
}

async function createProduct(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).render('pages/admin/product-form', {
      title: 'New Product', product: null, errors: errors.array(), old: req.body,
    });
  }

  const db = getDb();
  const { title, slug, description, price, stock, categories, featured } = req.body;

  try {
    await db.product.create({
      data: {
        id: uuidv4(),
        title: title.trim(),
        slug: slug.trim(),
        description: description || '',
        price: parseInt(price, 10),
        stock: parseInt(stock, 10),
        categories: JSON.stringify(
          (categories || '').split(',').map((c) => c.trim()).filter(Boolean)
        ),
        images: '[]',
        featured: featured === 'on' || featured === 'true',
      },
    });
    req.flash('success', 'Product created.');
    res.redirect('/admin/products');
  } catch (err) {
    logger.error({ err }, 'Create product error');
    if (err.code === 'P2002') {
      return res.status(422).render('pages/admin/product-form', {
        title: 'New Product', product: null,
        errors: [{ path: 'slug', msg: 'Slug already exists.' }], old: req.body,
      });
    }
    res.status(500).render('pages/error', { title: 'Error', message: 'Could not create product.', status: 500 });
  }
}

async function showEditProduct(req, res) {
  const db = getDb();
  const { id } = req.params;
  try {
    const product = await db.product.findUnique({ where: { id } });
    if (!product) {return res.status(404).render('pages/error', { title: 'Not Found', message: 'Product not found.', status: 404 });}
    const categories = JSON.parse(product.categories || '[]').join(', ');
    res.render('pages/admin/product-form', {
      title: `Edit: ${product.title}`, product: { ...product, categoriesStr: categories }, errors: [], old: {},
    });
  } catch (err) {
    logger.error({ err }, 'Show edit product error');
    res.status(500).render('pages/error', { title: 'Error', message: 'Could not load product.', status: 500 });
  }
}

async function updateProduct(req, res) {
  const errors = validationResult(req);
  const db = getDb();
  const { id } = req.params;

  if (!errors.isEmpty()) {
    const product = await db.product.findUnique({ where: { id } });
    return res.status(422).render('pages/admin/product-form', {
      title: `Edit Product`, product, errors: errors.array(), old: req.body,
    });
  }

  const { title, slug, description, price, stock, categories, featured } = req.body;
  try {
    await db.product.update({
      where: { id },
      data: {
        title: title.trim(),
        slug: slug.trim(),
        description: description || '',
        price: parseInt(price, 10),
        stock: parseInt(stock, 10),
        categories: JSON.stringify(
          (categories || '').split(',').map((c) => c.trim()).filter(Boolean)
        ),
        featured: featured === 'on' || featured === 'true',
      },
    });
    req.flash('success', 'Product updated.');
    res.redirect('/admin/products');
  } catch (err) {
    logger.error({ err }, 'Update product error');
    res.status(500).render('pages/error', { title: 'Error', message: 'Could not update product.', status: 500 });
  }
}

async function deleteProduct(req, res) {
  const db = getDb();
  const { id } = req.params;
  try {
    await db.product.delete({ where: { id } });
    req.flash('success', 'Product deleted.');
  } catch (err) {
    logger.error({ err }, 'Delete product error');
    req.flash('error', 'Could not delete product.');
  }
  res.redirect('/admin/products');
}

// ─── Orders ────────────────────────────────────────────────────────────────────
async function listAdminOrders(req, res) {
  const db = getDb();
  try {
    const orders = await db.order.findMany({
      include: { user: { select: { email: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });
    const parsed = orders.map((o) => ({ ...o, totalFormatted: formatPrice(o.total), items: JSON.parse(o.items || '[]') }));
    res.render('pages/admin/orders', { title: 'All Orders', orders: parsed });
  } catch (err) {
    logger.error({ err }, 'Admin list orders error');
    res.status(500).render('pages/error', { title: 'Error', message: 'Could not load orders.', status: 500 });
  }
}

module.exports = {
  dashboard,
  listAdminProducts,
  showCreateProduct,
  createProduct,
  showEditProduct,
  updateProduct,
  deleteProduct,
  listAdminOrders,
  productRules,
};
