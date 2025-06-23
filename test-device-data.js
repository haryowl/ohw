const http = require('http');

// Configuration
const config = {
    host: 'localhost',
    port: 3000,
    deviceId: 'TEST001'
};

// Simulate device data
function generateTestData() {
    const baseLat = 40.7128; // New York coordinates
    const baseLng = -74.0060;
    
    // Add some random movement
    const latOffset = (Math.random() - 0.5) * 0.01;
    const lngOffset = (Math.random() - 0.5) * 0.01;
    
    return {
        deviceId: config.deviceId,
        imei: config.deviceId,
        timestamp: new Date().toISOString(),
        latitude: baseLat + latOffset,
        longitude: baseLng + lngOffset,
        speed: Math.floor(Math.random() * 60) + 10, // 10-70 km/h
        direction: Math.floor(Math.random() * 360), // 0-359 degrees
        height: Math.floor(Math.random() * 100) + 50, // 50-150 meters
        satellites: Math.floor(Math.random() * 5) + 5, // 5-10 satellites
        supplyVoltage: (Math.random() * 2 + 12).toFixed(2), // 12-14V
        batteryVoltage: (Math.random() * 2 + 3.5).toFixed(2), // 3.5-5.5V
        temperature: (Math.random() * 20 + 15).toFixed(1), // 15-35°C
        status: 'active'
    };
}

// Send test data to backend
function sendTestData() {
    const data = generateTestData();
    
    const postData = JSON.stringify(data);
    
    const options = {
        hostname: config.host,
        port: config.port,
        path: '/api/data/add',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData)
        }
    };
    
    const req = http.request(options, (res) => {
        let responseData = '';
        
        res.on('data', (chunk) => {
            responseData += chunk;
        });
        
        res.on('end', () => {
            console.log(`Data sent: ${new Date().toLocaleTimeString()}`);
            console.log(`Response: ${res.statusCode} - ${responseData}`);
        });
    });
    
    req.on('error', (error) => {
        console.error('Error sending data:', error.message);
    });
    
    req.write(postData);
    req.end();
}

// Send data every 5 seconds
console.log('Starting test data generator...');
console.log(`Sending data to: http://${config.host}:${config.port}`);
console.log(`Device ID: ${config.deviceId}`);
console.log('Press Ctrl+C to stop\n');

sendTestData(); // Send first data immediately

const interval = setInterval(sendTestData, 5000);

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\nStopping test data generator...');
    clearInterval(interval);
    process.exit(0);
}); 