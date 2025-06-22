const net = require('net');
const logger = require('../utils/logger');

// Test data based on the protocol example
const testPacket = Buffer.from([
    0x01, 0x20, 0x00, 0x01, 0x9A, 0x02, 0x18, 0x03, 
    0x38, 0x36, 0x31, 0x32, 0x33, 0x30, 0x30, 0x34, 
    0x33, 0x39, 0x30, 0x37, 0x36, 0x32, 0x36, 0x04, 
    0x32, 0x00, 0xFE, 0x06, 0x00, 0x01, 0x00, 0x00, 
    0x00, 0x00, 0x00, 0x8F, 0x29
]);

// Create TCP server for testing
const server = net.createServer((socket) => {
    logger.info('Test client connected');

    socket.on('data', (data) => {
        try {
            // Log received data
            logger.info('Received data:', {
                hex: data.toString('hex').toUpperCase(),
                length: data.length
            });

            // Calculate CRC16 using Modbus algorithm
            const calculateCRC16 = (buffer) => {
                let crc = 0xFFFF;
                for (let i = 0; i < buffer.length - 2; i++) { // Exclude the last 2 bytes (CRC)
                    crc ^= buffer[i];
                    for (let j = 0; j < 8; j++) {
                        if (crc & 0x0001) {
                            crc = (crc >> 1) ^ 0xA001;
                        } else {
                            crc = crc >> 1;
                        }
                    }
                }
                return crc;
            };

            // Create confirmation packet (3 bytes)
            const crc = calculateCRC16(data);
            const confirmationPacket = Buffer.alloc(3);
            confirmationPacket.writeUInt8(0x02, 0);  // Header
            confirmationPacket.writeUInt16LE(crc, 1);  // Checksum

            // Send confirmation
            socket.write(confirmationPacket);
            logger.info('Sent confirmation:', {
                hex: confirmationPacket.toString('hex').toUpperCase(),
                crc: crc.toString(16).toUpperCase()
            });

        } catch (error) {
            logger.error('Error processing data:', error);
            // Send error confirmation
            socket.write(Buffer.from([0x02, 0x3F, 0x00]));
        }
    });

    socket.on('error', (error) => {
        logger.error('Socket error:', error);
    });

    socket.on('close', () => {
        logger.info('Test client disconnected');
    });
});

// Start server
const PORT = 3001;
server.listen(PORT, () => {
    logger.info(`Test server listening on port ${PORT}`);

    // Create test client
    const client = new net.Socket();
    
    client.connect(PORT, 'localhost', () => {
        logger.info('Test client connected to server');
        
        // Send test packet
        client.write(testPacket);
        logger.info('Sent test packet:', {
            hex: testPacket.toString('hex').toUpperCase(),
            length: testPacket.length
        });
    });

    client.on('data', (data) => {
        logger.info('Received confirmation:', {
            hex: data.toString('hex').toUpperCase(),
            length: data.length
        });
        
        // Verify confirmation format
        if (data.length !== 3) {
            logger.error('Invalid confirmation length:', data.length);
        }
        if (data[0] !== 0x02) {
            logger.error('Invalid confirmation header:', data[0]);
        }
        
        // Close connection after test
        client.destroy();
        server.close();
    });

    client.on('error', (error) => {
        logger.error('Client error:', error);
        client.destroy();
        server.close();
    });
}); 