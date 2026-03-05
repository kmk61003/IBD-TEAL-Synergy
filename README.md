# TEAL Jewellery – Production-Ready E-Commerce Platform

A full-stack, production-grade online jewellery store built with **Node.js (Express)**, **EJS + Bootstrap 5**, **Prisma (SQL Server)**, **Passport** authentication, **Razorpay/Stripe** payments, and comprehensive **OWASP** security hardening.

## Features

- 🛍️ **Product Catalog** – Browse, search, filter by category with pagination
- 🛒 **Shopping Cart** – Server-persisted cart for authenticated users
- 💳 **Payments** – Razorpay (default) with easy Stripe swap via `PAYMENT_PROVIDER=stripe`
- 🔐 **Auth** – Passport local strategy, email verification, secure sessions, brute-force protection
- 👤 **User Orders** – "My Orders" history with receipt view
- 🔧 **Admin Panel** – Products CRUD, orders list (role-based access)
- 🛡️ **Security** – Helmet+CSP, CSRF, rate limiting, argon2 hashing, HSTS
- 📱 **Mobile-First** – Responsive Bootstrap 5 UI with WCAG accessibility
- 🔍 **Observability** – Pino structured logging, `/healthz` endpoint, request IDs
- 🏗️ **CI/CD** – GitHub Actions → Azure App Service + Azure SQL

---

## How to Run

Choose the path that matches your environment:

