const http = require('http');

async function testSimple() {
    console.log('🧪 Simple endpoint test...\n');
    
    const endpoints = [
        '/',
        '/api/status',
        '/api/data',
        '/api/peer/status',
        '/peer/status',
        '/mobile-peer-sync-ui.html'
    ];
    
    for (const endpoint of endpoints) {
        try {
            const response = await makeRequest(`http://localhost:3000${endpoint}`, 'GET');
            console.log(`✅ ${endpoint}:`, typeof response === 'object' ? 'JSON response' : 'HTML response');
        } catch (error) {
            console.log(`❌ ${endpoint}: ${error.message}`);
        }
    }
}

function makeRequest(url, method) {
    return new Promise((resolve, reject) => {
        const urlObj = new URL(url);
        const options = {
            hostname: urlObj.hostname,
            port: urlObj.port,
            path: urlObj.pathname,
            method: method,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        const req = http.request(options, (res) => {
            let responseData = '';
            
            res.on('data', (chunk) => {
                responseData += chunk;
            });
            
            res.on('end', () => {
                try {
                    const result = JSON.parse(responseData);
                    resolve(result);
                } catch (error) {
                    resolve(responseData.substring(0, 100) + '...');
                }
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        req.setTimeout(5000);
        req.end();
    });
}

testSimple().catch(console.error); 