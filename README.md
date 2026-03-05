# IBD-TEAL-Synergy

This repository is being created for the Microsoft Hackathon.

IBD Teal Jewelry is a full-stack jewelry e-commerce platform built with Node.js, Express, and SQLite.

For a detailed description of how the application works, including flow charts and sequence diagrams, see [DOCUMENTATION.md](./DOCUMENTATION.md).

---

## Getting Started

```bash
# 1. Install dependencies
npm install

# 2. Create a .env file in the project root
#    SESSION_SECRET=<long-random-string>
#    JWT_SECRET=<another-long-random-string>
#    JWT_EXPIRES_IN=24h
#    PORT=3000
#    OPENROUTER_API_KEY=<your-key>   # Optional: enables the AI chatbot

# 3. Seed the database
npm run seed

# 4. Start the development server
npm run dev
# → http://localhost:3000
```

---

## Running Unit Tests

The project uses **Jest** and **Supertest** for unit and API-level testing.

### Run all tests

```bash
npm test
```

### Run all tests with coverage report

```bash
npm run test:coverage
```

### What is tested

| Test Suite | File | Coverage |
|---|---|---|
| `auth` middleware | `tests/middleware/auth.test.js` | JWT validation, missing/expired/invalid tokens |
| `adminAuth` middleware | `tests/middleware/adminAuth.test.js` | Admin JWT, non-admin rejection, missing/expired tokens |
| Customer auth routes | `tests/routes/auth.test.js` | Register (success, duplicate, missing fields), Login (success, wrong password, not found) |
| Category routes | `tests/routes/categories.test.js` | List active categories |
| Product routes | `tests/routes/products.test.js` | List with filters, product detail, bestseller & similar recommendations |
| Cart routes | `tests/routes/cart.test.js` | Get cart, add item, update quantity, remove item, inventory checks |
| Order routes | `tests/routes/orders.test.js` | Place order, empty cart, inventory validation, get order, access control |
| Payment routes | `tests/routes/payment.test.js` | Card/UPI/net banking, already-paid, not-found |
| Account routes | `tests/routes/account.test.js` | Profile get/update, password change, order history, saved items (wishlist) |
| Admin auth routes | `tests/routes/admin/auth.test.js` | Admin login (success, wrong credentials) |
| Admin product routes | `tests/routes/admin/products.test.js` | List, get, create, update, delete, add/update variants |
| Admin category routes | `tests/routes/admin/categories.test.js` | List, create, update, delete |
| Admin order routes | `tests/routes/admin/orders.test.js` | List with filters, get detail, update status |
| Admin dashboard routes | `tests/routes/admin/dashboard.test.js` | Dashboard stats, recent orders, auth guards |

### Test architecture

- Tests live in the `tests/` directory, mirroring the `server/` structure.
- The database (`server/config/db`) is **mocked** in every test — no real SQLite file is read or written during tests.
- `bcryptjs` is mocked for password-related tests so tests run quickly.
- A shared helper at `tests/helpers/dbMock.js` provides `mockPrepare` and common fixtures.
