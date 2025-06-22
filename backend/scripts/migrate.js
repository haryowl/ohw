// backend/scripts/migrate.js
const { sequelize } = require('../src/models');
const logger = require('../src/utils/logger');
const path = require('path');
const fs = require('fs').promises;

async function createDirectories() {
    const dirs = [
        path.join(__dirname, '..', 'data'),
        path.join(__dirname, '..', 'logs')
    ];

    for (const dir of dirs) {
        await fs.mkdir(dir, { recursive: true });
    }
}

async function migrate() {
    try {
        // Create necessary directories
        await createDirectories();

        // Test database connection
        await sequelize.authenticate();
        logger.info('Database connection established');

        // Sync database schema
        await sequelize.sync({ alter: true });
        logger.info('Database migrations completed');

        process.exit(0);
    } catch (error) {
        logger.error('Migration failed:', error);
        console.error(error);
        process.exit(1);
    }
}

migrate();
