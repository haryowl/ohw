const http = require('http');

const testConnection = (host, port) => {
    return new Promise((resolve, reject) => {
        const req = http.request({
            host: host,
            port: port,
            path: '/api/health',
            method: 'GET',
            timeout: 5000
        }, (res) => {
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            res.on('end', () => {
                try {
                    const response = JSON.parse(data);
                    resolve({
                        success: true,
                        status: res.statusCode,
                        data: response
                    });
                } catch (error) {
                    resolve({
                        success: true,
                        status: res.statusCode,
                        data: data
                    });
                }
            });
        });

        req.on('error', (error) => {
            reject({
                success: false,
                error: error.message
            });
        });

        req.on('timeout', () => {
            req.destroy();
            reject({
                success: false,
                error: 'Connection timeout'
            });
        });

        req.end();
    });
};

const testEndpoints = async () => {
    const endpoints = [
        { name: 'Localhost', host: 'localhost', port: 3001 },
        { name: '127.0.0.1', host: '127.0.0.1', port: 3001 },
        { name: '0.0.0.0', host: '0.0.0.0', port: 3001 }
    ];

    console.log('🔍 Testing connection endpoints...\n');

    for (const endpoint of endpoints) {
        try {
            console.log(`Testing ${endpoint.name} (${endpoint.host}:${endpoint.port})...`);
            const result = await testConnection(endpoint.host, endpoint.port);
            
            if (result.success) {
                console.log(`✅ ${endpoint.name}: Connected successfully`);
                console.log(`   Status: ${result.status}`);
                if (result.data.uptime) {
                    console.log(`   Uptime: ${Math.round(result.data.uptime)}s`);
                }
                if (result.data.activeConnections !== undefined) {
                    console.log(`   Active connections: ${result.data.activeConnections}`);
                }
            } else {
                console.log(`❌ ${endpoint.name}: Failed`);
            }
        } catch (error) {
            console.log(`❌ ${endpoint.name}: ${error.error}`);
        }
        console.log('');
    }

    console.log('📱 Mobile access instructions:');
    console.log('1. Find your phone\'s IP address:');
    console.log('   - Go to Settings > Wi-Fi');
    console.log('   - Tap on your connected network');
    console.log('   - Look for "IP address"');
    console.log('');
    console.log('2. Access the frontend from another device:');
    console.log('   http://YOUR_PHONE_IP:3001');
    console.log('');
    console.log('3. Test the API:');
    console.log('   http://YOUR_PHONE_IP:3001/api/health');
};

// Run the test
testEndpoints().catch(console.error); 