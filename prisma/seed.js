/**
 * Prisma seed script – populates sample products and an admin user.
 * Run:  npm run db:seed
 */
'use strict';

const { PrismaClient } = require('@prisma/client');
const argon2 = require('argon2');
const { v4: uuidv4 } = require('uuid');

const prisma = new PrismaClient();

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@teal.dev';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin@12345!';

const products = [
  {
    title: 'Eternal Teal Diamond Ring',
    slug: 'eternal-teal-diamond-ring',
    description: 'A breathtaking 18k white gold ring set with a 1ct teal diamond and pavé surround. Handcrafted by master jewellers.',
    price: 129900, // £1,299 in pence
    stock: 5,
    images: JSON.stringify(['/img/products/ring-teal-diamond.jpg']),
    categories: JSON.stringify(['Rings', 'Diamonds', 'Teal Collection']),
    featured: true,
  },
  {
    title: 'Minimalist Gold Band',
    slug: 'minimalist-gold-band',
    description: 'A sleek 18k yellow gold band with a brushed finish. Perfect as a wedding band or everyday statement.',
    price: 39900, // £399
    stock: 15,
    images: JSON.stringify(['/img/products/ring-gold-band.jpg']),
    categories: JSON.stringify(['Rings', 'Gold', 'Modern Minimal']),
    featured: false,
  },
  {
    title: 'Art Deco Emerald Ring',
    slug: 'art-deco-emerald-ring',
    description: 'Inspired by the 1920s, this 18k gold ring features a 2ct Colombian emerald flanked by baguette diamonds.',
    price: 219900,
    stock: 3,
    images: JSON.stringify(['/img/products/ring-emerald.jpg']),
    categories: JSON.stringify(['Rings', 'Emerald', 'Classic Elegance']),
    featured: true,
  },
  {
    title: 'Rose Gold Twisted Band',
    slug: 'rose-gold-twisted-band',
    description: 'A delicate 14k rose gold twisted rope band – effortlessly romantic for everyday wear.',
    price: 54900,
    stock: 20,
    images: JSON.stringify(['/img/products/ring-rose-gold.jpg']),
    categories: JSON.stringify(['Rings', 'Rose Gold']),
    featured: false,
  },
  {
    title: 'Teal Opal Pendant Necklace',
    slug: 'teal-opal-pendant-necklace',
    description: 'Australian teal opal set in a 18k white gold teardrop pendant on a 16" diamond-cut chain.',
    price: 89900,
    stock: 8,
    images: JSON.stringify(['/img/products/necklace-opal.jpg']),
    categories: JSON.stringify(['Necklaces', 'Opal', 'Teal Collection']),
    featured: true,
  },
  {
    title: 'Diamond Solitaire Necklace',
    slug: 'diamond-solitaire-necklace',
    description: 'A floating 0.5ct brilliant diamond solitaire on a 18k white gold wheat chain. The ultimate gift.',
    price: 149900,
    stock: 6,
    images: JSON.stringify(['/img/products/necklace-diamond.jpg']),
    categories: JSON.stringify(['Necklaces', 'Diamonds', 'Classic Elegance']),
    featured: true,
  },
  {
    title: 'Pearl Strand Necklace',
    slug: 'pearl-strand-necklace',
    description: 'Sixteen inches of Akoya cultured pearls (7–7.5mm) with an 18k gold barrel clasp.',
    price: 67900,
    stock: 10,
    images: JSON.stringify(['/img/products/necklace-pearl.jpg']),
    categories: JSON.stringify(['Necklaces', 'Pearls', 'Classic Elegance']),
    featured: false,
  },
  {
    title: 'Teal Tourmaline Drop Earrings',
    slug: 'teal-tourmaline-drop-earrings',
    description: 'Pear-shaped teal tourmalines (1ct each) suspended on 18k white gold lever-back earrings.',
    price: 79900,
    stock: 7,
    images: JSON.stringify(['/img/products/earrings-tourmaline.jpg']),
    categories: JSON.stringify(['Earrings', 'Tourmaline', 'Teal Collection']),
    featured: true,
  },
  {
    title: 'Diamond Stud Earrings',
    slug: 'diamond-stud-earrings',
    description: 'Classic 4-prong diamond studs, 0.5ct total weight, set in 18k white gold with secure screw backs.',
    price: 99900,
    stock: 12,
    images: JSON.stringify(['/img/products/earrings-diamond-studs.jpg']),
    categories: JSON.stringify(['Earrings', 'Diamonds', 'Classic Elegance']),
    featured: false,
  },
  {
    title: 'Teal Aquamarine Tennis Bracelet',
    slug: 'teal-aquamarine-tennis-bracelet',
    description: 'Thirty-two aquamarines totalling 6ct in a classic 18k white gold prong-set tennis bracelet.',
    price: 179900,
    stock: 4,
    images: JSON.stringify(['/img/products/bracelet-aquamarine.jpg']),
    categories: JSON.stringify(['Bracelets', 'Aquamarine', 'Teal Collection']),
    featured: true,
  },
];

async function main() {
  console.log('🌱 Starting database seed…');

  // Upsert admin user
  const hashedPassword = await argon2.hash(ADMIN_PASSWORD, { timeCost: 3, memoryCost: 65536 });
  const admin = await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: {},
    create: {
      id: uuidv4(),
      email: ADMIN_EMAIL,
      hashedPassword,
      name: 'TEAL Admin',
      role: 'admin',
      emailVerifiedAt: new Date(),
    },
  });
  console.log(`✅ Admin user: ${admin.email}`);

  // Seed products
  let created = 0;
  for (const p of products) {
    await prisma.product.upsert({
      where: { slug: p.slug },
      update: { stock: p.stock, price: p.price },
      create: { id: uuidv4(), ...p },
    });
    created++;
  }
  console.log(`✅ ${created} products seeded`);
  console.log(`\nAdmin credentials:\n  Email: ${ADMIN_EMAIL}\n  Password: ${ADMIN_PASSWORD}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
