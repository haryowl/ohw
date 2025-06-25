// Test script to identify which backend is running
console.log('🔍 Backend Identification Test');
console.log('==============================');
console.log('Current working directory:', process.cwd());
console.log('Script file:', __filename);
console.log('Node version:', process.version);
console.log('Platform:', process.platform);
console.log('Architecture:', process.arch);
console.log('');

// Check if termux-enhanced-backend.js exists
const fs = require('fs');
const path = require('path');

const enhancedBackendPath = path.join(__dirname, 'termux-enhanced-backend.js');
const simpleBackendPath = path.join(__dirname, 'termux-simple-backend.js');

console.log('📁 File Check:');
console.log('termux-enhanced-backend.js exists:', fs.existsSync(enhancedBackendPath));
console.log('termux-simple-backend.js exists:', fs.existsSync(simpleBackendPath));

if (fs.existsSync(enhancedBackendPath)) {
    const stats = fs.statSync(enhancedBackendPath);
    console.log('termux-enhanced-backend.js modified:', stats.mtime);
    console.log('termux-enhanced-backend.js size:', stats.size, 'bytes');
}

if (fs.existsSync(simpleBackendPath)) {
    const stats = fs.statSync(simpleBackendPath);
    console.log('termux-simple-backend.js modified:', stats.mtime);
    console.log('termux-simple-backend.js size:', stats.size, 'bytes');
}

console.log('');
console.log('🔧 Environment Variables:');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('TCP_PORT:', process.env.TCP_PORT);
console.log('HTTP_PORT:', process.env.HTTP_PORT);

console.log('');
console.log('📦 Package.json check:');
const packagePath = path.join(__dirname, 'package.json');
if (fs.existsSync(packagePath)) {
    try {
        const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
        console.log('Package name:', packageJson.name);
        console.log('Main script:', packageJson.main);
        console.log('Scripts:', Object.keys(packageJson.scripts || {}));
    } catch (error) {
        console.log('Error reading package.json:', error.message);
    }
}

console.log('');
console.log('✅ Backend identification complete'); 