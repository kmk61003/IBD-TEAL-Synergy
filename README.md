# IBD-TEAL-Synergy
This repository is being created for the Microsoft Hackathon

## Running the Application

Install dependencies and start the server:

```bash
npm install
node db/seed.js   # seed the database (first run only)
npm run dev       # starts server on http://localhost:3000
```

## Running the Unit Tests

The project uses [Jest](https://jestjs.io/) and [Supertest](https://github.com/ladjs/supertest) for unit testing.

### Install dependencies (if not done yet)

```bash
npm install
```

### Run all tests

```bash
npm test
```

### Run tests in watch mode (re-runs on file change)

```bash
npm run test:watch
```

### Run tests with coverage report

```bash
npm run test:coverage
```

### What is tested

The test suite covers the following areas of the application:

| Area | Test file | What is covered |
|---|---|---|
| Auth middleware | `tests/middleware/auth.test.js` | Token validation, missing/invalid/expired tokens |
| Admin auth middleware | `tests/middleware/adminAuth.test.js` | Admin token validation, `isAdmin` flag enforcement |
| Auth routes | `tests/routes/auth.test.js` | Register (validation, duplicate email, success) and Login (validation, wrong password, success) |
| Product routes | `tests/routes/products.test.js` | List products (pagination, filters), get product by ID, bestseller recommendations, similar product recommendations |
| Category routes | `tests/routes/categories.test.js` | List active categories, empty result, DB error handling |
| Cart routes | `tests/routes/cart.test.js` | Get cart, add item (validation, inventory checks, update existing), update quantity, remove item |
| Order routes | `tests/routes/orders.test.js` | Create order (validation, empty cart, inventory check, success with order number format), get order by number (access control) |
| Payment routes | `tests/routes/payment.test.js` | Process payment (missing order, not found, already paid, success with correct transaction ID prefix per payment method) |
| Account routes | `tests/routes/account.test.js` | Profile get/update, password change (validation, wrong current password, success), order history, saved items (add/remove/check) |

### Test folder structure

All test files live inside the **`tests/`** folder at the root of the repository, organised into two sub-folders that mirror the `server/` source layout:

```
tests/
├── middleware/
│   ├── auth.test.js          ← customer JWT middleware
│   └── adminAuth.test.js     ← admin JWT middleware
└── routes/
    ├── auth.test.js          ← POST /api/auth/register  &  /login
    ├── products.test.js      ← GET  /api/products  (list, detail, recommendations)
    ├── categories.test.js    ← GET  /api/categories
    ├── cart.test.js          ← GET/POST/PUT/DELETE  /api/cart
    ├── orders.test.js        ← POST/GET  /api/orders
    ├── payment.test.js       ← POST  /api/payment/process
    └── account.test.js       ← GET/PUT/DELETE  /api/account/*
```

Tests follow the naming convention `*.test.js`.

