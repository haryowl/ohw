// uninstall-service.js

const { execSync } = require('child_process');
const path = require('path');
const os = require('os');

// Stop and delete services
console.log('Stopping and removing services...');
execSync('pm2 delete galileosky-parser-backend galileosky-parser-frontend', { stdio: 'inherit' });

// Remove from PM2 startup
console.log('Removing from PM2 startup...');
execSync('pm2 unstartup', { stdio: 'inherit' });

// Save PM2 process list
execSync('pm2 save', { stdio: 'inherit' });

console.log('Services uninstalled successfully!');
