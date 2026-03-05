'use strict';

require('dotenv').config();

const { createApp } = require('./src/app');
const logger = require('./src/lib/logger');

const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = process.env.HOST || '0.0.0.0';

const app = createApp();

const server = app.listen(PORT, HOST, () => {
  logger.info({ port: PORT, env: process.env.NODE_ENV || 'development' }, '🚀 TEAL Jewellery server started');
});

// Graceful shutdown
function shutdown(signal) {
  logger.info({ signal }, 'Shutting down gracefully…');
  server.close(() => {
    const { getDb } = require('./src/lib/db');
    getDb().$disconnect().then(() => {
      logger.info('Database disconnected');
      process.exit(0);
    });
  });

  // Force exit after 10s
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

module.exports = { app, server };
