var initSqlJs = require('sql.js');
var fs = require('fs');
var path = require('path');

var dbPath = path.join(__dirname, '..', '..', 'db', 'jewelry.db');
var _db = null;
var _inTransaction = false;

function save() {
    if (_inTransaction) return;
    var data = _db.export();
    var buffer = Buffer.from(data);
    fs.writeFileSync(dbPath, buffer);
}

var SCHEMA = "\
  CREATE TABLE IF NOT EXISTS master_product (\
    id INTEGER PRIMARY KEY AUTOINCREMENT,\
    name TEXT NOT NULL,\
    description TEXT,\
    short_description TEXT,\
    status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','inactive','deleted')),\
    created_at TEXT NOT NULL DEFAULT (datetime('now')),\
    updated_at TEXT\
  );\
  CREATE TABLE IF NOT EXISTS lot_product (\
    id INTEGER PRIMARY KEY AUTOINCREMENT,\
    master_product_id INTEGER NOT NULL REFERENCES master_product(id),\
    sku TEXT NOT NULL UNIQUE,\
    status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','inactive','out_of_stock')),\
    metal TEXT,\
    size TEXT,\
    weight REAL,\
    price REAL NOT NULL CHECK(price >= 0),\
    discount_price REAL CHECK(discount_price IS NULL OR discount_price >= 0),\
    inventory INTEGER NOT NULL DEFAULT 0 CHECK(inventory >= 0),\
    created_at TEXT NOT NULL DEFAULT (datetime('now')),\
    updated_at TEXT\
  );\
  CREATE TABLE IF NOT EXISTS product_image (\
    id INTEGER PRIMARY KEY AUTOINCREMENT,\
    master_product_id INTEGER NOT NULL REFERENCES master_product(id) ON DELETE CASCADE,\
    image_path TEXT NOT NULL,\
    alt_text TEXT,\
    sort_order INTEGER NOT NULL DEFAULT 0,\
    is_primary INTEGER NOT NULL DEFAULT 0\
  );\
  CREATE TABLE IF NOT EXISTS category (\
    id INTEGER PRIMARY KEY AUTOINCREMENT,\
    name TEXT NOT NULL,\
    slug TEXT NOT NULL UNIQUE,\
    status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','inactive'))\
  );\
  CREATE TABLE IF NOT EXISTS product_category_mapping (\
    id INTEGER PRIMARY KEY AUTOINCREMENT,\
    category_id INTEGER NOT NULL REFERENCES category(id) ON DELETE CASCADE,\
    master_product_id INTEGER NOT NULL REFERENCES master_product(id) ON DELETE CASCADE,\
    UNIQUE(category_id, master_product_id)\
  );\
  CREATE TABLE IF NOT EXISTS customer (\
    id INTEGER PRIMARY KEY AUTOINCREMENT,\
    first_name TEXT NOT NULL,\
    last_name TEXT,\
    email TEXT NOT NULL UNIQUE,\
    phone_no TEXT,\
    address TEXT,\
    password_hash TEXT NOT NULL,\
    created_at TEXT NOT NULL DEFAULT (datetime('now')),\
    updated_at TEXT\
  );\
  CREATE TABLE IF NOT EXISTS orders (\
    id INTEGER PRIMARY KEY AUTOINCREMENT,\
    customer_id INTEGER REFERENCES customer(id),\
    guest_email TEXT,\
    order_number TEXT NOT NULL UNIQUE,\
    bill_fname TEXT NOT NULL,\
    bill_lname TEXT NOT NULL,\
    bill_address1 TEXT NOT NULL,\
    bill_country_code TEXT NOT NULL,\
    bill_pincode TEXT NOT NULL,\
    bill_phone TEXT NOT NULL,\
    bill_email TEXT NOT NULL,\
    ship_fname TEXT NOT NULL,\
    ship_lname TEXT NOT NULL,\
    ship_address1 TEXT NOT NULL,\
    ship_country_code TEXT NOT NULL,\
    ship_pincode TEXT NOT NULL,\
    ship_phone TEXT NOT NULL,\
    ship_email TEXT NOT NULL,\
    subtotal REAL NOT NULL DEFAULT 0 CHECK(subtotal >= 0),\
    taxes REAL NOT NULL DEFAULT 0 CHECK(taxes >= 0),\
    order_total REAL NOT NULL DEFAULT 0 CHECK(order_total >= 0),\
    payment_status TEXT NOT NULL DEFAULT 'pending' CHECK(payment_status IN ('pending','paid','failed','refunded')),\
    order_status TEXT NOT NULL DEFAULT 'placed' CHECK(order_status IN ('placed','confirmed','shipped','delivered','cancelled')),\
    payment_method TEXT,\
    created_at TEXT NOT NULL DEFAULT (datetime('now')),\
    updated_at TEXT\
  );\
  CREATE TABLE IF NOT EXISTS order_items (\
    id INTEGER PRIMARY KEY AUTOINCREMENT,\
    order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,\
    lot_product_id INTEGER NOT NULL REFERENCES lot_product(id),\
    product_name TEXT NOT NULL,\
    sku TEXT NOT NULL,\
    metal TEXT,\
    size TEXT,\
    weight REAL,\
    quantity INTEGER NOT NULL DEFAULT 1 CHECK(quantity > 0),\
    unit_price REAL NOT NULL CHECK(unit_price >= 0),\
    total_price REAL NOT NULL CHECK(total_price >= 0),\
    image_path TEXT\
  );\
  CREATE TABLE IF NOT EXISTS admin_user (\
    id INTEGER PRIMARY KEY AUTOINCREMENT,\
    username TEXT NOT NULL UNIQUE,\
    password_hash TEXT NOT NULL,\
    role TEXT NOT NULL DEFAULT 'admin' CHECK(role IN ('admin','editor')),\
    created_at TEXT NOT NULL DEFAULT (datetime('now'))\
  );\
  CREATE TABLE IF NOT EXISTS cart (\
    id INTEGER PRIMARY KEY AUTOINCREMENT,\
    customer_id INTEGER REFERENCES customer(id) ON DELETE CASCADE,\
    session_id TEXT,\
    lot_product_id INTEGER NOT NULL REFERENCES lot_product(id),\
    quantity INTEGER NOT NULL DEFAULT 1 CHECK(quantity > 0),\
    created_at TEXT NOT NULL DEFAULT (datetime('now'))\
  );\
";

