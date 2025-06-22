// backend/scripts/clean.js

const fs = require('fs').promises;
const path = require('path');
const logger = require('../src/utils/logger');

async function cleanup() {
  try {
    // Clean logs
    const logsDir = path.join(__dirname, '..', 'logs');
    await fs.rmdir(logsDir, { recursive: true });
    await fs.mkdir(logsDir);

    // Clean database
    const dbFile = path.join(__dirname, '..', 'data', 'galileosky.db');
    await fs.unlink(dbFile).catch(() => {});

    logger.info('Cleanup completed');
    process.exit(0);
  } catch (error) {
    logger.error('Cleanup failed:', error);
    process.exit(1);
  }
}

cleanup();
