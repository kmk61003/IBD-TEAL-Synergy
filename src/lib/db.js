'use strict';

const { PrismaClient } = require('@prisma/client');

let prisma;

/**
 * Returns a singleton Prisma client.
 * In production, creates once; in tests, uses a fresh instance per process.
 */
function getDb() {
  if (!prisma) {
    prisma = new PrismaClient({
      log: process.env.NODE_ENV === 'development'
        ? ['query', 'warn', 'error']
        : ['warn', 'error'],
    });
  }
  return prisma;
}

module.exports = { getDb };
