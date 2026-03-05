/**
 * Seed script for IBD Teal Jewelry database.
 * Inserts sample categories, products, variants, and an admin user.
 *
 * Usage: npm run seed
 */

const sql = require('mssql');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const config = {
    server: process.env.DB_SERVER,
    port: parseInt(process.env.DB_PORT, 10) || 1433,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    options: {
        encrypt: false,
        trustServerCertificate: true
    }
};

async function seed() {
    let pool;
    try {
        pool = await sql.connect(config);
        console.log('Connected to MSSQL');

        // ── Admin User ──────────────────────────────────────────────
        const adminHash = await bcrypt.hash('admin123', 10);
        await pool.request()
            .input('username', sql.VarChar, 'admin')
            .input('password_hash', sql.VarChar, adminHash)
            .query(`
                IF NOT EXISTS (SELECT 1 FROM admin_user WHERE username = @username)
                    INSERT INTO admin_user (username, password_hash, role)
                    VALUES (@username, @password_hash, 'admin');
            `);
        console.log('Admin user seeded (admin / admin123)');

        // ── Categories ──────────────────────────────────────────────
        const categories = [
            { name: 'Rings', slug: 'rings' },
            { name: 'Necklaces', slug: 'necklaces' },
            { name: 'Earrings', slug: 'earrings' },
            { name: 'Bracelets', slug: 'bracelets' },
            { name: 'Pendants', slug: 'pendants' }
        ];

        for (const cat of categories) {
            await pool.request()
                .input('name', sql.NVarChar, cat.name)
                .input('slug', sql.VarChar, cat.slug)
                .query(`
                    IF NOT EXISTS (SELECT 1 FROM category WHERE slug = @slug)
                        INSERT INTO category (name, slug, status) VALUES (@name, @slug, 'active');
                `);
        }
        console.log('Categories seeded');

        // ── Helper: get category id by slug ─────────────────────────
        async function getCategoryId(slug) {
            const result = await pool.request()
                .input('slug', sql.VarChar, slug)
                .query('SELECT id FROM category WHERE slug = @slug');
            return result.recordset[0]?.id;
        }

        // ── Products ────────────────────────────────────────────────
        const products = [
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

        for (const prod of products) {
            // Check if product already exists
            const existing = await pool.request()
                .input('name', sql.NVarChar, prod.name)
                .query('SELECT id FROM master_product WHERE name = @name');

            let masterProductId;

            if (existing.recordset.length > 0) {
                masterProductId = existing.recordset[0].id;
                console.log(`  Product "${prod.name}" already exists (id=${masterProductId}), skipping insert`);
            } else {
                // Insert master product
                const mpResult = await pool.request()
                    .input('name', sql.NVarChar, prod.name)
                    .input('description', sql.NVarChar, prod.description)
                    .input('short_description', sql.NVarChar, prod.short_description)
                    .query(`
                        INSERT INTO master_product (name, description, short_description, status)
                        OUTPUT INSERTED.id
                        VALUES (@name, @description, @short_description, 'active');
                    `);
                masterProductId = mpResult.recordset[0].id;

                // Insert variants
                for (const v of prod.variants) {
                    await pool.request()
                        .input('master_product_id', sql.Int, masterProductId)
                        .input('sku', sql.VarChar, v.sku)
                        .input('metal', sql.NVarChar, v.metal)
                        .input('size', sql.NVarChar, v.size)
                        .input('weight', sql.Decimal(10, 3), v.weight)
                        .input('price', sql.Decimal(12, 2), v.price)
                        .input('discount_price', sql.Decimal(12, 2), v.discount_price)
                        .input('inventory', sql.Int, v.inventory)
                        .query(`
                            INSERT INTO lot_product (master_product_id, sku, status, metal, size, weight, price, discount_price, inventory)
                            VALUES (@master_product_id, @sku, 'active', @metal, @size, @weight, @price, @discount_price, @inventory);
                        `);
                }

                // Insert placeholder image
                await pool.request()
                    .input('master_product_id', sql.Int, masterProductId)
                    .input('image_path', sql.NVarChar, '/css/placeholder.svg')
                    .input('alt_text', sql.NVarChar, prod.name)
                    .query(`
                        INSERT INTO product_image (master_product_id, image_path, alt_text, sort_order, is_primary)
                        VALUES (@master_product_id, @image_path, @alt_text, 0, 1);
                    `);

                // Map categories
                for (const catSlug of prod.categories) {
                    const catId = await getCategoryId(catSlug);
                    if (catId) {
                        await pool.request()
                            .input('category_id', sql.Int, catId)
                            .input('master_product_id', sql.Int, masterProductId)
                            .query(`
                                IF NOT EXISTS (
                                    SELECT 1 FROM product_category_mapping
                                    WHERE category_id = @category_id AND master_product_id = @master_product_id
                                )
                                INSERT INTO product_category_mapping (category_id, master_product_id)
                                VALUES (@category_id, @master_product_id);
                            `);
                    }
                }

                console.log(`  Product seeded: ${prod.name} (${prod.variants.length} variants)`);
            }
        }

        console.log('\nSeed completed successfully!');
    } catch (err) {
        console.error('Seed error:', err);
        process.exit(1);
    } finally {
        if (pool) await pool.close();
    }
}

seed();
