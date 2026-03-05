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
            // ─── RINGS (4 products) ─────────────────────────────────
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
                name: 'Emerald Halo Ring',
                description: 'A captivating emerald ring encircled by a halo of sparkling diamonds. Set in 18K white gold, this piece showcases a vivid natural Colombian emerald cut to perfection.',
                short_description: 'Colombian emerald ring with diamond halo',
                categories: ['rings'],
                variants: [
                    { sku: 'RING-EMR-WG-5', metal: '18K White Gold', size: '5', weight: 3.2, price: 95000, discount_price: 89999, inventory: 4 },
                    { sku: 'RING-EMR-WG-6', metal: '18K White Gold', size: '6', weight: 3.4, price: 95000, discount_price: 89999, inventory: 6 },
                    { sku: 'RING-EMR-WG-7', metal: '18K White Gold', size: '7', weight: 3.7, price: 95000, discount_price: null, inventory: 5 }
                ]
            },
            {
                name: 'Classic Gold Band',
                description: 'A timeless polished gold band crafted from 22K gold. Its smooth, rounded profile makes it perfect for wedding bands, everyday wear, or stacking with other rings.',
                short_description: 'Polished 22K gold band ring',
                categories: ['rings'],
                variants: [
                    { sku: 'RING-BND-YG-6', metal: '22K Yellow Gold', size: '6', weight: 4.5, price: 35000, discount_price: null, inventory: 15 },
                    { sku: 'RING-BND-YG-7', metal: '22K Yellow Gold', size: '7', weight: 5.0, price: 38000, discount_price: null, inventory: 12 },
                    { sku: 'RING-BND-YG-8', metal: '22K Yellow Gold', size: '8', weight: 5.5, price: 41000, discount_price: null, inventory: 10 },
                    { sku: 'RING-BND-RG-6', metal: '18K Rose Gold', size: '6', weight: 4.2, price: 32000, discount_price: 29999, inventory: 8 }
                ]
            },
            {
                name: 'Vintage Sapphire Ring',
                description: 'An art deco-inspired sapphire ring featuring intricate milgrain detailing and a stunning oval-cut blue sapphire. Crafted in platinum with accent diamonds.',
                short_description: 'Art deco sapphire ring in platinum',
                categories: ['rings'],
                variants: [
                    { sku: 'RING-SAP-PT-5', metal: 'Platinum', size: '5', weight: 4.8, price: 135000, discount_price: 124999, inventory: 2 },
                    { sku: 'RING-SAP-PT-6', metal: 'Platinum', size: '6', weight: 5.1, price: 135000, discount_price: 124999, inventory: 3 },
                    { sku: 'RING-SAP-PT-7', metal: 'Platinum', size: '7', weight: 5.4, price: 135000, discount_price: null, inventory: 4 }
                ]
            },
            // ─── NECKLACES (4 products) ─────────────────────────────
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
                name: 'Diamond Tennis Necklace',
                description: 'A breathtaking tennis necklace featuring a continuous line of brilliant-cut diamonds set in 18K white gold. Total carat weight of 5.0 ct. A showstopper for any occasion.',
                short_description: '5ct diamond tennis necklace in white gold',
                categories: ['necklaces'],
                variants: [
                    { sku: 'NECK-TEN-WG-16', metal: '18K White Gold', size: '16 inch', weight: 18.5, price: 350000, discount_price: 329999, inventory: 2 },
                    { sku: 'NECK-TEN-WG-18', metal: '18K White Gold', size: '18 inch', weight: 20.2, price: 380000, discount_price: null, inventory: 3 }
                ]
            },
            {
                name: 'Gold Layered Chain',
                description: 'A trendy multi-layered gold chain necklace with three distinct chains at different lengths. Each layer features a unique link style for a fashionable layered look.',
                short_description: 'Multi-layer gold chain necklace',
                categories: ['necklaces'],
                variants: [
                    { sku: 'NECK-LAY-YG', metal: '14K Yellow Gold', size: '16-20 inch', weight: 10.5, price: 42000, discount_price: 38999, inventory: 9 },
                    { sku: 'NECK-LAY-RG', metal: '14K Rose Gold', size: '16-20 inch', weight: 10.3, price: 43000, discount_price: null, inventory: 6 }
                ]
            },
            {
                name: 'Choker with Gemstones',
                description: 'A modern choker-style necklace adorned with alternating emeralds and diamonds. Set in 18K yellow gold with an adjustable clasp. Elegant and eye-catching.',
                short_description: 'Emerald and diamond choker in gold',
                categories: ['necklaces'],
                variants: [
                    { sku: 'NECK-CHK-YG-14', metal: '18K Yellow Gold', size: '14 inch', weight: 22.0, price: 180000, discount_price: 169999, inventory: 3 },
                    { sku: 'NECK-CHK-YG-15', metal: '18K Yellow Gold', size: '15 inch', weight: 23.5, price: 190000, discount_price: null, inventory: 2 }
                ]
            },
            // ─── EARRINGS (4 products) ──────────────────────────────
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
                name: 'Diamond Stud Earrings',
                description: 'Classic round brilliant-cut diamond studs, each diamond certified for exceptional cut, colour, and clarity. Set in a secure four-prong setting with screw-back posts.',
                short_description: 'Round brilliant diamond stud earrings',
                categories: ['earrings'],
                variants: [
                    { sku: 'EAR-DIA-WG-50', metal: '18K White Gold', size: '0.50 ct each', weight: 2.0, price: 55000, discount_price: 49999, inventory: 10 },
                    { sku: 'EAR-DIA-WG-100', metal: '18K White Gold', size: '1.00 ct each', weight: 2.8, price: 125000, discount_price: null, inventory: 5 },
                    { sku: 'EAR-DIA-YG-50', metal: '18K Yellow Gold', size: '0.50 ct each', weight: 2.1, price: 54000, discount_price: null, inventory: 7 }
                ]
            },
            {
                name: 'Gold Hoop Earrings',
                description: 'Sleek and modern gold hoop earrings with a polished finish. Available in multiple sizes, these hoops feature a secure click-top closure. Perfect for everyday elegance.',
                short_description: 'Polished gold hoop earrings',
                categories: ['earrings'],
                variants: [
                    { sku: 'EAR-HOP-YG-SM', metal: '14K Yellow Gold', size: 'Small (20mm)', weight: 2.8, price: 18000, discount_price: 15999, inventory: 20 },
                    { sku: 'EAR-HOP-YG-MD', metal: '14K Yellow Gold', size: 'Medium (30mm)', weight: 3.5, price: 22000, discount_price: null, inventory: 15 },
                    { sku: 'EAR-HOP-RG-SM', metal: '14K Rose Gold', size: 'Small (20mm)', weight: 2.9, price: 19000, discount_price: null, inventory: 12 }
                ]
            },
            {
                name: 'Pearl Drop Earrings',
                description: 'Elegant South Sea pearl drop earrings suspended from diamond-set hooks. Each pearl has a beautiful natural lustre with 18K gold findings. Sophisticated and timeless.',
                short_description: 'South Sea pearl drop earrings with diamonds',
                categories: ['earrings'],
                variants: [
                    { sku: 'EAR-PRL-YG', metal: '18K Yellow Gold', size: 'Standard', weight: 6.2, price: 48000, discount_price: 43999, inventory: 8 },
                    { sku: 'EAR-PRL-WG', metal: '18K White Gold', size: 'Standard', weight: 6.0, price: 49000, discount_price: null, inventory: 6 }
                ]
            },
            // ─── BRACELETS (4 products) ─────────────────────────────
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
                name: 'Diamond Tennis Bracelet',
                description: 'A stunning tennis bracelet featuring a continuous row of brilliant-cut diamonds in a channel setting. Crafted in 18K white gold with a secure double-lock clasp.',
                short_description: 'Diamond tennis bracelet in white gold',
                categories: ['bracelets'],
                variants: [
                    { sku: 'BRC-TEN-WG-7', metal: '18K White Gold', size: '7 inch', weight: 15.0, price: 225000, discount_price: 209999, inventory: 3 },
                    { sku: 'BRC-TEN-WG-75', metal: '18K White Gold', size: '7.5 inch', weight: 16.2, price: 240000, discount_price: null, inventory: 2 }
                ]
            },
            {
                name: 'Bangles Set - Traditional',
                description: 'A set of four intricately designed traditional gold bangles with fine filigree work. Crafted from 22K gold with a rich, warm finish. Ideal for festive occasions.',
                short_description: 'Set of 4 traditional filigree gold bangles',
                categories: ['bracelets'],
                variants: [
                    { sku: 'BRC-BNG-YG-SM', metal: '22K Yellow Gold', size: 'Small (2.4)', weight: 32.0, price: 180000, discount_price: 169999, inventory: 4 },
                    { sku: 'BRC-BNG-YG-MD', metal: '22K Yellow Gold', size: 'Medium (2.6)', weight: 35.0, price: 195000, discount_price: null, inventory: 5 },
                    { sku: 'BRC-BNG-YG-LG', metal: '22K Yellow Gold', size: 'Large (2.8)', weight: 38.0, price: 210000, discount_price: null, inventory: 3 }
                ]
            },
            {
                name: 'Charm Bracelet',
                description: 'A delicate chain bracelet with three signature charms — a star, a heart, and a crescent moon. Each charm is set with tiny diamonds. A playful yet elegant accessory.',
                short_description: 'Gold chain bracelet with diamond-set charms',
                categories: ['bracelets'],
                variants: [
                    { sku: 'BRC-CHM-YG-7', metal: '14K Yellow Gold', size: '7 inch', weight: 6.5, price: 28000, discount_price: 25999, inventory: 12 },
                    { sku: 'BRC-CHM-RG-7', metal: '14K Rose Gold', size: '7 inch', weight: 6.4, price: 29000, discount_price: null, inventory: 8 },
                    { sku: 'BRC-CHM-WG-7', metal: '14K White Gold', size: '7 inch', weight: 6.6, price: 29500, discount_price: null, inventory: 10 }
                ]
            },
            // ─── PENDANTS (4 products) ──────────────────────────────
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
            },
            {
                name: 'Solitaire Diamond Pendant',
                description: 'A timeless solitaire pendant with a single brilliant-cut diamond in a bezel setting. Hangs from a fine cable chain. Minimalist luxury at its finest.',
                short_description: 'Bezel-set solitaire diamond pendant',
                categories: ['pendants', 'necklaces'],
                variants: [
                    { sku: 'PND-DIA-WG-25', metal: '18K White Gold', size: '0.25 ct', weight: 2.5, price: 28000, discount_price: 25999, inventory: 10 },
                    { sku: 'PND-DIA-WG-50', metal: '18K White Gold', size: '0.50 ct', weight: 3.0, price: 52000, discount_price: 47999, inventory: 6 },
                    { sku: 'PND-DIA-YG-25', metal: '18K Yellow Gold', size: '0.25 ct', weight: 2.6, price: 27000, discount_price: null, inventory: 9 }
                ]
            },
            {
                name: 'Om Gold Pendant',
                description: 'A beautifully crafted Om symbol pendant in solid gold. Features fine detailing and a polished finish. A meaningful piece that blends spirituality with elegance.',
                short_description: 'Om symbol pendant in solid gold',
                categories: ['pendants'],
                variants: [
                    { sku: 'PND-OM-YG-SM', metal: '22K Yellow Gold', size: 'Small', weight: 3.0, price: 18000, discount_price: null, inventory: 15 },
                    { sku: 'PND-OM-YG-LG', metal: '22K Yellow Gold', size: 'Large', weight: 5.5, price: 32000, discount_price: 29999, inventory: 8 }
                ]
            },
            {
                name: 'Tanzanite Teardrop Pendant',
                description: 'A stunning teardrop-shaped natural tanzanite set in a diamond-accented frame. The vivid violet-blue hue is eye-catching. Comes with an 18-inch cable chain.',
                short_description: 'Tanzanite teardrop pendant with diamonds',
                categories: ['pendants', 'necklaces'],
                variants: [
                    { sku: 'PND-TAN-WG-SM', metal: '18K White Gold', size: 'Small', weight: 3.8, price: 62000, discount_price: 57999, inventory: 5 },
                    { sku: 'PND-TAN-WG-LG', metal: '18K White Gold', size: 'Large', weight: 5.5, price: 98000, discount_price: null, inventory: 3 },
                    { sku: 'PND-TAN-YG-SM', metal: '18K Yellow Gold', size: 'Small', weight: 3.9, price: 61000, discount_price: null, inventory: 7 }
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

            insertImage.run(masterProductId, '/images/default-product.svg', prod.name);

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
