-- =============================================
-- IBD Teal Jewelry - Database Schema (MSSQL)
-- =============================================

-- Create database if not exists
IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = 'ibd_teal_jewelry')
BEGIN
    CREATE DATABASE ibd_teal_jewelry;
END
GO

USE ibd_teal_jewelry;
GO

-- =============================================
-- 1. master_product
-- =============================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'master_product')
BEGIN
    CREATE TABLE master_product (
        id              INT IDENTITY(1,1)   NOT NULL,
        name            NVARCHAR(255)       NOT NULL,
        description     NVARCHAR(MAX)       NULL,
        short_description NVARCHAR(500)     NULL,
        status          VARCHAR(20)         NOT NULL DEFAULT 'active',
        created_at      DATETIME2           NOT NULL DEFAULT GETDATE(),
        updated_at      DATETIME2           NULL,

        CONSTRAINT PK_master_product PRIMARY KEY (id),
        CONSTRAINT CK_master_product_status CHECK (status IN ('active','inactive','deleted'))
    );
END
GO

-- =============================================
-- 2. lot_product
-- =============================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'lot_product')
BEGIN
    CREATE TABLE lot_product (
        id                  INT IDENTITY(1,1)   NOT NULL,
        master_product_id   INT                 NOT NULL,
        sku                 VARCHAR(100)        NOT NULL,
        status              VARCHAR(20)         NOT NULL DEFAULT 'active',
        metal               NVARCHAR(100)       NULL,
        size                NVARCHAR(50)        NULL,
        weight              DECIMAL(10,3)       NULL,
        price               DECIMAL(12,2)       NOT NULL,
        discount_price      DECIMAL(12,2)       NULL,
        inventory           INT                 NOT NULL DEFAULT 0,
        created_at          DATETIME2           NOT NULL DEFAULT GETDATE(),
        updated_at          DATETIME2           NULL,

        CONSTRAINT PK_lot_product PRIMARY KEY (id),
        CONSTRAINT FK_lot_product_master FOREIGN KEY (master_product_id)
            REFERENCES master_product(id),
        CONSTRAINT UQ_lot_product_sku UNIQUE (sku),
        CONSTRAINT CK_lot_product_status CHECK (status IN ('active','inactive','out_of_stock')),
        CONSTRAINT CK_lot_product_price CHECK (price >= 0),
        CONSTRAINT CK_lot_product_discount CHECK (discount_price >= 0),
        CONSTRAINT CK_lot_product_inventory CHECK (inventory >= 0)
    );
END
GO

CREATE NONCLUSTERED INDEX IX_lot_product_master ON lot_product (master_product_id);
GO
CREATE NONCLUSTERED INDEX IX_lot_product_status ON lot_product (status);
GO

-- =============================================
-- 3. product_image
-- =============================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'product_image')
BEGIN
    CREATE TABLE product_image (
        id                  INT IDENTITY(1,1)   NOT NULL,
        master_product_id   INT                 NOT NULL,
        image_path          NVARCHAR(500)       NOT NULL,
        alt_text            NVARCHAR(255)       NULL,
        sort_order          INT                 NOT NULL DEFAULT 0,
        is_primary          BIT                 NOT NULL DEFAULT 0,

        CONSTRAINT PK_product_image PRIMARY KEY (id),
        CONSTRAINT FK_product_image_master FOREIGN KEY (master_product_id)
            REFERENCES master_product(id) ON DELETE CASCADE
    );
END
GO

-- =============================================
-- 4. category
-- =============================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'category')
BEGIN
    CREATE TABLE category (
        id      INT IDENTITY(1,1)   NOT NULL,
        name    NVARCHAR(255)       NOT NULL,
        slug    VARCHAR(255)        NOT NULL,
        status  VARCHAR(20)         NOT NULL DEFAULT 'active',

        CONSTRAINT PK_category PRIMARY KEY (id),
        CONSTRAINT UQ_category_slug UNIQUE (slug),
        CONSTRAINT CK_category_status CHECK (status IN ('active','inactive'))
    );
