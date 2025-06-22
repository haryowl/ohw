// install-service.js

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

// Create logs directory
const logsDir = path.join(os.homedir(), 'galileosky-parser', 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Install PM2 globally if not installed
try {
  execSync('pm2 --version', { stdio: 'ignore' });
} catch (error) {
  console.log('Installing PM2 globally...');
  execSync('npm install -g pm2', { stdio: 'inherit' });
}

// Build frontend
console.log('Building frontend...');
execSync('cd frontend && npm run build', { stdio: 'inherit' });

// Install serve globally if not installed
try {
  execSync('serve --version', { stdio: 'ignore' });
} catch (error) {
  console.log('Installing serve globally...');
  execSync('npm install -g serve', { stdio: 'inherit' });
}

// Start backend service
console.log('Starting backend service...');
execSync('cd backend && pm2 start service-config.js --force', { stdio: 'inherit' });

// Start frontend service
console.log('Starting frontend service...');
execSync('cd frontend && pm2 start service-config.js --force', { stdio: 'inherit' });

// Save PM2 process list
execSync('pm2 save', { stdio: 'inherit' });

// Setup PM2 to start on system boot (Windows-specific)
console.log('Setting up PM2 to start on system boot...');
try {
  if (process.platform === 'win32') {
    // For Windows, we'll create a scheduled task instead
    const startupScript = path.join(__dirname, 'startup.js');
    fs.writeFileSync(startupScript, `
      const { execSync } = require('child_process');
      execSync('pm2 resurrect', { stdio: 'inherit' });
    `);
    
    // Create a scheduled task to run on system startup
    execSync(`schtasks /create /tn "PM2 Startup" /tr "node ${startupScript}" /sc onstart /ru SYSTEM`, { stdio: 'inherit' });
    console.log('Created Windows startup task for PM2');
  } else {
    // For Linux/Unix systems
    execSync('pm2 startup', { stdio: 'inherit' });
  }
} catch (error) {
  console.warn('Warning: Could not set up automatic startup:', error.message);
  console.log('You may need to manually start the services after system reboot.');
}

console.log('Services installed and started successfully!');
console.log('Backend is running on http://localhost:3001');
console.log('Frontend is running on http://localhost:3000');
console.log('Logs are available in:', logsDir);