| | Path | Requirement |
|---|---|---|
| ✅ Easiest | [Option A – Docker Compose](#option-a--docker-compose-recommended) | Docker Desktop |
| 🛠️ Full control | [Option B – Local SQL Server](#option-b--local-sql-server) | SQL Server 2019+ / SQL Server Express |

---

## Option A – Docker Compose (Recommended)

Docker Compose spins up both the Node.js app **and** a SQL Server 2022 Express container.  
No SQL Server installation needed on your machine.

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (Windows/macOS) or Docker Engine + Compose plugin (Linux)
- [Node.js 20+](https://nodejs.org/) (only needed to run `npm install` locally; the app itself runs inside the container)

### Steps

```bash
# 1. Clone the repo (if you haven't already)
git clone https://github.com/kmk61003/IBD-TEAL-Synergy.git
cd IBD-TEAL-Synergy

# 2. Build and start all services (app + SQL Server)
#    First boot downloads the SQL Server image (~1.5 GB) and may take 2–3 minutes.
docker compose up --build

# The app is ready when you see:
#   app  | 🚀 TEAL Jewellery server started  port: 3000

# 3. In a new terminal – run database migrations and seed
docker compose exec app npx prisma migrate deploy
docker compose exec app node prisma/seed.js

# 4. Open the app
#    http://localhost:3000
```

**Admin credentials** (after seed):

| Field | Value |
|-------|-------|
| Email | `admin@teal.dev` |
| Password | `Admin@12345!` |
| URL | <http://localhost:3000/auth/login> |

To stop: `docker compose down`  
To wipe the database volume too: `docker compose down -v`

---

## Option B – Local SQL Server

### Prerequisites

| Tool | Version | Notes |
|------|---------|-------|
| Node.js | 20 LTS | [nodejs.org](https://nodejs.org/) |
| npm | 9+ | Included with Node.js |
| SQL Server | 2019+ | Any edition; [SQL Server Express](https://www.microsoft.com/en-us/sql-server/sql-server-downloads) is free |
| SQL Server TCP/IP | Enabled | See [Enable TCP/IP](#enable-tcpip-on-sql-server-express) below |

### Step 1 – Clone and install

```bash
git clone https://github.com/kmk61003/IBD-TEAL-Synergy.git
cd IBD-TEAL-Synergy
npm install
```

> `npm install` automatically runs `prisma generate` (via `postinstall`).

### Step 2 – Create the database

Open **SQL Server Management Studio (SSMS)** or `sqlcmd` and run:

```sql
CREATE DATABASE teal_jewellery;
```

### Step 3 – Configure environment variables

```bash
cp .env.example .env
```

Open `.env` and update at minimum:

```dotenv
# Choose the right connection string for your SQL Server setup:

# Windows auth (no username/password needed):
DATABASE_URL="sqlserver://localhost:1433;database=teal_jewellery;integratedSecurity=true;trustServerCertificate=true"

# SQL Server auth (sa user):
DATABASE_URL="sqlserver://localhost:1433;database=teal_jewellery;user=sa;password=YourPassword!;trustServerCertificate=true"

# Session and CSRF secrets (any random string ≥ 32 chars):
SESSION_SECRET=any-long-random-string-change-in-prod
CSRF_SECRET=another-long-random-string-change-in-prod

# Skip email verification in local dev:
DEV_SKIP_EMAIL_VERIFY=true
```

> All other variables in `.env.example` have sensible defaults for local development.  
> Payment keys are only required when you test checkout.

### Step 4 – Run migrations and seed

```bash
# Apply the database schema
npm run db:migrate:dev

# Load 10 sample products + admin user
npm run db:seed
```

### Step 5 – Start the development server

```bash
npm run dev
```

You should see:

```
[HH:MM:SS] INFO: 🚀 TEAL Jewellery server started
    port: 3000
    env: "development"
```

Open **<http://localhost:3000>** in your browser.

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

**Default admin account** (created by `npm run db:seed`):

```
Email:    admin@teal.dev
Password: Admin@12345!
```

> ⚠️ Change the admin password immediately in any non-local environment.

---

## NPM Script Reference

```bash
npm run dev           # Start dev server with hot-reload (nodemon)
npm start             # Start production server (node server.js)
npm run lint          # Run ESLint
npm run lint:fix      # Auto-fix lint issues

npm run db:generate   # Regenerate Prisma client (after schema changes)
npm run db:migrate:dev # Create + apply a new migration (dev)
npm run db:migrate    # Apply existing migrations (production/CI)
npm run db:seed       # Seed sample products + admin user
npm run db:studio     # Open Prisma Studio visual DB browser (localhost:5555)

npm test              # Unit tests (Jest)
npm run test:api      # API integration tests (Jest + Supertest)
npm run test:e2e      # End-to-end tests (Playwright)
npm run test:ci       # All tests in CI mode
```

---

## Environment Variables

See [`.env.example`](.env.example) for the full list. Key variables:

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | ✅ | Prisma SQL Server connection string |
| `SESSION_SECRET` | ✅ | ≥ 32 random chars for session signing |
| `CSRF_SECRET` | ✅ | ≥ 32 random chars for CSRF token signing |
| `PORT` | – | Server port (default `3000`) |
| `PAYMENT_PROVIDER` | – | `razorpay` (default) or `stripe` |
| `RAZORPAY_KEY_ID` | For checkout | Razorpay test key ID |
| `RAZORPAY_KEY_SECRET` | For checkout | Razorpay test secret |
| `DEV_SKIP_EMAIL_VERIFY` | – | `true` to skip email verification in dev |
| `SMTP_HOST` / `SMTP_USER` / `SMTP_PASS` | For email | Leave blank to use Ethereal (auto, dev only) |
| `LOG_LEVEL` | – | `debug` (dev) / `info` (prod) |

Generate secure secrets:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

---

## Payment Testing

### Razorpay (default)

1. Sign up at [dashboard.razorpay.com](https://dashboard.razorpay.com) → switch to **Test Mode**
2. Copy **Key ID** and **Key Secret** → add to `.env`:
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
STRIPE_WEBHOOK_SECRET=whsec_...
```

Test card: `4242 4242 4242 4242`

---

## Troubleshooting

### `Error: Can't reach database server at localhost:1433`

- Ensure SQL Server is running and TCP/IP is enabled (see [Enable TCP/IP](#enable-tcpip-on-sql-server-express)).
- Check the port: SQL Server Express named instances sometimes listen on a dynamic port — use **SQL Server Configuration Manager** to confirm.
- Verify your `DATABASE_URL` in `.env`.

### Enable TCP/IP on SQL Server Express

1. Open **SQL Server Configuration Manager** (search in Start Menu)
2. Navigate to **SQL Server Network Configuration → Protocols for SQLEXPRESS**
3. Right-click **TCP/IP** → **Enable**
4. Restart the **SQL Server (SQLEXPRESS)** service

### `@prisma/client did not initialize yet`

Run:

```bash
npm run db:generate
```

### `Cannot find module 'dotenv'` or missing packages

```bash
npm install
```

### Sessions not persisting between requests

Make sure `SESSION_SECRET` is set in `.env` — the server throws on startup if it's missing.

### Email verification link not arriving

Set `DEV_SKIP_EMAIL_VERIFY=true` in `.env` to bypass email verification in development.  
The app uses [Ethereal](https://ethereal.email/) as a catch-all in dev — check the server console for the preview URL printed after registration.

### Port 3000 already in use

```bash
PORT=3001 npm run dev
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 20 |
| Framework | Express 4 |
| Templates | EJS + express-ejs-layouts |
| CSS | Bootstrap 5 (CDN) + custom CSS |
| ORM | Prisma 5 (`provider = "sqlserver"`) |
| Database | SQL Server (Azure SQL / SQL Server Express) |
| Auth | Passport (local), express-session, argon2 |
| Payments | Razorpay SDK (default) / Stripe SDK (opt-in) |
| Security | helmet, csrf-csrf, express-rate-limit, express-validator |
| Logging | pino + pino-http |
| Tests | Jest + Supertest (unit/API), Playwright (e2e) |
| CI/CD | GitHub Actions → Azure App Service |

---

## Project Structure

```
IBD-TEAL-Synergy/
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
│   ├── schema.prisma          # Data models (SQL Server)
│   ├── migrations/            # Migration SQL files
│   └── seed.js                # Sample data + admin user
├── .github/
│   ├── workflows/             # ci.yml, codeql.yml, deploy.yml
│   └── dependabot.yml
├── Dockerfile
├── docker-compose.yml
├── .env.example
└── SECURITY.md                # OWASP Top 10 control mapping
```

---

## Security

See [SECURITY.md](SECURITY.md) for the OWASP Top 10 mapping and full threat model.

Key controls:

- **Passwords**: argon2 (timeCost 3, memoryCost 64 MB) — never stored plain
- **CSRF**: double-submit cookie pattern on every state-changing route
- **Headers**: Helmet strict CSP with per-request nonce; no `unsafe-inline`
- **Rate limits**: 20 req/15 min on auth, 10 req/min on checkout, 60 req/min on API
- **Lockout**: 5 failed logins → 15-min account lock (tracked in DB)
- **Sessions**: HttpOnly, SameSite=Lax, Secure flag (HTTPS), rotation on login
- **HSTS** (production): `max-age=31536000; includeSubDomains; preload`
- **Queries**: all via Prisma — no raw SQL interpolation

---

## Deployment (Azure)

Set these GitHub Secrets in your fork:

| Secret | Description |
|--------|-------------|
| `AZURE_WEBAPP_NAME` | App Service name (from Azure Portal) |
| `AZURE_WEBAPP_PUBLISH_PROFILE` | Publish profile XML (download from Portal) |
| `DATABASE_URL` | Azure SQL connection string |
| `SESSION_SECRET` | Production secret (≥ 64 chars) |
| `CSRF_SECRET` | Production CSRF secret (≥ 64 chars) |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | Razorpay live keys |

Push to `main` → CI runs lint + tests → deploys to Azure App Service and runs `prisma migrate deploy`.

---

## API Reference

### `GET /healthz`

```json
{ "status": "ok", "uptime": 123.45, "timestamp": "2025-01-01T00:00:00.000Z" }
```

### `POST /checkout/webhook`

Razorpay/Stripe webhook endpoint (no auth, validates provider signature).  
Configure the URL in your payment dashboard:

```
https://your-domain.com/checkout/webhook
```
