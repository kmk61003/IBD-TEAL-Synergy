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

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env: set DATABASE_URL, SESSION_SECRET, CSRF_SECRET, Razorpay keys

# 3. Create database in SQL Server
#    CREATE DATABASE teal_jewellery;

# 4. Run migrations
npm run db:migrate:dev

# 5. Seed sample data (10 products + admin user)
npm run db:seed

# 6. Start dev server
npm run dev
# → http://localhost:3000
```

## Environment Variables

See [`.env.example`](.env.example) for all variables. Key ones:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | Prisma SQL Server connection string |
| `SESSION_SECRET` | ≥32 random chars for session signing |
| `CSRF_SECRET` | ≥32 random chars for CSRF tokens |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | Razorpay keys (test mode) |
| `PAYMENT_PROVIDER` | `razorpay` (default) or `stripe` |
| `DEV_SKIP_EMAIL_VERIFY` | `true` to skip email verification in dev |

## Database

```bash
npm run db:migrate:dev   # Create/apply dev migrations
npm run db:migrate       # Apply existing migrations (production)
npm run db:seed          # Seed 10 products + admin user
npm run db:studio        # Visual DB browser
npm run db:generate      # Regenerate Prisma client
```

### Connection Strings

```bash
# Local (Windows auth):
DATABASE_URL="sqlserver://localhost:1433;database=teal_jewellery;integratedSecurity=true;trustServerCertificate=true"

# Local (SQL auth):
DATABASE_URL="sqlserver://localhost:1433;database=teal_jewellery;user=sa;password=Pass!;trustServerCertificate=true"

# Azure SQL:
DATABASE_URL="sqlserver://<server>.database.windows.net:1433;database=teal_jewellery;user=<user>;password=<pass>;encrypt=true"
```

## Tests

```bash
npm test              # Unit tests (Jest)
npm run test:api      # API integration tests (Jest + Supertest)
npm run test:e2e      # E2E tests (Playwright)
npm run test:ci       # All tests for CI

# First-time Playwright setup:
npx playwright install chromium
```

## Payment Testing

### Razorpay (default)
1. Create account at [razorpay.com](https://razorpay.com), switch to Test Mode
2. Add `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` to `.env`
3. Test card: `4111 1111 1111 1111` | Any future expiry | Any CVV

### Stripe (opt-in)
```bash
PAYMENT_PROVIDER=stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
```
Test card: `4242 4242 4242 4242`

## Admin Panel

After seeding, access `/admin` with:
- **Email**: `admin@teal.dev`
- **Password**: `Admin@12345!`

Change the password immediately in production.

## Security

See [SECURITY.md](SECURITY.md) for the OWASP Top 10 mapping and threat model.

Key controls:
- argon2 password hashing (timeCost 3, memoryCost 64MB)
- CSRF double-submit cookies on all state-changing routes
- Helmet strict CSP (nonce-based, no unsafe-inline)
- Rate limiting: 20/15min auth, 10/min checkout
- Account lockout: 5 failures → 15-min lock
- Sessions: HttpOnly, SameSite=Lax, Secure (prod), rotation on login
- HSTS in production: `max-age=31536000; includeSubDomains; preload`
- All DB queries via Prisma (no raw SQL interpolation)

## Deployment (Azure)

Set these GitHub Secrets:

| Secret | Description |
|--------|-------------|
| `AZURE_WEBAPP_NAME` | App Service name |
| `AZURE_WEBAPP_PUBLISH_PROFILE` | From Azure Portal |
| `DATABASE_URL` | Azure SQL connection string |
| `SESSION_SECRET` | Production session secret (≥64 chars) |
| `CSRF_SECRET` | Production CSRF secret (≥64 chars) |
| `RAZORPAY_*` | Razorpay live credentials |

Push to `main` → CI runs → auto-deploys to Azure App Service with `prisma migrate deploy`.

## API

### `GET /healthz`
```json
{ "status": "ok", "uptime": 123.45, "timestamp": "2025-01-01T00:00:00.000Z" }
```

### `POST /checkout/webhook`
Razorpay/Stripe webhook endpoint. Configure in provider dashboard:
- URL: `https://your-domain.com/checkout/webhook`
- Secret: `RAZORPAY_WEBHOOK_SECRET` / `STRIPE_WEBHOOK_SECRET`
