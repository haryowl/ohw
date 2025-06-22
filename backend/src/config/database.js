// backend/config/database.js
const path = require('path');

module.exports = {
    development: {
        dialect: 'sqlite',
        storage: path.join(__dirname, '..', 'data', 'dev.sqlite'),
        logging: console.log,
        pool: {
            max: 5,
            min: 0,
            acquire: 30000,
            idle: 10000
        },
        dialectOptions: {
            // SQLite specific options
            timeout: 30000, // 30 seconds timeout
            busyTimeout: 30000, // 30 seconds busy timeout
            journalMode: 'WAL' // Write-Ahead Logging for better concurrency
        }
    },
    test: {
        dialect: 'sqlite',
        storage: ':memory:',
        logging: false
    },
    production: {
        dialect: 'sqlite',
        storage: path.join(__dirname, '..', 'data', 'prod.sqlite'),
        logging: false,
        pool: {
            max: 5,
            min: 0,
            acquire: 30000,
            idle: 10000
        },
        dialectOptions: {
            timeout: 30000,
            busyTimeout: 30000,
            journalMode: 'WAL'
        }
    }
};
