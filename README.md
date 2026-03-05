# TEAL Jewellery – Hackathon E-Commerce Platform

A full-stack online jewellery store built with **Node.js (Express)**, **EJS + Bootstrap 5**, **Prisma (SQLite)**, **Passport** authentication, and **Razorpay/Stripe** payments.

> **No Docker. No database server. Runs in 4 commands.**

This repository contains **two runnable applications**:

| App | Directory | Stack | Purpose |
|-----|-----------|-------|---------|
| 🖥️ **Express backend** | `/` (root) | Node.js + Express + EJS + Prisma + SQLite | Full-stack SSR store (auth, cart, checkout, admin) |
| ⚛️ **React client** | `client/` | React 18 + React Router + Vite | SPA frontend (product browsing, cart, style advisor) |

---

## ⚡ Quick Start (Local – No Docker Required)

### Prerequisites

- [Node.js 20+](https://nodejs.org/) — that's it. No database to install.

### Steps

```bash
# 1. Clone the repo
git clone https://github.com/kmk61003/IBD-TEAL-Synergy.git
cd IBD-TEAL-Synergy

# 2. Install dependencies
npm install

# 3. Set up environment and database
cp .env.example .env
npm run db:push        # Creates prisma/dev.db (SQLite file) from schema
npm run db:seed        # Loads 10 sample products + admin user

# 4. Start the dev server
npm run dev
```

Open **<http://localhost:3000>** in your browser.

**Admin credentials** (created by seed):

| Field | Value |
|-------|-------|
| Email | `admin@teal.dev` |
| Password | `Admin@12345!` |
| URL | <http://localhost:3000/auth/login> |

> The SQLite database file is stored at `prisma/dev.db` and is gitignored — it lives only on your machine.

---

## Features

- 🛍️ **Product Catalog** – Browse, search, filter by category with pagination
- 🛒 **Shopping Cart** – Server-persisted cart for authenticated users
- 💳 **Payments** – Razorpay (default) with easy Stripe swap via `PAYMENT_PROVIDER=stripe`
- 🔐 **Auth** – Passport local strategy, email verification, secure sessions, brute-force protection
- 👤 **User Orders** – "My Orders" history with receipt view
- 🔧 **Admin Panel** – Products CRUD, orders list (role-based access)
- 🛡️ **Security** – Helmet+CSP, CSRF, rate limiting, argon2 hashing, HSTS
- 📱 **Mobile-First** – Responsive Bootstrap 5 UI with WCAG accessibility

---

## Accessing the Application

| URL | Description |
|-----|-------------|
| <http://localhost:3000> | Home page |
| <http://localhost:3000/catalog> | Product catalog |
| <http://localhost:3000/auth/register> | Create a new user account |
| <http://localhost:3000/auth/login> | Sign in |
| <http://localhost:3000/cart> | Shopping cart (login required) |
| <http://localhost:3000/orders> | My Orders (login required) |
| <http://localhost:3000/admin> | Admin panel (admin role required) |
| <http://localhost:3000/healthz> | Health check endpoint (JSON) |

---

## NPM Script Reference

### Express Backend (root directory)

```bash
npm run dev             # Start dev server with hot-reload (nodemon)
npm start               # Start production server (node server.js)
npm run lint            # Run ESLint

# Database – use db:push for local dev, db:migrate:dev to track schema history
npm run db:push         # ✅ Sync schema → SQLite instantly (recommended for local dev)
npm run db:generate     # Regenerate Prisma client (after schema changes)
npm run db:migrate:dev  # Create a named migration file + apply it (use when you want migration history)
npm run db:seed         # Seed sample products + admin user
npm run db:studio       # Open Prisma Studio visual DB browser (localhost:5555)

npm test                # Unit tests (Jest)
npm run test:api        # API integration tests (Jest + Supertest)
npm run test:e2e        # End-to-end tests (Playwright)
```

### React Client (`client/` directory)

```bash
npm run client:install  # Install client dependencies
npm run client:dev      # Start Vite dev server → http://localhost:5173
npm run client:build    # Build for production → client/dist/

# — or run directly from client/ —
cd client
npm install
npm run dev
```

---

## How to Run: React Client

The `client/` directory is a standalone **React + Vite** SPA. It runs independently from the Express backend and does not require a database.

```bash
# From the repo root:
npm run client:install
npm run client:dev
# → http://localhost:5173
```

| Route | Page |
|-------|------|
| `/` | Home – hero banner + featured products |
| `/collections` | Product catalog with filters |
| `/product/:id` | Product detail |
| `/cart` | Shopping cart |
| `/checkout` | Checkout form |
| `/order-confirmation` | Order confirmation |
| `/style-advisor` | AI style recommendation tool |

---

## Environment Variables

See [`.env.example`](.env.example) for the full list. The defaults in `.env.example` work out-of-the-box for local development.

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `file:./dev.db` | SQLite file path (auto-created) |
| `SESSION_SECRET` | dev string | ≥ 32 chars for session signing |
| `CSRF_SECRET` | dev string | ≥ 32 chars for CSRF token signing |
| `PORT` | `3000` | Server port |
| `DEV_SKIP_EMAIL_VERIFY` | `true` | Skip email verification in dev |
| `PAYMENT_PROVIDER` | `razorpay` | `razorpay` or `stripe` |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | — | Only needed to test checkout |

Generate secure secrets for production:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

---

## Payment Testing

### Razorpay (default)

1. Sign up at [dashboard.razorpay.com](https://dashboard.razorpay.com) → switch to **Test Mode**
2. Add to `.env`:
   ```dotenv
   RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxx
   RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxx
   ```
3. Use test card `4111 1111 1111 1111` | any future expiry | any CVV

### Stripe (opt-in)

```dotenv
PAYMENT_PROVIDER=stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
```

---

## Troubleshooting

### `@prisma/client did not initialize yet`

```bash
npm run db:generate
```

### `Cannot find module 'dotenv'` or missing packages

```bash
npm install
```

### Port 3000 already in use

```bash
PORT=3001 npm run dev
```

### Email verification link not arriving

`DEV_SKIP_EMAIL_VERIFY=true` is set by default in `.env.example` — no email needed in local dev.

### Sessions not persisting

Ensure `.env` exists (`cp .env.example .env`).

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 20 |
| Framework | Express 4 |
| Templates | EJS + express-ejs-layouts |
| CSS | Bootstrap 5 (CDN) + custom CSS |
| ORM | Prisma 5 |
| Database | **SQLite** (file-based, zero install) |
| Auth | Passport (local), express-session, argon2 |
| Payments | Razorpay SDK (default) / Stripe SDK (opt-in) |
| Security | helmet, csrf-csrf, express-rate-limit, express-validator |
| Logging | pino + pino-http |
| Tests | Jest + Supertest (unit/API), Playwright (e2e) |

---

## Project Structure

```
IBD-TEAL-Synergy/
│
│  ── Express Full-Stack Backend ──────────────────────────────────────────────
├── server.js                  # Entry point (graceful shutdown)
├── src/
│   ├── app.js                 # Express factory (middleware + routes)
│   ├── app/
│   │   ├── controllers/       # Business logic per feature
│   │   └── routes/            # Express routers
│   ├── lib/
│   │   ├── db.js              # Prisma singleton
│   │   ├── logger.js          # Pino logger
│   │   ├── mailer.js          # Nodemailer / Ethereal
│   │   └── payments.js        # Razorpay / Stripe abstraction
│   ├── middlewares/
│   │   ├── auth.js            # Passport strategy + brute-force lock
│   │   ├── guards.js          # requireAuth / requireAdmin
│   │   └── security.js        # Helmet, CSRF, rate limiters
│   ├── views/
│   │   ├── layouts/main.ejs   # Bootstrap shell layout
│   │   ├── partials/          # navbar, footer, flash
│   │   └── pages/             # auth, catalog, cart, checkout, orders, admin
│   └── public/css/main.css    # Custom teal theme
├── prisma/
│   ├── schema.prisma          # Data models (SQLite)
│   ├── migrations/            # Migration SQL files
│   └── seed.js                # Sample data + admin user
├── package.json               # Express backend deps + npm scripts
├── .env.example               # Environment variable template
│
│  ── React SPA Client ────────────────────────────────────────────────────────
├── client/
│   ├── package.json           # React + Vite deps + scripts
│   ├── vite.config.js         # Vite configuration
│   ├── index.html             # HTML entry point
│   └── src/
│       ├── main.jsx           # React app entry
│       ├── App.jsx            # Router + layout
│       ├── components/        # Navbar, ProductCard
│       ├── context/           # CartContext (global state)
│       ├── data/products.js   # Static product catalogue
│       ├── pages/             # Home, Collections, ProductDetail, Cart,
│       │                      # Checkout, OrderConfirmation, StyleAdvisor
│       └── services/          # AI style recommender
│
│  ── CI/CD & Docs ────────────────────────────────────────────────────────────
├── .github/
│   └── workflows/             # ci.yml
└── SECURITY.md                # Security notes
```

---

## Security

See [SECURITY.md](SECURITY.md) for details.

Key controls:

- **Passwords**: argon2 (timeCost 3, memoryCost 64 MB) — never stored plain
- **CSRF**: double-submit cookie pattern on every state-changing route
- **Headers**: Helmet strict CSP with per-request nonce
- **Rate limits**: 20 req/15 min on auth, 10 req/min on checkout
- **Lockout**: 5 failed logins → 15-min account lock
