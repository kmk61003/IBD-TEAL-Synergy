# Security Policy – TEAL Jewellery Platform

## Threat Model & OWASP Top 10 Controls

This document maps OWASP Top 10 (2021) categories to the controls implemented in this application.

---

### A01 – Broken Access Control

| Control | Implementation |
|---------|---------------|
| Route guards | `requireAuth` / `requireAdmin` middleware on all protected routes |
| Admin role check | `user.role === 'admin'` verified server-side on every admin request |
| Direct object reference | Cart/order queries always scoped to `userId = req.user.id` |
| Method override protection | `method-override` only honoured from `_method` body field (not headers) |
| Open redirect prevention | `next` redirect parameter validated to start with `/` only |

---

### A02 – Cryptographic Failures

| Control | Implementation |
|---------|---------------|
| Password hashing | **argon2** with `timeCost: 3`, `memoryCost: 65536` (64MB RAM) |
| Secure sessions | `express-session` with `httpOnly`, `sameSite: lax`, `secure: true` (prod) |
| Token generation | Email verification tokens use `crypto.randomBytes(32)` |
| TLS in prod | HSTS `max-age=31536000; includeSubDomains; preload` enforced via Helmet |
| Secrets via env | All secrets in environment variables; `.env` is `.gitignore`d |

---

### A03 – Injection

| Control | Implementation |
|---------|---------------|
| SQL injection | All DB access via **Prisma** (parameterized). No raw SQL interpolation |
| XSS | EJS auto-escapes output (`<%= ... %>`). CSP disallows `unsafe-inline` scripts |
| Input validation | **express-validator** on all form inputs (type, length, pattern checks) |

---

### A04 – Insecure Design

| Control | Implementation |
|---------|---------------|
| Payment signature verification | Razorpay HMAC signature verified server-side before marking order PAID |
| Idempotent webhook | Webhook handler checks `order.status !== 'PAID'` before updating |
| Cart scoping | Cart persisted server-side, never trusted from client |
| Order snapshot | Item prices snapshotted at checkout (not re-fetched on payment verify) |

---

### A05 – Security Misconfiguration

| Control | Implementation |
|---------|---------------|
| Helmet | `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin` |
| CSP | Strict nonce-based CSP; allows only self + Razorpay/Stripe/Bootstrap CDN |
| Permissions-Policy | Camera, microphone, geolocation disabled |
| Error messages | Generic error messages returned to clients; details logged server-side via pino |
| Dependency audit | `npm audit --audit-level=high` runs in CI |

---

### A06 – Vulnerable and Outdated Components

| Control | Implementation |
|---------|---------------|
| Lockfile | `package-lock.json` committed |
| Dependabot | `.github/dependabot.yml` configured for weekly npm + Actions updates |
| CI audit | `npm audit` step in `ci.yml` |

---

### A07 – Identification and Authentication Failures

| Control | Implementation |
|---------|---------------|
| Brute-force protection | 5 failed logins → 15-min account lock (tracked in DB) |
| Rate limiting | `express-rate-limit`: 20 req/15min on `/auth/*`; 10 req/min on `/checkout` |
| Session rotation | Session regenerated on successful login (prevents fixation) |
| Session timeout | `rolling: true`, `maxAge: 24h`; idle timeout via rolling cookie |
| Email verification | Account activation via time-limited token (1h expiry) before login allowed |
| Timing attack prevention | Dummy argon2 hash computed even when user not found |

---

### A08 – Software and Data Integrity Failures

| Control | Implementation |
|---------|---------------|
| CSRF | Double-submit cookie pattern via `csrf-csrf` on all state-changing routes |
| Subresource integrity | CDN scripts loaded without SRI tags (TODO: add `integrity` attrs for Bootstrap CDN) |
| Webhook validation | Webhook signatures verified with HMAC before processing |

---

### A09 – Security Logging and Monitoring Failures

| Control | Implementation |
|---------|---------------|
| Structured logging | **pino** with request IDs, log levels, PII redaction |
| PII redaction | `email`, `hashedPassword`, `Authorization`, `cookie` headers are `[REDACTED]` in logs |
| Error logging | All errors logged with `req.id` correlation |
| Audit events | Auth events (login failures, lockouts) logged at `warn` level |

---

### A10 – Server-Side Request Forgery (SSRF)

| Control | Implementation |
|---------|---------------|
| No user-controlled URLs | The application does not fetch user-supplied URLs |
| Webhook source validation | Signature verification prevents spoofed webhooks |

---

## Reporting a Vulnerability

Please report security issues privately by emailing `security@teal.dev` rather than opening a public issue.

Include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (optional)

We aim to respond within 48 hours and will coordinate disclosure.

---

## Pending / Known Gaps

- [ ] SRI (Subresource Integrity) hashes for Bootstrap CDN links
- [ ] Redis session store for production (currently MemoryStore)
- [ ] Password reset / forgot password flow
- [ ] Full Playwright e2e for complete checkout + payment + webhook flow
