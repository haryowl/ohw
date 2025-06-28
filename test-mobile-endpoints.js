const http = require('http');

async function testMobileEndpoints() {
    console.log('🧪 Testing Mobile Peer Sync Endpoints...\n');
    
    const baseUrl = 'http://localhost:3000';
    const endpoints = [
        '/api/status',
        '/api/data',
        '/api/peer/status',
        '/api/peer/import',
        '/peer/status',
        '/peer/sync',
        '/mobile-peer-sync-ui.html'
    ];
    
    for (const endpoint of endpoints) {
        try {
            console.log(`Testing: ${baseUrl}${endpoint}`);
            const response = await makeRequest(`${baseUrl}${endpoint}`, 'GET');
            console.log(`✅ ${endpoint}: Working`);
            if (typeof response === 'object') {
                console.log(`   Response keys:`, Object.keys(response));
            }
        } catch (error) {
            console.log(`❌ ${endpoint}: ${error.message}`);
        }
        console.log('');
    }
}

function makeRequest(url, method, data = null) {
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

        if (data) {
            const postData = JSON.stringify(data);
            options.headers['Content-Length'] = Buffer.byteLength(postData);
        }

        const req = http.request(options, (res) => {
            let responseData = '';
            
            res.on('data', (chunk) => {
                responseData += chunk;
            });
            
            res.on('end', () => {
                try {
                    const result = JSON.parse(responseData);
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        resolve(result);
                    } else {
                        reject(new Error(`HTTP ${res.statusCode}: ${result.error || 'Request failed'}`));
                    }
                } catch (error) {
                    resolve(responseData.substring(0, 100) + '...');
                }
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        req.setTimeout(5000);

        if (data) {
            req.write(JSON.stringify(data));
        }
        
        req.end();
    });
}

testMobileEndpoints().catch(console.error); 