END
GO

-- =============================================
-- 5. product_category_mapping
-- =============================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'product_category_mapping')
BEGIN
    CREATE TABLE product_category_mapping (
        id                  INT IDENTITY(1,1)   NOT NULL,
        category_id         INT                 NOT NULL,
        master_product_id   INT                 NOT NULL,

        CONSTRAINT PK_product_category_mapping PRIMARY KEY (id),
        CONSTRAINT FK_pcm_category FOREIGN KEY (category_id)
            REFERENCES category(id) ON DELETE CASCADE,
        CONSTRAINT FK_pcm_master_product FOREIGN KEY (master_product_id)
            REFERENCES master_product(id) ON DELETE CASCADE,
        CONSTRAINT UQ_product_category UNIQUE (category_id, master_product_id)
    );
END
GO

-- =============================================
-- 6. customer
-- =============================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'customer')
BEGIN
    CREATE TABLE customer (
        id              INT IDENTITY(1,1)   NOT NULL,
        first_name      NVARCHAR(100)       NOT NULL,
        last_name       NVARCHAR(100)       NULL,
        email           VARCHAR(255)        NOT NULL,
        phone_no        VARCHAR(20)         NULL,
        address         NVARCHAR(MAX)       NULL,
        password_hash   VARCHAR(255)        NOT NULL,
        created_at      DATETIME2           NOT NULL DEFAULT GETDATE(),
        updated_at      DATETIME2           NULL,

        CONSTRAINT PK_customer PRIMARY KEY (id),
        CONSTRAINT UQ_customer_email UNIQUE (email)
    );
END
GO

-- =============================================
-- 7. orders (not "order" - reserved word)
-- =============================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'orders')
BEGIN
    CREATE TABLE orders (
        id                  INT IDENTITY(1,1)   NOT NULL,
        customer_id         INT                 NULL,
        guest_email         VARCHAR(255)        NULL,
        order_number        VARCHAR(50)         NOT NULL,
        bill_fname          NVARCHAR(100)       NOT NULL,
        bill_lname          NVARCHAR(100)       NOT NULL,
        bill_address1       NVARCHAR(500)       NOT NULL,
        bill_country_code   VARCHAR(10)         NOT NULL,
        bill_pincode        VARCHAR(20)         NOT NULL,
        bill_phone          VARCHAR(20)         NOT NULL,
        bill_email          VARCHAR(255)        NOT NULL,
        ship_fname          NVARCHAR(100)       NOT NULL,
        ship_lname          NVARCHAR(100)       NOT NULL,
        ship_address1       NVARCHAR(500)       NOT NULL,
        ship_country_code   VARCHAR(10)         NOT NULL,
        ship_pincode        VARCHAR(20)         NOT NULL,
        ship_phone          VARCHAR(20)         NOT NULL,
        ship_email          VARCHAR(255)        NOT NULL,
        subtotal            DECIMAL(12,2)       NOT NULL DEFAULT 0,
        taxes               DECIMAL(12,2)       NOT NULL DEFAULT 0,
        order_total         DECIMAL(12,2)       NOT NULL DEFAULT 0,
        payment_status      VARCHAR(20)         NOT NULL DEFAULT 'pending',
        order_status        VARCHAR(20)         NOT NULL DEFAULT 'placed',
        payment_method      VARCHAR(50)         NULL,
        created_at          DATETIME2           NOT NULL DEFAULT GETDATE(),
        updated_at          DATETIME2           NULL,

        CONSTRAINT PK_orders PRIMARY KEY (id),
        CONSTRAINT FK_orders_customer FOREIGN KEY (customer_id)
            REFERENCES customer(id),
        CONSTRAINT UQ_orders_number UNIQUE (order_number),
        CONSTRAINT CK_orders_subtotal CHECK (subtotal >= 0),
        CONSTRAINT CK_orders_taxes CHECK (taxes >= 0),
        CONSTRAINT CK_orders_total CHECK (order_total >= 0),
        CONSTRAINT CK_orders_payment_status CHECK (payment_status IN ('pending','paid','failed','refunded')),
        CONSTRAINT CK_orders_order_status CHECK (order_status IN ('placed','confirmed','shipped','delivered','cancelled'))
    );
