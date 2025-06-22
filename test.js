const net = require('net');
const axios = require('axios');
const { promisify } = require('util');
const sleep = promisify(setTimeout);

// Test configuration
const config = {
    tcpHost: 'localhost',
    tcpPort: 5025,
    apiHost: 'localhost',
    apiPort: 3000,
    imei: '123456789012345',
    interval: 5000 // Send data every 5 seconds
};

// Create test data
function createLoginPacket() {
    const imei = Buffer.from(config.imei);
    const packet = Buffer.alloc(17);
    packet[0] = 0x01; // Login packet type
    packet[1] = 15; // Length
    imei.copy(packet, 2);
    return packet;
}

function createLocationPacket() {
    const now = Math.floor(Date.now() / 1000);
    const packet = Buffer.alloc(55);
    
    // Packet type and length
    packet[0] = 0x02; // Location packet type
    packet[1] = 53; // Length
    
    // IMEI
    Buffer.from(config.imei).copy(packet, 2);
    
    // Timestamp
    packet.writeUInt32BE(now, 17);
    
    // Latitude (example: 40.7128° N)
    packet.writeInt32BE(407128000, 21);
    
    // Longitude (example: 74.0060° W)
    packet.writeInt32BE(-740060000, 25);
    
    // Altitude (example: 10 meters)
    packet.writeInt16BE(10, 29);
    
    // Speed (example: 50 km/h)
    packet.writeUInt16BE(500, 31);
    
    // Course (example: 90 degrees)
    packet.writeUInt16BE(900, 33);
    
    // Satellites and HDOP
    packet[35] = 8; // 8 satellites
    packet[36] = 10; // HDOP 1.0
    
    // Inputs and outputs
    packet[37] = 0x0F; // All inputs high
    packet[38] = 0x03; // First two outputs high
    
    // ADC values
    packet.writeUInt16BE(3300, 39); // ADC1: 3.3V
    packet.writeUInt16BE(2500, 41); // ADC2: 2.5V
    packet.writeUInt16BE(1200, 43); // ADC3: 1.2V
    
    // iButton (example)
    Buffer.from('1234567890ABCDEF', 'hex').copy(packet, 45);
    
    // Temperature (example: 25.5°C)
    packet.writeInt16BE(255, 53);
    
    return packet;
}

// Test TCP client
async function testTCPClient() {
    return new Promise((resolve, reject) => {
        console.log('Testing TCP client...');
        
        const client = new net.Socket();
        
        client.on('connect', async () => {
            try {
                console.log('Connected to TCP server');
                
                // Send login packet
                console.log('Sending login packet...');
                client.write(createLoginPacket());
                
                // Send location packet
                console.log('Sending location packet...');
                client.write(createLocationPacket());
                
                // Wait for data to be processed
                await sleep(2000);
                
                // Close connection
                client.end();
                resolve();
            } catch (error) {
                reject(error);
            }
        });
        
        client.on('data', (data) => {
            console.log('Received data from server:', data.toString('hex'));
        });
        
        client.on('error', (error) => {
            console.error('TCP connection error:', error.message);
            reject(error);
        });
        
        client.on('close', () => {
            console.log('TCP connection closed');
        });
        
        // Connect to server
        console.log(`Connecting to TCP server at ${config.tcpHost}:${config.tcpPort}...`);
        client.connect(config.tcpPort, config.tcpHost);
    });
}

// Test API endpoints
async function testAPI() {
    console.log('\nTesting API endpoints...');
    
    try {
        // Test 1: Create field mapping
        console.log('\nTest 1: Creating field mapping...');
        const mappingResponse = await axios.post(`http://${config.apiHost}:${config.apiPort}/api/mappings`, {
            deviceImei: config.imei,
            originalField: 'latitude',
            customField: 'deviceLatitude'
        });
        console.log('Field mapping created:', mappingResponse.data);
        const mappingId = mappingResponse.data.id;
        
        // Test 2: Get field mappings
        console.log('\nTest 2: Getting field mappings...');
        const mappingsResponse = await axios.get(`http://${config.apiHost}:${config.apiPort}/api/mappings/${config.imei}`);
        console.log('Field mappings:', mappingsResponse.data);
        
        // Test 3: Get telemetry data
        console.log('\nTest 3: Getting telemetry data...');
        const telemetryResponse = await axios.get(`http://${config.apiHost}:${config.apiPort}/api/telemetry`, {
            params: {
                deviceImei: config.imei,
                limit: 10,
                page: 1
            }
        });
        console.log('Telemetry data:', telemetryResponse.data);
        
        // Test 4: Export telemetry data
        console.log('\nTest 4: Exporting telemetry data...');
        const exportResponse = await axios.get(`http://${config.apiHost}:${config.apiPort}/api/telemetry/export`, {
            params: {
                deviceImei: config.imei,
                fields: 'timestamp,deviceLatitude,longitude,speed'
            },
            responseType: 'blob'
        });
        console.log('Export successful, data size:', exportResponse.data.length);
        
        // Test 5: Update field mapping
        console.log('\nTest 5: Updating field mapping...');
        const updateResponse = await axios.put(`http://${config.apiHost}:${config.apiPort}/api/mappings/${mappingId}`, {
            customField: 'updatedLatitude'
        });
        console.log('Field mapping updated:', updateResponse.data);
        
        // Test 6: Delete field mapping
        console.log('\nTest 6: Deleting field mapping...');
        const deleteResponse = await axios.delete(`http://${config.apiHost}:${config.apiPort}/api/mappings/${mappingId}`);
        console.log('Field mapping deleted:', deleteResponse.data);
        
        console.log('\nAll API tests completed successfully!');
    } catch (error) {
        console.error('API test failed:', error.response ? error.response.data : error.message);
        throw error;
    }
}

// Run tests
async function runTests() {
    try {
        // Wait for servers to start
        console.log('Waiting for servers to start...');
        await sleep(2000);
        
        // Run TCP client test
        await testTCPClient();
        
        // Wait for TCP test to complete
        await sleep(5000);
        
        // Run API tests
        await testAPI();
    } catch (error) {
        console.error('Test failed:', error);
        process.exit(1);
    }
}

// Start tests
runTests(); 