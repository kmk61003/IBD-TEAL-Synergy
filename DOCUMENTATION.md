# IBD Teal Jewelry — Application Documentation

> Branch: `final-1`
> Stack: **Node.js · Express · sql.js (SQLite in-process) · Vanilla JS / jQuery frontend**

---

## Table of Contents

1. [Overview](#overview)
2. [Tech Stack](#tech-stack)
3. [Project Structure](#project-structure)
4. [How the Application Works](#how-the-application-works)
   - [Customer Storefront](#customer-storefront)
   - [Admin Panel](#admin-panel)
   - [AI Chatbot (Teal)](#ai-chatbot-teal)
5. [Database Schema](#database-schema)
6. [API Reference](#api-reference)
7. [User Flow Chart](#user-flow-chart)
8. [Sequence Diagrams](#sequence-diagrams)
   - [Customer Registration](#1-customer-registration)
   - [Customer Login](#2-customer-login)
   - [Browse & Search Products](#3-browse--search-products)
   - [Add to Cart](#4-add-to-cart)
   - [Checkout & Place Order](#5-checkout--place-order)
   - [Payment Processing](#6-payment-processing)
   - [Order Tracking](#7-order-tracking)
   - [Admin Login](#8-admin-login)
   - [Admin Manage Products](#9-admin-manage-products)
   - [Admin Manage Orders](#10-admin-manage-orders)
   - [Account Management](#11-account-management)
   - [AI Chat Assistant](#12-ai-chat-assistant)
9. [Authentication Model](#authentication-model)
10. [Running the Application](#running-the-application)

---

## Overview

**IBD Teal Jewelry** is a full-stack jewelry e-commerce platform. It allows customers to browse, search, and purchase jewelry items online, while giving store administrators tools to manage the catalog and orders.

Key capabilities:

| Feature | Description |
|---|---|
| **Storefront** | Browse and filter jewelry by category or search keyword |
| **Product Detail** | View variants (metal, size, weight), images, and recommendations |
| **Shopping Cart** | Add items for both guests (session-based) and logged-in customers |
| **Checkout** | Enter billing and shipping details; supports guest and authenticated checkout |
| **Payment** | Simulated payment gateway supporting card, UPI, and net banking |
| **Order Tracking** | Look up any order by its order number |
| **Customer Account** | Profile management, order history, and saved items (wishlist) |
| **Admin Panel** | Manage products, categories, and orders through a protected admin UI |
| **AI Chatbot** | "Teal" — an AI shopping assistant powered by OpenRouter (meta-llama/llama-4-maverick) |

The server is a single **Express** process that serves static HTML/JS files and a REST API. The database is a **SQLite file** (`db/jewelry.db`) managed in-process via `sql.js` — no Docker or external database service is required.

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
| AI Chatbot | OpenRouter API (`meta-llama/llama-4-maverick`) |

---

## Project Structure

```
IBD-TEAL-Synergy/
├── db/
│   ├── jewelry.db          # SQLite database file (auto-created on first run)
│   ├── schema.sql          # Reference DDL (MSSQL dialect for documentation)
│   └── seed.js             # Seed script: creates admin user + sample jewelry data
├── public/                 # Static frontend (HTML + CSS + JS)
│   ├── index.html              # Homepage — featured products
│   ├── shop.html               # Full product listing with filters & pagination
│   ├── pdp.html                # Product Detail Page — variants, images, recommendations
│   ├── cart.html               # Shopping cart page
│   ├── checkout.html           # Checkout form (billing & shipping)
│   ├── payment.html            # Payment method selection & mock processing
│   ├── order-confirmation.html # Order success page
│   ├── track-order.html        # Order tracking by order number
│   ├── login.html              # Customer login / register
│   ├── my-account.html         # Account: profile, order history, saved items
│   ├── admin/                  # Admin panel pages (protected by adminToken)
│   │   ├── login.html
│   │   ├── dashboard.html
│   │   ├── products.html
│   │   ├── categories.html
│   │   └── orders.html
│   ├── css/                # Stylesheets
│   └── js/                 # Client-side JavaScript modules
├── server/
│   ├── index.js            # Express entry point — middleware, routes, static files
│   ├── config/db.js        # sql.js wrapper (init, prepare, transaction helpers)
│   ├── middleware/
│   │   ├── auth.js         # JWT guard for customer routes (required)
│   │   └── adminAuth.js    # JWT guard for admin routes (checks isAdmin flag)
│   ├── routes/
│   │   ├── authRoutes.js       # POST /api/auth/register, POST /api/auth/login
│   │   ├── productRoutes.js    # GET /api/products, GET /api/products/:id, recommendations
│   │   ├── categoryRoutes.js   # GET /api/categories
│   │   ├── cartRoutes.js       # CRUD /api/cart (guest + authenticated)
│   │   ├── orderRoutes.js      # POST /api/orders, GET /api/orders/:orderNumber
│   │   ├── paymentRoutes.js    # POST /api/payment/process (mock)
│   │   ├── accountRoutes.js    # Profile, orders, saved items (JWT required)
│   │   ├── chatRoutes.js       # POST /api/chat (AI chatbot)
│   │   └── admin/
│   │       ├── authRoutes.js       # POST /api/admin/auth/login
│   │       ├── productRoutes.js    # Full CRUD + variants + image upload
│   │       ├── categoryRoutes.js   # Full CRUD for categories
│   │       ├── orderRoutes.js      # List & update order/payment status
│   │       └── dashboardRoutes.js  # Aggregated stats + recent orders
│   └── uploads/            # Uploaded product images
├── package.json
└── README.md
```

---

## How the Application Works

### Customer Storefront

1. **Homepage / Shop** — The frontend fetches products from `GET /api/products` (with optional category slug or search keyword) and renders paginated product cards. Categories are loaded via `GET /api/categories` to populate the filter sidebar.

2. **Product Detail Page (PDP)** — Clicking a product calls `GET /api/products/:id`, which returns the product's variants (SKUs with metal, size, weight, price), images, and categories. The server also records a page-view event in `product_view`. Recommendation widgets call the bestsellers and similar-products endpoints.

3. **Cart** — Adding an item sends `POST /api/cart` with the chosen `lot_product_id`. The server checks inventory, then either inserts a new cart row or increments the quantity. Cart rows are keyed to `customer_id` (if a JWT is present) or `session_id` (for guests), allowing seamless guest checkout.

4. **Checkout** — The customer fills in billing and shipping details and submits `POST /api/orders`. The server reads the cart, validates inventory, computes `subtotal + 18% tax = order_total`, generates an order number (`ORD-YYYYMMDD-XXXX`), and runs a SQLite transaction to create the order, insert order items, decrement inventory, and clear the cart. On success, the browser is redirected to the payment page.

5. **Payment** — The payment page shows three mock methods (card, UPI, net banking). On confirmation, `POST /api/payment/process` is called. The server updates the order's `payment_status` to `'paid'` and `order_status` to `'confirmed'`, and returns a fake transaction ID. The browser then redirects to the order confirmation page.

6. **Order Tracking** — Any visitor can look up an order by number via `GET /api/orders/:orderNumber` on the track-order page.

7. **My Account** — Authenticated customers can view/edit their profile, change their password, view their full order history (with item counts), and manage their saved items (wishlist).

### Admin Panel

Admins authenticate at `/admin/login.html`, which calls `POST /api/admin/auth/login`. A JWT with `isAdmin: true` is returned and stored in `localStorage` as `adminToken`. All subsequent admin API calls include this token and are gated by the `adminAuth` middleware.

- **Dashboard** — Aggregated stats (total revenue, orders count, products count) and a list of recent orders.
- **Products** — Full CRUD: create products with image uploads, add/edit variants (SKU, metal, size, weight, price, inventory), soft-delete products.
- **Categories** — Create, rename, and delete jewelry categories; categories are linked to products via a mapping table.
- **Orders** — View all orders (filterable by status), view order details, and update `order_status` (e.g., shipped, delivered, cancelled) or `payment_status`.

### AI Chatbot (Teal)

The embedded chat widget calls `POST /api/chat` with the user's message and conversation history. The server:

1. Loads the full active product catalog from the database.
2. Searches for products matching keywords in the user's message.
3. Builds a system prompt that includes catalog context.
4. Forwards the conversation to the **OpenRouter API** (model: `meta-llama/llama-4-maverick`).
5. Returns the AI reply to the browser.

The chatbot is disabled if `OPENROUTER_API_KEY` is not set in the environment.

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

    saved_item {
        INTEGER id PK
        INTEGER customer_id FK
        INTEGER master_product_id FK
        TEXT created_at
    }

    product_view {
        INTEGER id PK
        INTEGER master_product_id FK
        TEXT viewed_at
    }

    master_product ||--o{ lot_product : "has variants"
    master_product ||--o{ product_image : "has images"
    master_product ||--o{ product_category_mapping : "belongs to"
    category ||--o{ product_category_mapping : "contains"
    customer ||--o{ orders : "places"
    customer ||--o{ cart : "owns"
    customer ||--o{ saved_item : "saves"
    orders ||--o{ order_items : "contains"
    lot_product ||--o{ cart : "added to"
    lot_product ||--o{ order_items : "purchased as"
    master_product ||--o{ saved_item : "saved as"
    master_product ||--o{ product_view : "viewed as"
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
| GET | `/api/products/:id` | None | Get product detail with variants, images, categories; records a page view |
| GET | `/api/products/:id/recommendations/bestsellers` | None | Best-selling products in the same categories (last 30 days) |
| GET | `/api/products/:id/recommendations/similar` | None | Most-viewed products in the same categories (last 30 days) |

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

### Chat — `/api/chat`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/chat` | None | Send message to AI assistant; returns AI reply |

### Customer Account — `/api/account`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/account/profile` | Customer JWT | Get own profile |
| PUT | `/api/account/profile` | Customer JWT | Update name, phone, address |
| PUT | `/api/account/password` | Customer JWT | Change password (requires current password) |
| GET | `/api/account/orders` | Customer JWT | List own orders with item counts |
| GET | `/api/account/orders/:id` | Customer JWT | Get order detail (own orders only) |
| GET | `/api/account/saved` | Customer JWT | List saved/wishlisted products |
| POST | `/api/account/saved` | Customer JWT | Save a product to wishlist |
| DELETE | `/api/account/saved/:productId` | Customer JWT | Remove from wishlist |
| GET | `/api/account/saved/check/:productId` | Customer JWT | Check if a product is saved |

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
    A([Visitor arrives at homepage]) --> B[Browse products\nindex.html / shop.html\nfilter by category or search]
    B --> C{Select a product}
    C --> D[Product Detail Page\npdp.html\nVariants · Images · Recommendations]

    D --> REC{View recommendations?}
    REC -- Bestsellers --> D
    REC -- Similar products --> D

    D --> E{Choose variant\nmetal / size / weight}
    E --> SAVE{Save to wishlist?}
    SAVE -- Yes, if logged in --> WL[POST /api/account/saved\nAdded to Saved Items]
    SAVE -- No --> F
    WL --> F

    E --> F[Add to Cart\nPOST /api/cart]
    F --> G{Continue shopping?}
    G -- Yes --> B
    G -- No --> H[View Cart\ncart.html]

    H --> I{Edit cart?}
    I -- Update qty --> H
    I -- Remove item --> H
    I -- Proceed --> J{Logged in?}

    J -- No --> K{Guest or Login?}
    K -- Guest checkout --> L[Checkout\ncheckout.html]
    K -- Login / Register --> M[login.html\nPOST /api/auth/login\nor POST /api/auth/register]
    M --> JWT1[JWT stored in localStorage]
    JWT1 --> L

    J -- Yes --> L

    L --> N[Fill Billing & Shipping Details]
    N --> O[Place Order\nPOST /api/orders]

    O --> P{Validation}
    P -- Cart empty or\ninventory error --> N
    P -- Success --> Q[Payment Page\npayment.html\nCard / UPI / Net Banking]

    Q --> R[Process Mock Payment\nPOST /api/payment/process]
    R --> S[Order Confirmation\norder-confirmation.html\nOrder Number & Transaction ID]

    S --> T{What next?}
    T -- Continue shopping --> B
    T -- Track order --> TRACK[Track Order\ntrack-order.html\nGET /api/orders/:orderNumber]

    %% Registration entry point
    REG_ENTRY([New visitor]) --> REG[Register\nPOST /api/auth/register]
    REG --> JWT2[JWT stored in localStorage]
    JWT2 --> B

    %% Account management
    ACC_ENTRY([Logged-in customer]) --> ACC[My Account\nmy-account.html]
    ACC --> PROF[View / Edit Profile\nGET · PUT /api/account/profile]
    ACC --> OHISTORY[Order History\nGET /api/account/orders]
    ACC --> SAVED[Saved Items / Wishlist\nGET /api/account/saved]
    ACC --> PWD[Change Password\nPUT /api/account/password]

    %% Admin path
    ADM([Admin navigates to\n/admin/login.html]) --> ALOGIN[Admin Login\nPOST /api/admin/auth/login]
    ALOGIN --> ADASH[Admin Dashboard\nStats · Recent Orders]
    ADASH --> APROD[Manage Products\nCreate / Edit / Delete\nVariants · Image Upload]
    ADASH --> ACAT[Manage Categories\nCreate / Edit / Delete]
    ADASH --> AORD[Manage Orders\nView Detail / Update Status]

    %% AI Chatbot
    CHAT_ENTRY([Any page visitor]) --> CHAT_WIDGET[Open Chat Widget]
    CHAT_WIDGET --> CHAT_MSG[Type message to Teal AI]
    CHAT_MSG --> CHAT_API[POST /api/chat\nOpenRouter LLM call]
    CHAT_API --> CHAT_REPLY[AI response with\nproduct recommendations]
    CHAT_REPLY --> CHAT_MSG
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
    Server->>DB: INSERT INTO customer (first_name, email, password_hash, ...)
    DB-->>Server: {lastInsertRowid: customerId}
    Server->>Server: jwt.sign({id, email}, JWT_SECRET)
    Server-->>Browser: 201 {token, customer: {id, first_name, email}}
    Browser->>Browser: localStorage.setItem('token', token)
```

### 2. Customer Login

```mermaid
sequenceDiagram
    participant Browser
    participant Server as Express Server
    participant DB as SQLite DB

    Browser->>Server: POST /api/auth/login\n{email, password}
    Server->>DB: SELECT id, first_name, email, password_hash FROM customer WHERE email = ?
    DB-->>Server: {id, password_hash, ...}
    Server->>Server: bcrypt.compare(password, password_hash)
    alt Valid credentials
        Server->>Server: jwt.sign({id, email}, JWT_SECRET)
        Server-->>Browser: 200 {token, customer}
        Browser->>Browser: localStorage.setItem('token', token)
        Browser->>Browser: Redirect to homepage or previous page
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
    Server->>DB: SELECT id, name, slug FROM category WHERE status='active'
    DB-->>Server: [{id, name, slug}, ...]
    Server-->>Browser: 200 [categories]
    Browser->>Browser: Render category filter sidebar

    Browser->>Server: GET /api/products?page=1&limit=12\n[&category=rings][&search=gold]
    Server->>DB: SELECT COUNT(*) FROM master_product (with filters)
    DB-->>Server: {total}
    Server->>DB: SELECT mp.id, mp.name, primary_image, min_price ...\nORDER BY created_at DESC LIMIT 12 OFFSET 0
    DB-->>Server: [{product}, ...]
    Server-->>Browser: 200 {products, pagination}
    Browser->>Browser: Render product cards in grid

    Browser->>Server: GET /api/products/:id
    Server->>DB: SELECT master_product, variants, images, categories
    DB-->>Server: {product, variants, images, categories}
    Server->>DB: INSERT INTO product_view (master_product_id)
    Server-->>Browser: 200 product detail
    Browser->>Browser: Render PDP with variant selector
```

### 4. Add to Cart

```mermaid
sequenceDiagram
    participant Browser
    participant Server as Express Server
    participant DB as SQLite DB

    Browser->>Browser: User selects variant & clicks "Add to Cart"
    Browser->>Server: POST /api/cart\n{lot_product_id, quantity: 1}\nAuthorization: Bearer token (optional)

    Server->>Server: optionalAuth — attach req.user if JWT valid
    Note over Server: Cart key = customer_id (if logged in)\nor session_id (if guest)

    Server->>DB: SELECT id, inventory, status FROM lot_product WHERE id = ? AND status='active'
    DB-->>Server: {id, inventory, status}

    alt Sufficient inventory
        alt Item already in cart
            Server->>DB: UPDATE cart SET quantity = existing + new WHERE id = ?
        else New cart item
            Server->>DB: INSERT INTO cart (customer_id|session_id, lot_product_id, quantity)
        end
        DB-->>Server: ok
        Server-->>Browser: 201 {message: "Item added to cart."}
        Browser->>Browser: Update cart badge count
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

    Browser->>Server: POST /api/orders\n{bill_*, ship_*}\nAuthorization: Bearer token (optional)

    Server->>Server: optionalAuth
    Server->>DB: SELECT cart items JOIN lot_product JOIN master_product\nWHERE customer_id = ? OR session_id = ?
    DB-->>Server: [{cart_item with product info}, ...]

    alt Cart is empty
        Server-->>Browser: 400 {error: "Cart is empty."}
    else Cart has items
        Server->>Server: Validate inventory for each item
        alt Any item under-stocked
            Server-->>Browser: 400 {error: "Insufficient inventory for '...'"}
        else All items available
            Server->>Server: Calculate subtotal, taxes (18%), order_total
            Server->>Server: Generate order number: ORD-YYYYMMDD-XXXX

            Note over Server,DB: BEGIN TRANSACTION
            Server->>DB: INSERT INTO orders (customer_id, order_number, billing, shipping, totals, ...)
            DB-->>Server: {lastInsertRowid: orderId}
            loop For each cart item
                Server->>DB: INSERT INTO order_items (orderId, lot_product_id, qty, unit_price, ...)
                Server->>DB: UPDATE lot_product SET inventory = inventory - qty WHERE id = ?
            end
            Server->>DB: DELETE FROM cart WHERE customer_id = ? OR session_id = ?
            Note over Server,DB: COMMIT

            Server-->>Browser: 201 {order_number, order_id, order_total}
            Browser->>Browser: Redirect to /payment.html?order=ORD-...
        end
    end
```

### 6. Payment Processing

```mermaid
sequenceDiagram
    participant Browser
    participant Server as Express Server
    participant DB as SQLite DB

    Note over Browser: Browser loads payment.html?order=ORD-...\nUser selects payment method (card/UPI/net banking)

    Browser->>Server: POST /api/payment/process\n{order_number, payment_method}
    Server->>DB: SELECT id, payment_status FROM orders WHERE order_number = ?
    DB-->>Server: {id, payment_status: "pending"}

    alt Order already paid
        Server-->>Browser: 400 {error: "Order already paid."}
    else Payment pending
        Server->>Server: Generate mock transaction ID\n(TXN|UPI|NB-<timestamp>-<random>)
        Server->>DB: UPDATE orders\nSET payment_status='paid', order_status='confirmed',\npayment_method=?, updated_at=datetime('now')\nWHERE id = ?
        DB-->>Server: ok
        Server-->>Browser: 200 {success: true, transaction_id, order_number}
        Browser->>Browser: Redirect to /order-confirmation.html\nDisplay order number & transaction ID
    end
```

### 7. Order Tracking

```mermaid
sequenceDiagram
    participant Browser
    participant Server as Express Server
    participant DB as SQLite DB

    Browser->>Server: GET /api/orders/:orderNumber\nAuthorization: Bearer token (optional)
    Server->>DB: SELECT * FROM orders WHERE order_number = ?
    DB-->>Server: {order row}

    alt Order not found
        Server-->>Browser: 404 {error: "Order not found."}
    else Order found
        alt Authenticated customer AND order belongs to different customer
            Server-->>Browser: 403 {error: "Access denied."}
        else Access granted (guest or owner)
            Server->>DB: SELECT * FROM order_items WHERE order_id = ?
            DB-->>Server: [{item}, ...]
            Server-->>Browser: 200 {order details + items}
            Browser->>Browser: Display order status, items, and totals
        end
    end
```

### 8. Admin Login

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
        Server->>Server: jwt.sign({id, username, role, isAdmin: true}, JWT_SECRET)
        Server-->>AdminBrowser: 200 {token, admin: {id, username, role}}
        AdminBrowser->>AdminBrowser: localStorage.setItem('adminToken', token)
        AdminBrowser->>AdminBrowser: Redirect to /admin/dashboard.html
    else Invalid credentials
        Server-->>AdminBrowser: 401 {error: "Invalid credentials."}
    end
```

### 9. Admin Manage Products

```mermaid
sequenceDiagram
    participant AdminBrowser as Admin Browser
    participant Server as Express Server
    participant DB as SQLite DB
    participant FS as File System

    Note over AdminBrowser: Every request carries\nAuthorization: Bearer adminToken

    AdminBrowser->>Server: GET /api/admin/products
    Server->>Server: adminAuth — verify JWT & isAdmin flag
    Server->>DB: SELECT master_product with primary_image, variant_count
    DB-->>Server: [{product}, ...]
    Server-->>AdminBrowser: 200 {products, pagination}

    AdminBrowser->>Server: POST /api/admin/products\n(multipart/form-data: name, description, images, category_ids)
    Server->>Server: adminAuth
    Server->>Server: multer — parse uploaded image files
    Server->>FS: Write image files to server/uploads/products/
    Server->>DB: INSERT INTO master_product (name, description, short_description, status)
    DB-->>Server: {lastInsertRowid: productId}
    loop For each uploaded image
        Server->>DB: INSERT INTO product_image (master_product_id, image_path, is_primary, sort_order)
    end
    loop For each category_id
        Server->>DB: INSERT INTO product_category_mapping (category_id, master_product_id)
    end
    Server-->>AdminBrowser: 201 {message: "Product created.", id: productId}

    AdminBrowser->>Server: POST /api/admin/products/:id/variants\n{sku, metal, size, weight, price, discount_price, inventory}
    Server->>Server: adminAuth
    Server->>DB: INSERT INTO lot_product (master_product_id, sku, metal, size, price, inventory, ...)
    DB-->>Server: {lastInsertRowid}
    Server-->>AdminBrowser: 201 {message: "Variant added.", id}
```

### 10. Admin Manage Orders

```mermaid
sequenceDiagram
    participant AdminBrowser as Admin Browser
    participant Server as Express Server
    participant DB as SQLite DB

    AdminBrowser->>Server: GET /api/admin/orders?status=placed&page=1
    Server->>Server: adminAuth
    Server->>DB: SELECT orders LEFT JOIN customer\nWHERE order_status = 'placed'\nORDER BY created_at DESC LIMIT 20 OFFSET 0
    DB-->>Server: [{order with customer info}, ...]
    Server-->>AdminBrowser: 200 {orders, pagination}

    AdminBrowser->>Server: GET /api/admin/orders/:id
    Server->>Server: adminAuth
    Server->>DB: SELECT order details + customer + order_items
    DB-->>Server: {order, customer, items}
    Server-->>AdminBrowser: 200 order detail

    AdminBrowser->>Server: PUT /api/admin/orders/:id\n{order_status: "shipped"}
    Server->>Server: adminAuth
    Server->>DB: UPDATE orders\nSET order_status='shipped', updated_at=datetime('now')\nWHERE id = ?
    DB-->>Server: ok
    Server-->>AdminBrowser: 200 {message: "Order updated."}
```

### 11. Account Management

```mermaid
sequenceDiagram
    participant Browser
    participant Server as Express Server
    participant DB as SQLite DB

    Note over Browser: Every request carries\nAuthorization: Bearer customerToken

    Browser->>Server: GET /api/account/profile
    Server->>Server: auth middleware — verify JWT
    Server->>DB: SELECT id, first_name, last_name, email, phone_no, address, created_at\nFROM customer WHERE id = ?
    DB-->>Server: {profile}
    Server-->>Browser: 200 {profile}

    Browser->>Server: PUT /api/account/profile\n{first_name, last_name, phone_no, address}
    Server->>Server: auth middleware
    Server->>DB: UPDATE customer SET first_name=?, ..., updated_at=datetime('now') WHERE id = ?
    DB-->>Server: ok
    Server-->>Browser: 200 {message: "Profile updated."}

    Browser->>Server: GET /api/account/orders
    Server->>Server: auth middleware
    Server->>DB: SELECT id, order_number, order_total, order_status, payment_status, created_at\nFROM orders WHERE customer_id = ? ORDER BY created_at DESC
    DB-->>Server: [{order}, ...]
    loop For each order
        Server->>DB: SELECT COUNT(*) as cnt FROM order_items WHERE order_id = ?
        DB-->>Server: {cnt}
    end
    Server-->>Browser: 200 [{order with item_count}, ...]

    Browser->>Server: POST /api/account/saved\n{master_product_id}
    Server->>Server: auth middleware
    Server->>DB: INSERT INTO saved_item (customer_id, master_product_id)
    DB-->>Server: {lastInsertRowid}
    Server-->>Browser: 201 {message: "Item saved.", id}
```

### 12. AI Chat Assistant

```mermaid
sequenceDiagram
    participant Browser
    participant Server as Express Server
    participant DB as SQLite DB
    participant AI as OpenRouter API

    Browser->>Server: POST /api/chat\n{message: "show me gold rings under ₹5000", history: [...]}

    Server->>DB: SELECT active products (id, name, categories, price, metals, description)
    DB-->>Server: full catalog
    Server->>DB: Search products matching keywords in message
    DB-->>Server: relevant product matches

    Server->>Server: Build system prompt with catalog context\nand conversation history (last 10 messages)

    Server->>AI: POST openrouter.ai/api/v1/chat/completions\nmodel: meta-llama/llama-4-maverick\nmessages: [system+catalog, ...history, user message]
    AI-->>Server: {choices: [{message: {content: "AI reply"}}]}

    Server-->>Browser: 200 {reply: "Here are some gold rings..."}
    Browser->>Browser: Render AI reply in chat widget\nParse product links (format: **[Name]** - ₹price \{\{PRODUCT:id\}\})
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
        C4 --> C6[/api/account/*\nProfile · Orders · Saved Items]
    end

    subgraph Admin Auth
        A1[POST /api/admin/auth/login] -->|JWT with isAdmin:true| A2[localStorage: adminToken]
        A2 -->|Authorization: Bearer adminToken| A3[adminAuth.js middleware\nall /api/admin/* routes]
        A3 --> A4[Admin Products · Categories · Orders · Dashboard]
    end
```

**JWT payload — customer:**
```json
{ "id": 1, "email": "user@example.com", "iat": 1700000000, "exp": 1700086400 }
```

**JWT payload — admin:**
```json
{ "id": 1, "username": "admin", "role": "admin", "isAdmin": true, "iat": 1700000000, "exp": 1700086400 }
```

The `adminAuth` middleware checks for the `isAdmin: true` flag and rejects any token that does not carry it with a `403 Forbidden` response.

---

## Running the Application

```bash
# 1. Install dependencies
npm install

# 2. Create environment file
# Create a .env file in the project root:
# SESSION_SECRET=<long-random-string>
# JWT_SECRET=<another-long-random-string>
# JWT_EXPIRES_IN=24h
# PORT=3000
# OPENROUTER_API_KEY=<your-key>   # Optional: enables the AI chatbot

# 3. Seed the database (creates admin user + sample jewelry data)
npm run seed

# 4. Start the server
npm run dev
# → http://localhost:3000
```

### Application URLs

| URL | Description |
|-----|-------------|
| `http://localhost:3000/` | Customer homepage |
| `http://localhost:3000/shop.html` | Product listing |
| `http://localhost:3000/pdp.html?id=1` | Product detail |
| `http://localhost:3000/cart.html` | Shopping cart |
| `http://localhost:3000/checkout.html` | Checkout |
| `http://localhost:3000/payment.html?order=ORD-...` | Payment |
| `http://localhost:3000/order-confirmation.html` | Order success |
| `http://localhost:3000/track-order.html` | Track order |
| `http://localhost:3000/login.html` | Customer login / register |
| `http://localhost:3000/my-account.html` | Customer account |
| `http://localhost:3000/admin/login.html` | Admin login |
| `http://localhost:3000/admin/dashboard.html` | Admin dashboard |

### Default Admin Credentials (after seeding)

| Field | Value |
|-------|-------|
| Username | `admin` |
| Password | `admin123` |
| Admin URL | `http://localhost:3000/admin/login.html` |
