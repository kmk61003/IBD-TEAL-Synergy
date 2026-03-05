'use strict';

const { getDb } = require('../../lib/db');
const logger = require('../../lib/logger');

const PAGE_SIZE = 12;

async function listProducts(req, res) {
  const db = getDb();
  const page = Math.max(1, parseInt(req.query.page || '1', 10));
  const q = (req.query.q || '').trim();
  const category = (req.query.category || '').trim();

  try {
    const where = {};
    if (q) {
      // Prisma SQL Server: use contains for basic search
      where.OR = [
        { title: { contains: q } },
        { description: { contains: q } },
      ];
    }
    if (category) {
      where.categories = { contains: category };
    }

    const [products, total] = await Promise.all([
      db.product.findMany({
        where,
        orderBy: [{ featured: 'desc' }, { createdAt: 'desc' }],
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
      }),
      db.product.count({ where }),
    ]);

    // Parse JSON fields
    const parsed = products.map(parseProduct);

    const categories = await getCategories(db);

    res.render('pages/catalog/list', {
      title: q ? `Search: "${q}"` : 'All Jewellery',
      products: parsed,
      pagination: { page, total, pages: Math.ceil(total / PAGE_SIZE), pageSize: PAGE_SIZE },
      query: { q, category },
      categories,
    });
  } catch (err) {
    logger.error({ err }, 'Product list error');
    res.status(500).render('pages/error', { title: 'Error', message: 'Could not load products.', status: 500 });
  }
}

async function showProduct(req, res) {
  const db = getDb();
  const { slug } = req.params;

  try {
    const product = await db.product.findUnique({ where: { slug } });
    if (!product) {
      return res.status(404).render('pages/error', { title: 'Not Found', message: 'Product not found.', status: 404 });
    }

    const parsed = parseProduct(product);

    // Fetch related products (same category)
    const catArr = JSON.parse(product.categories || '[]');
    const related = catArr.length > 0
      ? await db.product.findMany({
          where: { id: { not: product.id }, categories: { contains: catArr[0] } },
          take: 4,
          orderBy: { featured: 'desc' },
        })
      : [];

    res.render('pages/catalog/detail', {
      title: parsed.title,
      product: parsed,
      related: related.map(parseProduct),
    });
  } catch (err) {
    logger.error({ err }, 'Product detail error');
    res.status(500).render('pages/error', { title: 'Error', message: 'Could not load product.', status: 500 });
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function parseProduct(p) {
  return {
    ...p,
    images: safeParseJson(p.images, []),
    categories: safeParseJson(p.categories, []),
    priceFormatted: formatPrice(p.price),
  };
}

function safeParseJson(str, fallback) {
  try { return JSON.parse(str); } catch { return fallback; }
}

function formatPrice(minor) {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(minor / 100);
}

async function getCategories(db) {
  const products = await db.product.findMany({ select: { categories: true } });
  const set = new Set();
  for (const p of products) {
    const cats = safeParseJson(p.categories, []);
    cats.forEach((c) => set.add(c));
  }
  return Array.from(set).sort();
}

module.exports = { listProducts, showProduct, parseProduct };