END
GO

CREATE NONCLUSTERED INDEX IX_orders_customer ON orders (customer_id);
GO
CREATE NONCLUSTERED INDEX IX_orders_status ON orders (order_status);
GO

-- =============================================
-- 8. order_items
-- =============================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'order_items')
BEGIN
    CREATE TABLE order_items (
        id              INT IDENTITY(1,1)   NOT NULL,
        order_id        INT                 NOT NULL,
        lot_product_id  INT                 NOT NULL,
        product_name    NVARCHAR(255)       NOT NULL,
        sku             VARCHAR(100)        NOT NULL,
        metal           NVARCHAR(100)       NULL,
        size            NVARCHAR(50)        NULL,
        weight          DECIMAL(10,3)       NULL,
        quantity        INT                 NOT NULL DEFAULT 1,
        unit_price      DECIMAL(12,2)       NOT NULL,
        total_price     DECIMAL(12,2)       NOT NULL,
        image_path      NVARCHAR(500)       NULL,

        CONSTRAINT PK_order_items PRIMARY KEY (id),
        CONSTRAINT FK_order_items_order FOREIGN KEY (order_id)
            REFERENCES orders(id) ON DELETE CASCADE,
        CONSTRAINT FK_order_items_lot FOREIGN KEY (lot_product_id)
            REFERENCES lot_product(id),
        CONSTRAINT CK_order_items_qty CHECK (quantity > 0),
        CONSTRAINT CK_order_items_unit_price CHECK (unit_price >= 0),
        CONSTRAINT CK_order_items_total CHECK (total_price >= 0)
    );
END
GO

-- =============================================
-- 9. admin_user
-- =============================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'admin_user')
BEGIN
    CREATE TABLE admin_user (
        id              INT IDENTITY(1,1)   NOT NULL,
        username        VARCHAR(100)        NOT NULL,
        password_hash   VARCHAR(255)        NOT NULL,
        role            VARCHAR(20)         NOT NULL DEFAULT 'admin',
        created_at      DATETIME2           NOT NULL DEFAULT GETDATE(),

        CONSTRAINT PK_admin_user PRIMARY KEY (id),
        CONSTRAINT UQ_admin_username UNIQUE (username),
        CONSTRAINT CK_admin_role CHECK (role IN ('admin','editor'))
    );
END
GO

-- =============================================
-- 10. cart
-- =============================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'cart')
BEGIN
    CREATE TABLE cart (
        id              INT IDENTITY(1,1)   NOT NULL,
        customer_id     INT                 NULL,
        session_id      VARCHAR(255)        NULL,
        lot_product_id  INT                 NOT NULL,
        quantity        INT                 NOT NULL DEFAULT 1,
        created_at      DATETIME2           NOT NULL DEFAULT GETDATE(),

        CONSTRAINT PK_cart PRIMARY KEY (id),
        CONSTRAINT FK_cart_customer FOREIGN KEY (customer_id)
            REFERENCES customer(id) ON DELETE CASCADE,
        CONSTRAINT FK_cart_lot FOREIGN KEY (lot_product_id)
            REFERENCES lot_product(id),
        CONSTRAINT CK_cart_qty CHECK (quantity > 0)
    );
END
GO

CREATE NONCLUSTERED INDEX IX_cart_customer ON cart (customer_id);
GO
CREATE NONCLUSTERED INDEX IX_cart_session ON cart (session_id);
GO
