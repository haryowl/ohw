const http = require('http');

// Test bidirectional sync functionality
async function testBidirectionalSync() {
    console.log('🧪 Testing Bidirectional Peer-to-Peer Sync...\n');

    // Test 1: Check if peer endpoints are accessible
    console.log('1️⃣ Testing peer endpoints...');
    
    try {
        const statusResponse = await makeRequest('http://localhost:3000/api/peer/status', 'GET');
        console.log('✅ /api/peer/status:', statusResponse);
        
        const peerStatusResponse = await makeRequest('http://localhost:3000/peer/status', 'GET');
        console.log('✅ /peer/status:', peerStatusResponse);
        
    } catch (error) {
        console.log('❌ Endpoint test failed:', error.message);
        return;
    }

    // Test 2: Test bidirectional sync
    console.log('\n2️⃣ Testing bidirectional sync...');
    
    const testData = {
        deviceId: 'test-device-1',
        records: [
            {
                timestamp: new Date().toISOString(),
                deviceId: '123456789012345',
                latitude: 40.7128,
                longitude: -74.0060,
                altitude: 10,
                speed: 25,
                course: 180,
                satellites: 8,
                hdop: 1.2,
                battery: 85,
                temperature: 22
            }
        ],
        devices: {
            '123456789012345': {
                deviceId: '123456789012345',
                lastSeen: new Date().toISOString(),
                totalRecords: 1,
                clientAddress: '192.168.1.100:12345',
                lastLocation: { lat: 40.7128, lng: -74.0060 }
            }
        },
        lastIMEI: '123456789012345',
        exportTime: new Date().toISOString()
    };

    try {
        const syncResponse = await makeRequest('http://localhost:3000/peer/sync', 'POST', testData);
        console.log('✅ Bidirectional sync response:', syncResponse);
        
        if (syncResponse.success && syncResponse.peerData) {
            console.log('✅ Server sent back data:', {
                deviceId: syncResponse.peerData.deviceId,
                recordsCount: syncResponse.peerData.records ? syncResponse.peerData.records.length : 0,
                devicesCount: syncResponse.peerData.devices ? Object.keys(syncResponse.peerData.devices).length : 0
            });
        }
        
    } catch (error) {
        console.log('❌ Bidirectional sync test failed:', error.message);
    }

    // Test 3: Test import endpoint
    console.log('\n3️⃣ Testing import endpoint...');
    
    try {
        const importResponse = await makeRequest('http://localhost:3000/api/peer/import', 'POST', testData);
        console.log('✅ Import response:', importResponse);
        
    } catch (error) {
        console.log('❌ Import test failed:', error.message);
    }

    console.log('\n🎉 Bidirectional sync test completed!');
}

// Helper function to make HTTP requests
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
                    reject(new Error(`Invalid JSON response: ${responseData}`));
                }
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        req.setTimeout(10000);

        if (data) {
            req.write(JSON.stringify(data));
        }
        
        req.end();
    });
}

// Run the test
testBidirectionalSync().catch(console.error); 