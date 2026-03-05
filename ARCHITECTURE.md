# IBD Teal Jewelry — Application Architecture

> Branch: `sqllite`  
> Stack: **Node.js · Express · sql.js (SQLite in-process) · Vanilla JS / jQuery frontend**

---

## Table of Contents

1. [Overview](#overview)
2. [Project Structure](#project-structure)
3. [Tech Stack](#tech-stack)
4. [Database Schema](#database-schema)
5. [API Reference](#api-reference)
6. [User Flow Chart](#user-flow-chart)
7. [Sequence Diagrams](#sequence-diagrams)
   - [Customer Registration](#1-customer-registration)
   - [Customer Login](#2-customer-login)
   - [Browse & Search Products](#3-browse--search-products)
   - [Add to Cart](#4-add-to-cart)
   - [Checkout & Place Order](#5-checkout--place-order)
   - [Payment Processing](#6-payment-processing)
   - [Admin Login](#7-admin-login)
   - [Admin Manage Products](#8-admin-manage-products)
   - [Admin Manage Orders](#9-admin-manage-orders)
8. [Authentication Model](#authentication-model)
9. [Running the Application](#running-the-application)

---

## Overview

IBD Teal Jewelry is a full-stack jewelry e-commerce platform built for the Microsoft Hackathon. It provides:

- A **customer-facing storefront** for browsing jewelry, managing a cart, and placing orders.
- A **mock payment flow** that always succeeds (no external payment gateway).
- An **admin panel** for managing products, categories, and orders.

The entire application runs as a single Express server that serves static HTML/JS files and a REST API. The database is a **SQLite file** (`db/jewelry.db`) managed in-process via `sql.js` — no Docker or external database service is required.

---

## Project Structure

```
IBD-TEAL-Synergy/
├── db/
│   ├── jewelry.db          # SQLite database file (auto-created)
│   ├── schema.sql          # Reference DDL
│   └── seed.js             # Seed script (admin user + sample data)
├── public/                 # Static frontend (HTML + CSS + JS)
│   ├── index.html          # Shop homepage
│   ├── pdp.html            # Product detail page
│   ├── cart.html           # Shopping cart
│   ├── checkout.html       # Checkout form
│   ├── login.html          # Customer login / register
│   ├── order-confirmation.html
│   ├── admin/              # Admin panel pages
│   │   ├── login.html
│   │   ├── dashboard.html
│   │   ├── products.html
│   │   ├── categories.html
│   │   └── orders.html
│   ├── css/style.css
│   └── js/                 # Client-side JS
│       ├── api.js          # Fetch wrapper
│       ├── auth.js         # JWT storage & nav update
│       ├── cart.js
│       ├── checkout.js
│       ├── pdp.js
│       └── admin/
│           ├── admin-api.js
│           └── products.js
├── server/
│   ├── index.js            # Express entry point
│   ├── config/db.js        # sql.js wrapper (init, prepare, transaction)
│   ├── middleware/
│   │   ├── auth.js         # JWT guard (customers)
│   │   └── adminAuth.js    # JWT guard (admins, isAdmin flag)
│   └── routes/
│       ├── authRoutes.js       # POST /register, POST /login
│       ├── productRoutes.js    # GET /products, GET /products/:id
│       ├── categoryRoutes.js   # GET /categories
│       ├── cartRoutes.js       # CRUD /cart
│       ├── orderRoutes.js      # POST /orders, GET /orders/:orderNumber
│       ├── paymentRoutes.js    # POST /payment/process
│       └── admin/
│           ├── authRoutes.js       # POST /admin/auth/login
│           ├── productRoutes.js    # CRUD /admin/products + variants
│           ├── categoryRoutes.js   # CRUD /admin/categories
│           ├── orderRoutes.js      # GET/PUT /admin/orders
│           └── dashboardRoutes.js  # GET /admin/dashboard
├── package.json
└── README.md
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js |
| Web framework | Express 4 |
| Database | SQLite via `sql.js` (in-process, no native binary) |
| Authentication | JSON Web Tokens (`jsonwebtoken`) + `bcryptjs` |
| Session | `express-session` (used for guest cart identity) |
| File uploads | `multer` (product images saved to `server/uploads/products/`) |
| Frontend | Vanilla HTML + CSS + jQuery 3.7 |

---

## Database Schema

```mermaid
erDiagram
    master_product {
        INTEGER id PK
        TEXT name
        TEXT description
        TEXT short_description
        TEXT status
        TEXT created_at
        TEXT updated_at
    }

    lot_product {
        INTEGER id PK
        INTEGER master_product_id FK
        TEXT sku
        TEXT status
        TEXT metal
        TEXT size
        REAL weight
        REAL price
        REAL discount_price
        INTEGER inventory
        TEXT created_at
        TEXT updated_at
    }

    product_image {
        INTEGER id PK
        INTEGER master_product_id FK
        TEXT image_path
        TEXT alt_text
        INTEGER sort_order
        INTEGER is_primary
    }

    category {
        INTEGER id PK
        TEXT name
        TEXT slug
        TEXT status
    }

    product_category_mapping {
        INTEGER id PK
        INTEGER category_id FK
        INTEGER master_product_id FK
    }

    customer {
        INTEGER id PK
        TEXT first_name
        TEXT last_name
        TEXT email
        TEXT phone_no
        TEXT address
        TEXT password_hash
        TEXT created_at
        TEXT updated_at
    }

    orders {
        INTEGER id PK
        INTEGER customer_id FK
        TEXT guest_email
        TEXT order_number
        TEXT bill_fname
        TEXT bill_lname
        TEXT bill_address1
        TEXT bill_country_code
        TEXT bill_pincode
        TEXT bill_phone
        TEXT bill_email
        TEXT ship_fname
        TEXT ship_lname
        TEXT ship_address1
        TEXT ship_country_code
        TEXT ship_pincode
        TEXT ship_phone
        TEXT ship_email
        REAL subtotal
        REAL taxes
        REAL order_total
        TEXT payment_status
        TEXT order_status
        TEXT payment_method
        TEXT created_at
        TEXT updated_at
    }

    order_items {
        INTEGER id PK
        INTEGER order_id FK
        INTEGER lot_product_id FK
        TEXT product_name
        TEXT sku
        TEXT metal
        TEXT size
        REAL weight
        INTEGER quantity
        REAL unit_price
        REAL total_price
        TEXT image_path
    }

    cart {
        INTEGER id PK
        INTEGER customer_id FK
        TEXT session_id
        INTEGER lot_product_id FK
        INTEGER quantity
        TEXT created_at
    }

    admin_user {
        INTEGER id PK
        TEXT username
        TEXT password_hash
        TEXT role
        TEXT created_at
    }

    master_product ||--o{ lot_product : "has variants"
    master_product ||--o{ product_image : "has images"
    master_product ||--o{ product_category_mapping : "belongs to"
    category ||--o{ product_category_mapping : "contains"
    customer ||--o{ orders : "places"
    customer ||--o{ cart : "owns"
    orders ||--o{ order_items : "contains"
    lot_product ||--o{ cart : "added to"
    lot_product ||--o{ order_items : "purchased as"
```

---

## API Reference

### Customer Auth — `/api/auth`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/register` | None | Register a new customer account |
| POST | `/api/auth/login` | None | Login; returns JWT |

### Products — `/api/products`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/products` | None | List active products (pagination, category filter, search) |
| GET | `/api/products/:id` | None | Get product detail with variants, images, categories |

### Categories — `/api/categories`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/categories` | None | List active categories |

### Cart — `/api/cart`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/cart` | Optional JWT | Get current cart (by customer or session) |
| POST | `/api/cart` | Optional JWT | Add item to cart |
| PUT | `/api/cart/:id` | Optional JWT | Update item quantity |
| DELETE | `/api/cart/:id` | Optional JWT | Remove item from cart |

### Orders — `/api/orders`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/orders` | Optional JWT | Place order from current cart |
| GET | `/api/orders/:orderNumber` | Optional JWT | Get order details |

### Payment — `/api/payment`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/payment/process` | None | Process mock payment for an order |

### Admin Auth — `/api/admin/auth`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/admin/auth/login` | None | Admin login; returns JWT with `isAdmin: true` |

### Admin Products — `/api/admin/products`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/admin/products` | Admin JWT | List all products |
| GET | `/api/admin/products/:id` | Admin JWT | Get product with variants & images |
| POST | `/api/admin/products` | Admin JWT | Create product (multipart with images) |
| PUT | `/api/admin/products/:id` | Admin JWT | Update product |
| DELETE | `/api/admin/products/:id` | Admin JWT | Soft-delete product |
| POST | `/api/admin/products/:id/variants` | Admin JWT | Add a variant (SKU) |
| PUT | `/api/admin/products/variants/:variantId` | Admin JWT | Update a variant |

### Admin Categories — `/api/admin/categories`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/admin/categories` | Admin JWT | List categories |
| POST | `/api/admin/categories` | Admin JWT | Create category |
| PUT | `/api/admin/categories/:id` | Admin JWT | Update category |
| DELETE | `/api/admin/categories/:id` | Admin JWT | Delete category |

### Admin Orders — `/api/admin/orders`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/admin/orders` | Admin JWT | List all orders (filterable by status) |
| GET | `/api/admin/orders/:id` | Admin JWT | Get order detail |
| PUT | `/api/admin/orders/:id` | Admin JWT | Update order/payment status |

### Admin Dashboard — `/api/admin/dashboard`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/admin/dashboard` | Admin JWT | Aggregated stats + recent orders |

---

## User Flow Chart

The diagram below shows every path a user (customer or admin) can take through the application.

```mermaid
flowchart TD
    A([Visitor arrives at homepage]) --> B[Browse products\n/ filter by category\n/ search]
    B --> C{Select a product}
    C --> D[View Product Detail Page]
    D --> E{Choose variant\nmetal / size / weight}
    E --> F[Add to Cart]
    F --> G{Continue shopping?}
    G -- Yes --> B
    G -- No --> H[View Cart]
    H --> I{Update quantities\nor remove items?}
    I -- Yes --> H
    I -- No --> J{Logged in?}
    J -- No --> K{Guest or Login?}
    K -- Guest --> L[Proceed to Checkout\nas guest]
    K -- Login --> M[Login / Register]
    M --> L
    J -- Yes --> L
    L --> N[Fill Billing &\nShipping Details]
    N --> O[Place Order\nPOST /api/orders]
    O --> P{Cart empty\nor inventory fail?}
    P -- Error --> N
    P -- Success --> Q[Mock Payment\nPOST /api/payment/process]
    Q --> R[Order Confirmation Page\nwith Order Number]
    R --> S([Session ends])

    %% Auth side-paths
    A2([New visitor]) --> REG[Register\nPOST /api/auth/register]
    REG --> JWT1[JWT stored in localStorage]
    JWT1 --> B

    A3([Returning visitor]) --> LOGIN[Login\nPOST /api/auth/login]
    LOGIN --> JWT2[JWT stored in localStorage]
    JWT2 --> B

    %% Admin path
    ADM([Admin navigates to\n/admin/login.html]) --> ALOGIN[Admin Login\nPOST /api/admin/auth/login]
    ALOGIN --> ADASH[Admin Dashboard\nStats + Recent Orders]
    ADASH --> APROD[Manage Products\nCreate / Edit / Delete\nAdd Variants / Upload Images]
    ADASH --> ACAT[Manage Categories\nCreate / Edit / Delete]
    ADASH --> AORD[Manage Orders\nView / Update Status]
```

---

## Sequence Diagrams

### 1. Customer Registration

```mermaid
sequenceDiagram
    participant Browser
    participant Server as Express Server
    participant DB as SQLite DB

    Browser->>Server: POST /api/auth/register\n{first_name, email, password}
    Server->>DB: SELECT id FROM customer WHERE email = ?
    DB-->>Server: null (email not taken)
    Server->>Server: bcrypt.hash(password, 10)
    Server->>DB: INSERT INTO customer (...)
    DB-->>Server: {lastInsertRowid}
    Server->>Server: jwt.sign({id, email})
    Server-->>Browser: 201 {token, customer}
    Browser->>Browser: localStorage.setItem('token', token)
```

### 2. Customer Login

```mermaid
sequenceDiagram
    participant Browser
    participant Server as Express Server
    participant DB as SQLite DB

    Browser->>Server: POST /api/auth/login\n{email, password}
    Server->>DB: SELECT ... FROM customer WHERE email = ?
    DB-->>Server: {id, password_hash, ...}
    Server->>Server: bcrypt.compare(password, password_hash)
    alt Valid credentials
        Server->>Server: jwt.sign({id, email})
        Server-->>Browser: 200 {token, customer}
        Browser->>Browser: localStorage.setItem('token', token)
    else Invalid credentials
        Server-->>Browser: 401 {error: "Invalid email or password."}
    end
```

### 3. Browse & Search Products

```mermaid
sequenceDiagram
    participant Browser
    participant Server as Express Server
    participant DB as SQLite DB

    Browser->>Server: GET /api/categories
    Server->>DB: SELECT ... FROM category WHERE status='active'
    DB-->>Server: [{id, name, slug}, ...]
    Server-->>Browser: 200 [categories]

    Browser->>Server: GET /api/products?page=1&limit=12\n[&category=slug][&search=keyword]
    Server->>DB: SELECT COUNT(*) ... (with filters)
    DB-->>Server: {total}
    Server->>DB: SELECT mp.*, primary_image, min_price ...\nORDER BY created_at DESC LIMIT 12 OFFSET 0
    DB-->>Server: [{product}, ...]
    Server-->>Browser: 200 {products, pagination}
    Browser->>Browser: Render product cards in grid
```

### 4. Add to Cart

```mermaid
sequenceDiagram
    participant Browser
    participant Server as Express Server
    participant DB as SQLite DB

    Browser->>Server: GET /api/products/:id
    Server->>DB: SELECT master_product + variants + images + categories
    DB-->>Server: {product, variants, images, categories}
    Server-->>Browser: 200 product detail

    Browser->>Browser: User selects variant & clicks "Add to Cart"
    Browser->>Server: POST /api/cart\n{lot_product_id, quantity}\nAuthorization: Bearer <token> (optional)

    Server->>Server: optionalAuth — attach req.user if token valid
    Server->>DB: SELECT id, inventory, status FROM lot_product WHERE id = ?
    DB-->>Server: {id, inventory, status}

    alt Sufficient inventory
        alt Item already in cart
            Server->>DB: UPDATE cart SET quantity = newQty WHERE id = ?
        else New item
            Server->>DB: INSERT INTO cart (customer_id|session_id, lot_product_id, quantity)
        end
        DB-->>Server: ok
        Server-->>Browser: 201 {message: "Item added to cart."}
    else Insufficient inventory
        Server-->>Browser: 400 {error: "Insufficient inventory."}
    end
```

### 5. Checkout & Place Order

```mermaid
sequenceDiagram
    participant Browser
    participant Server as Express Server
    participant DB as SQLite DB

    Browser->>Server: POST /api/orders\n{billing fields, shipping fields}\nAuthorization: Bearer <token> (optional)

    Server->>Server: optionalAuth
    Server->>DB: SELECT cart items with lot_product & master_product
    DB-->>Server: [{cart_item}, ...]

    alt Cart is empty
        Server-->>Browser: 400 {error: "Cart is empty."}
    else Cart has items
        Server->>Server: Validate inventory for each item
        Server->>Server: Calculate subtotal, taxes (18%), order_total
        Server->>Server: Generate order number (ORD-YYYYMMDD-XXXX)

        Note over Server,DB: BEGIN TRANSACTION
        Server->>DB: INSERT INTO orders (...)
        DB-->>Server: {lastInsertRowid: orderId}
        loop For each cart item
            Server->>DB: INSERT INTO order_items (...)
            Server->>DB: UPDATE lot_product SET inventory = inventory - qty WHERE id = ?
        end
        Server->>DB: DELETE FROM cart WHERE customer_id|session_id = ?
        Note over Server,DB: COMMIT
        DB-->>Server: ok

        Server-->>Browser: 201 {order_number, order_id, order_total}
        Browser->>Browser: Redirect to order-confirmation.html?order=ORD-...
    end
```

### 6. Payment Processing

```mermaid
sequenceDiagram
    participant Browser
    participant Server as Express Server
    participant DB as SQLite DB

    Note over Browser: Order confirmation page loads\nand automatically processes payment

    Browser->>Server: POST /api/payment/process\n{order_number}
    Server->>DB: SELECT id, payment_status FROM orders WHERE order_number = ?
    DB-->>Server: {id, payment_status: "pending"}

    alt Already paid
        Server-->>Browser: 400 {error: "Order already paid."}
    else Pending
        Server->>Server: Generate mock transactionId\n(MOCK-<timestamp>-<random>)
        Server->>DB: UPDATE orders SET payment_status='paid',\norder_status='confirmed',\nupdated_at=datetime('now') WHERE id = ?
        DB-->>Server: ok
        Server-->>Browser: 200 {success: true, transaction_id, order_number}
        Browser->>Browser: Display order confirmation & transaction ID
    end
```

### 7. Admin Login

```mermaid
sequenceDiagram
    participant AdminBrowser as Admin Browser
    participant Server as Express Server
    participant DB as SQLite DB

    AdminBrowser->>Server: POST /api/admin/auth/login\n{username, password}
    Server->>DB: SELECT id, username, password_hash, role\nFROM admin_user WHERE username = ?
    DB-->>Server: {id, password_hash, role}
    Server->>Server: bcrypt.compare(password, password_hash)
    alt Valid credentials
        Server->>Server: jwt.sign({id, username, role, isAdmin: true})
        Server-->>AdminBrowser: 200 {token, admin}
        AdminBrowser->>AdminBrowser: localStorage.setItem('adminToken', token)
        AdminBrowser->>AdminBrowser: Redirect to /admin/dashboard.html
    else Invalid
        Server-->>AdminBrowser: 401 {error: "Invalid credentials."}
    end
```

### 8. Admin Manage Products

```mermaid
sequenceDiagram
    participant AdminBrowser as Admin Browser
    participant Server as Express Server
    participant DB as SQLite DB
    participant FS as File System

    Note over AdminBrowser: Every request carries\nAuthorization: Bearer <adminToken>

    AdminBrowser->>Server: GET /api/admin/products
    Server->>Server: adminAuth middleware\n(verify JWT, check isAdmin)
    Server->>DB: SELECT master_product with primary_image & variant_count
    DB-->>Server: [{product}, ...]
    Server-->>AdminBrowser: 200 {products, pagination}

    AdminBrowser->>Server: POST /api/admin/products\n(multipart/form-data with images)
    Server->>Server: adminAuth
    Server->>Server: multer — save images to server/uploads/products/
    Server->>FS: Write image files
    Server->>DB: INSERT INTO master_product (name, description, ...)
    DB-->>Server: {lastInsertRowid: productId}
    loop For each uploaded image
        Server->>DB: INSERT INTO product_image (master_product_id, image_path, ...)
    end
    loop For each category_id
        Server->>DB: INSERT INTO product_category_mapping (category_id, master_product_id)
    end
    Server-->>AdminBrowser: 201 {message, id}

    AdminBrowser->>Server: POST /api/admin/products/:id/variants\n{sku, metal, size, price, inventory}
    Server->>Server: adminAuth
    Server->>DB: INSERT INTO lot_product (master_product_id, sku, price, inventory, ...)
    DB-->>Server: {lastInsertRowid}
    Server-->>AdminBrowser: 201 {message, id}
```

### 9. Admin Manage Orders

```mermaid
sequenceDiagram
    participant AdminBrowser as Admin Browser
    participant Server as Express Server
    participant DB as SQLite DB

    AdminBrowser->>Server: GET /api/admin/orders?status=placed
    Server->>Server: adminAuth
    Server->>DB: SELECT orders JOIN customer\nWHERE order_status='placed'\nORDER BY created_at DESC
    DB-->>Server: [{order}, ...]
    Server-->>AdminBrowser: 200 {orders, pagination}

    AdminBrowser->>Server: GET /api/admin/orders/:id
    Server->>Server: adminAuth
    Server->>DB: SELECT order + customer + order_items
    DB-->>Server: {order, items}
    Server-->>AdminBrowser: 200 order detail

    AdminBrowser->>Server: PUT /api/admin/orders/:id\n{order_status: "shipped"}
    Server->>Server: adminAuth
    Server->>DB: UPDATE orders SET order_status='shipped',\nupdated_at=datetime('now') WHERE id = ?
    DB-->>Server: ok
    Server-->>AdminBrowser: 200 {message: "Order updated."}
```

---

## Authentication Model

```mermaid
flowchart LR
    subgraph Customer Auth
        C1[POST /api/auth/register] -->|JWT issued| C2[localStorage: token]
        C3[POST /api/auth/login]    -->|JWT issued| C2
        C2 -->|Authorization: Bearer token| C4[auth.js middleware\nrequired routes]
        C2 -->|Authorization: Bearer token| C5[optionalAuth\ncart & orders]
    end

    subgraph Admin Auth
        A1[POST /api/admin/auth/login] -->|JWT with isAdmin:true| A2[localStorage: adminToken]
        A2 -->|Authorization: Bearer adminToken| A3[adminAuth.js middleware\nall /api/admin/* routes]
    end
```

**JWT payload — customer:**
```json
{ "id": 1, "email": "user@example.com", "iat": ..., "exp": ... }
```

**JWT payload — admin:**
```json
{ "id": 1, "username": "admin", "role": "admin", "isAdmin": true, "iat": ..., "exp": ... }
```

The `adminAuth` middleware checks for the `isAdmin: true` flag and rejects tokens that do not carry it with a `403 Forbidden`.

---

## Running the Application

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env   # or create .env manually — see note below

# 3. Seed the database (creates admin user + sample jewelry)
    npm run seed

# 4. Start the server
    npm run dev
# → http://localhost:3000
```

> **Note:** The sqllite branch does not ship a `.env.example`.  
> Create a `.env` file in the project root with at minimum:
>
> ```ini
> SESSION_SECRET=<long-random-string>
> JWT_SECRET=<another-long-random-string>
> JWT_EXPIRES_IN=24h
> PORT=3000
> ```

The SQLite database file is created automatically at `db/jewelry.db` on first run.

### Default admin credentials (after seeding)

| Field | Value |
|-------|-------|
| Username | `admin` |
| Password | `admin123` |
| Admin URL | `http://localhost:3000/admin/login.html` |
