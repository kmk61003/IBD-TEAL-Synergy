'use strict';

const express = require('express');
const { listProducts, showProduct } = require('../controllers/catalogController');

const router = express.Router();

router.get('/', listProducts);
router.get('/:slug', showProduct);

module.exports = router;
