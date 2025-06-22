// backend/scripts/init.js

const fs = require('fs').promises;
const path = require('path');
const logger = require('../src/utils/logger');

async function init() {
  try {
    // Create necessary directories
    const dirs = ['logs', 'data', 'config'];
    for (const dir of dirs) {
      await fs.mkdir(path.join(__dirname, '..', dir)).catch(() => {});
    }

    // Copy example env file if not exists
    const envFile = path.join(__dirname, '..', '.env');
    const envExampleFile = path.join(__dirname, '..', '.env.example');
    
    try {
      await fs.access(envFile);
    } catch {
      await fs.copyFile(envExampleFile, envFile);
    }

    logger.info('Initialization completed');
    process.exit(0);
  } catch (error) {
    logger.error('Initialization failed:', error);
    process.exit(1);
  }
}

init();
