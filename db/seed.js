/**
 * Seed script for IBD Teal Jewelry database.
 * Inserts sample categories, products, variants, and an admin user.
 *
 * Usage: npm run seed
 */

const db = require('../server/config/db');
const bcrypt = require('bcryptjs');

async function seed() {
    try {
        await db.init();
        // ── Admin User ──────────────────────────────────────────────
        const adminHash = await bcrypt.hash('admin123', 10);
        const existingAdmin = db.prepare('SELECT 1 FROM admin_user WHERE username = ?').get('admin');
        if (!existingAdmin) {
            db.prepare("INSERT INTO admin_user (username, password_hash, role) VALUES (?, ?, 'admin')").run('admin', adminHash);
        }
        console.log('Admin user seeded (admin / admin123)');

        // ── Categories ──────────────────────────────────────────────
        const categories = [
            { name: 'Rings', slug: 'rings' },
            { name: 'Necklaces', slug: 'necklaces' },
            { name: 'Earrings', slug: 'earrings' },
            { name: 'Bracelets', slug: 'bracelets' },
            { name: 'Pendants', slug: 'pendants' }
        ];

        for (var c = 0; c < categories.length; c++) {
            var cat = categories[c];
            var existingCat = db.prepare('SELECT 1 FROM category WHERE slug = ?').get(cat.slug);
            if (!existingCat) {
                db.prepare("INSERT INTO category (name, slug, status) VALUES (?, ?, 'active')").run(cat.name, cat.slug);
            }
        }
        console.log('Categories seeded');

        // ── Helper: get category id by slug ─────────────────────────
        function getCategoryId(slug) {
            var row = db.prepare('SELECT id FROM category WHERE slug = ?').get(slug);
            return row ? row.id : null;
        }

        // ── Products ────────────────────────────────────────────────
        var products = [
            {
                name: 'Eternal Love Diamond Ring',
                description: 'A stunning solitaire diamond ring set in 18K gold. The perfect symbol of eternal love and commitment. Features a brilliant-cut diamond with exceptional clarity.',
                short_description: 'Solitaire diamond ring in 18K gold',
                categories: ['rings'],
                variants: [
                    { sku: 'RING-DIA-YG-6', metal: '18K Yellow Gold', size: '6', weight: 3.5, price: 85000, discount_price: 79999, inventory: 5 },
                    { sku: 'RING-DIA-YG-7', metal: '18K Yellow Gold', size: '7', weight: 3.8, price: 85000, discount_price: 79999, inventory: 8 },
                    { sku: 'RING-DIA-WG-6', metal: '18K White Gold', size: '6', weight: 3.6, price: 89000, discount_price: null, inventory: 3 },
                    { sku: 'RING-DIA-WG-7', metal: '18K White Gold', size: '7', weight: 3.9, price: 89000, discount_price: null, inventory: 6 }
                ]
            },
            {
                name: 'Pearl Drop Necklace',
                description: 'Elegant freshwater pearl necklace with a delicate gold chain. Each pearl is hand-selected for its lustre and shape. A timeless piece that adds sophistication to any outfit.',
                short_description: 'Freshwater pearl necklace with gold chain',
                categories: ['necklaces'],
                variants: [
                    { sku: 'NECK-PRL-YG-16', metal: '14K Yellow Gold', size: '16 inch', weight: 8.2, price: 32000, discount_price: 28999, inventory: 12 },
                    { sku: 'NECK-PRL-YG-18', metal: '14K Yellow Gold', size: '18 inch', weight: 9.0, price: 34000, discount_price: 30999, inventory: 10 },
                    { sku: 'NECK-PRL-RG-18', metal: '14K Rose Gold', size: '18 inch', weight: 9.1, price: 35000, discount_price: null, inventory: 7 }
                ]
            },
            {
                name: 'Sapphire Cluster Earrings',
                description: 'Beautiful cluster earrings featuring natural blue sapphires surrounded by micro-pavé diamonds. Set in platinum for a luxurious finish. Comes with butterfly back closures.',
                short_description: 'Blue sapphire cluster earrings with diamonds',
                categories: ['earrings'],
                variants: [
                    { sku: 'EAR-SAP-PT', metal: 'Platinum', size: 'Standard', weight: 5.4, price: 120000, discount_price: 109999, inventory: 4 },
                    { sku: 'EAR-SAP-WG', metal: '18K White Gold', size: 'Standard', weight: 5.2, price: 95000, discount_price: null, inventory: 6 }
                ]
            },
            {
                name: 'Gold Chain Bracelet',
                description: 'A classic curb-link chain bracelet crafted from solid gold. Features a secure lobster clasp and adjustable length. Perfect for everyday wear or stacking with other bracelets.',
                short_description: 'Classic curb-link gold chain bracelet',
                categories: ['bracelets'],
                variants: [
                    { sku: 'BRC-CHN-YG-7', metal: '22K Yellow Gold', size: '7 inch', weight: 12.5, price: 65000, discount_price: 59999, inventory: 9 },
                    { sku: 'BRC-CHN-YG-8', metal: '22K Yellow Gold', size: '8 inch', weight: 14.0, price: 72000, discount_price: null, inventory: 5 },
                    { sku: 'BRC-CHN-RG-7', metal: '18K Rose Gold', size: '7 inch', weight: 11.8, price: 58000, discount_price: 54999, inventory: 7 }
                ]
            },
            {
                name: 'Ruby Heart Pendant',
                description: 'A romantic heart-shaped pendant featuring a natural Burmese ruby surrounded by a halo of brilliant diamonds. Set in 18K white gold with an adjustable chain.',
                short_description: 'Heart-shaped ruby pendant with diamond halo',
                categories: ['pendants', 'necklaces'],
                variants: [
                    { sku: 'PND-RBY-WG-SM', metal: '18K White Gold', size: 'Small', weight: 4.2, price: 75000, discount_price: 69999, inventory: 6 },
                    { sku: 'PND-RBY-WG-LG', metal: '18K White Gold', size: 'Large', weight: 6.8, price: 110000, discount_price: null, inventory: 3 },
                    { sku: 'PND-RBY-YG-SM', metal: '18K Yellow Gold', size: 'Small', weight: 4.3, price: 74000, discount_price: 68999, inventory: 8 }
                ]
            }
        ];

        var insertProduct = db.prepare("INSERT INTO master_product (name, description, short_description, status) VALUES (?, ?, ?, 'active')");
        var insertVariant = db.prepare("INSERT INTO lot_product (master_product_id, sku, status, metal, size, weight, price, discount_price, inventory) VALUES (?, ?, 'active', ?, ?, ?, ?, ?, ?)");
        var insertImage = db.prepare("INSERT INTO product_image (master_product_id, image_path, alt_text, sort_order, is_primary) VALUES (?, ?, ?, 0, 1)");
        var insertMapping = db.prepare("INSERT OR IGNORE INTO product_category_mapping (category_id, master_product_id) VALUES (?, ?)");

        for (var p = 0; p < products.length; p++) {
            var prod = products[p];
            var existing = db.prepare('SELECT id FROM master_product WHERE name = ?').get(prod.name);

            if (existing) {
                console.log('  Product "' + prod.name + '" already exists (id=' + existing.id + '), skipping insert');
                continue;
            }

            var mpResult = insertProduct.run(prod.name, prod.description, prod.short_description);
            var masterProductId = mpResult.lastInsertRowid;

            for (var v = 0; v < prod.variants.length; v++) {
                var vr = prod.variants[v];
                insertVariant.run(masterProductId, vr.sku, vr.metal, vr.size, vr.weight, vr.price, vr.discount_price, vr.inventory);
            }

            insertImage.run(masterProductId, '/css/placeholder.svg', prod.name);

            for (var ci = 0; ci < prod.categories.length; ci++) {
                var catId = getCategoryId(prod.categories[ci]);
                if (catId) {
                    insertMapping.run(catId, masterProductId);
                }
            }

            console.log('  Product seeded: ' + prod.name + ' (' + prod.variants.length + ' variants)');
        }

        console.log('\nSeed completed successfully!');
    } catch (err) {
        console.error('Seed error:', err);
        process.exit(1);
    }
}

seed();
