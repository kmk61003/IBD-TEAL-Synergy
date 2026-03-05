'use strict';

const express = require('express');
const methodOverride = require('method-override');
const {
  dashboard,
  listAdminProducts, showCreateProduct, createProduct,
  showEditProduct, updateProduct, deleteProduct,
  listAdminOrders,
  productRules,
} = require('../controllers/adminController');
const { requireAdmin } = require('../../middlewares/guards');
const { doubleCsrfProtection, csrfMiddleware, apiLimiter } = require('../../middlewares/security');

const router = express.Router();

router.use(requireAdmin);
router.use(apiLimiter);
router.use(methodOverride('_method'));
router.use(csrfMiddleware);

router.get('/', dashboard);

// Products
router.get('/products', listAdminProducts);
router.get('/products/new', showCreateProduct);
router.post('/products', doubleCsrfProtection, productRules, createProduct);
router.get('/products/:id/edit', showEditProduct);
router.put('/products/:id', doubleCsrfProtection, productRules, updateProduct);
router.delete('/products/:id', doubleCsrfProtection, deleteProduct);

// Orders
router.get('/orders', listAdminOrders);

module.exports = router;