var wrapper = {
    init: function() {
        return initSqlJs().then(function(SQL) {
            if (fs.existsSync(dbPath)) {
                var fileBuffer = fs.readFileSync(dbPath);
                _db = new SQL.Database(fileBuffer);
            } else {
                _db = new SQL.Database();
            }
            _db.run("PRAGMA foreign_keys = ON");
            _db.exec(SCHEMA);
            save();
            console.log('SQLite database ready at', dbPath);
            return wrapper;
        });
    },

    prepare: function(sql) {
        return {
            get: function() {
                var params = Array.prototype.slice.call(arguments);
                var stmt = _db.prepare(sql);
                if (params.length > 0) stmt.bind(params);
                var result;
                if (stmt.step()) {
                    result = stmt.getAsObject();
                }
                stmt.free();
                return result;
            },
            all: function() {
                var params = Array.prototype.slice.call(arguments);
                var stmt = _db.prepare(sql);
                if (params.length > 0) stmt.bind(params);
                var results = [];
                while (stmt.step()) {
                    results.push(stmt.getAsObject());
                }
                stmt.free();
                return results;
            },
            run: function() {
                var params = Array.prototype.slice.call(arguments);
                if (params.length > 0) {
                    _db.run(sql, params);
                } else {
                    _db.run(sql);
                }
                var lastIdResult = _db.exec("SELECT last_insert_rowid() as id");
                var lastInsertRowid = lastIdResult.length > 0 ? lastIdResult[0].values[0][0] : 0;
                var changes = _db.getRowsModified();
                if (!_inTransaction) save();
                return { lastInsertRowid: lastInsertRowid, changes: changes };
            }
        };
    },

    exec: function(sql) {
        _db.exec(sql);
        if (!_inTransaction) save();
    },

    pragma: function(str) {
        _db.run("PRAGMA " + str);
    },

    transaction: function(fn) {
        return function() {
            _inTransaction = true;
            _db.run("BEGIN TRANSACTION");
            try {
                var result = fn.apply(null, arguments);
                _db.run("COMMIT");
                _inTransaction = false;
                save();
                return result;
            } catch (err) {
                _db.run("ROLLBACK");
                _inTransaction = false;
                throw err;
            }
        };
    }
};

module.exports = wrapper;
