const net = require('net');
const { GalileoskyParser } = require('./parser');

class GalileoSkyParser {
    constructor(port = 8000) {
        this.port = port;
        this.server = null;
        this.parser = new GalileoskyParser();
        this.streamBuffers = new Map();
        this.isFirstPacket = new Map(); // Track first packet for each connection
    }

    start() {
        console.log(`Starting TCP server on port ${this.port}...`);
        
        this.server = net.createServer((socket) => {
            console.log('Client connected:', {
                remoteAddress: socket.remoteAddress,
                remotePort: socket.remotePort,
                localAddress: socket.localAddress,
                localPort: socket.localPort
            });

            // Initialize stream buffer and first packet flag for this connection
            this.streamBuffers.set(socket, Buffer.alloc(0));
            this.isFirstPacket.set(socket, true);

            socket.on('data', async (data) => {
                try {
                    console.log('Received data from client:', {
                        remoteAddress: socket.remoteAddress,
                        dataLength: data.length,
                        firstBytes: data.slice(0, 10).toString('hex')
                    });

                    const buffer = this.streamBuffers.get(socket);
                    this.streamBuffers.set(socket, Buffer.concat([buffer, data]));
                    await this.processStreamBuffer(socket);
                } catch (error) {
                    console.error('Error processing data:', error);
                }
            });

            socket.on('end', () => {
                console.log('Client disconnected:', {
                    remoteAddress: socket.remoteAddress,
                    remotePort: socket.remotePort
                });
                this.streamBuffers.delete(socket);
                this.isFirstPacket.delete(socket);
            });

            socket.on('error', (error) => {
                console.error('Socket error:', {
                    remoteAddress: socket.remoteAddress,
                    error: error.message,
                    code: error.code
                });
                this.streamBuffers.delete(socket);
                this.isFirstPacket.delete(socket);
            });
        });

        this.server.on('error', (error) => {
            console.error('Server error:', {
                error: error.message,
                code: error.code
            });
        });

        this.server.on('listening', () => {
            const address = this.server.address();
            console.log('TCP server is listening:', {
                address: address.address,
                port: address.port,
                family: address.family
            });
        });

        this.server.listen(this.port, '0.0.0.0', () => {
            console.log(`TCP server listening on port ${this.port}`);
        });
    }

    calculateCRC16Modbus(buffer) {
        let crc = 0xFFFF;
        
        console.log('Calculating CRC-16 Modbus for:', {
            buffer: buffer.toString('hex'),
            length: buffer.length
        });
        
        for (let i = 0; i < buffer.length; i++) {
            crc ^= buffer[i];
            for (let j = 0; j < 8; j++) {
                if (crc & 0x0001) {
                    crc = (crc >> 1) ^ 0xA001;
                } else {
                    crc = crc >> 1;
                }
            }
        }
        
        console.log('CRC-16 Modbus result:', {
            crc: crc.toString(16),
            highByte: (crc >> 8).toString(16),
            lowByte: (crc & 0xFF).toString(16)
        });
        
        return crc;
    }

    async processStreamBuffer(socket) {
        const buffer = this.streamBuffers.get(socket);
        const isFirst = this.isFirstPacket.get(socket);
        
        while (buffer.length > 0) {
            // Log buffer state at start of processing
            console.log('Buffer state:', {
                length: buffer.length,
                content: buffer.toString('hex'),
                firstBytes: buffer.slice(0, Math.min(10, buffer.length)).toString('hex'),
                timestamp: new Date().toISOString()
            });

            if (buffer.length < 3) {
                console.log('Waiting for more data...', {
                    currentBufferLength: buffer.length,
                    timestamp: new Date().toISOString()
                });
                break;
            }

            const packetType = buffer[0];
            const length = buffer.readUInt16LE(1);

            // Log packet header details
            console.log('Packet header:', {
                type: `0x${packetType.toString(16)}`,
                length: length,
                rawLength: buffer.slice(1, 3).toString('hex'),
                bufferLength: buffer.length,
                isFirstPacket: isFirst,
                timestamp: new Date().toISOString()
            });

            // Validate length to prevent out of range errors
            if (length > 32767) { // Maximum valid length (2^15 - 1)
                console.error('Invalid packet length:', {
                    length: length,
                    bufferLength: buffer.length,
                    firstBytes: buffer.slice(0, 10).toString('hex'),
                    timestamp: new Date().toISOString()
                });
                // Remove the first byte and continue processing
                this.streamBuffers.set(socket, buffer.slice(1));
                continue;
            }

            // Check if we have the complete packet (HEAD + LENGTH + DATA + CRC)
            const expectedLength = length + 5; // 1 (HEAD) + 2 (LENGTH) + length (DATA) + 2 (CRC)
            if (buffer.length < expectedLength) {
                console.log('Incomplete packet, waiting for more data...', {
                    received: buffer.length,
                    expected: expectedLength,
                    missing: expectedLength - buffer.length,
                    currentBuffer: buffer.toString('hex'),
                    timestamp: new Date().toISOString()
                });
                
                // Send 023FFA confirmation packet for incomplete data
                const confirmationPacket = Buffer.from([0x02, 0x3F, 0xFA]);
                if (socket.writable) {
                    socket.write(confirmationPacket, (err) => {
                        if (err) {
                            console.error('Error sending 023FFA confirmation:', err);
                        } else {
                            console.log('023FFA confirmation sent successfully', {
                                packet: confirmationPacket.toString('hex'),
                                timestamp: new Date().toISOString()
                            });
                        }
                    });
                }
                break;
            }

            // Extract packet components
            const head = buffer[0];
            const packetLength = buffer.readUInt16LE(1);
            const data = buffer.slice(3, 3 + packetLength);
            const crc = buffer.slice(3 + packetLength, 3 + packetLength + 2);
            
            console.log('Packet components:', {
                head: {
                    value: `0x${head.toString(16)}`,
                    raw: head.toString('hex')
                },
                length: {
                    value: packetLength,
                    raw: buffer.slice(1, 3).toString('hex'),
                    hasUnsentData: (packetLength & 0x8000) !== 0,
                    actualLength: packetLength & 0x7FFF
                },
                data: {
                    hex: data.toString('hex'),
                    ascii: data.toString('ascii').replace(/[^\x20-\x7E]/g, '.'),
                    length: data.length
                },
                crc: {
                    value: crc.readUInt16LE(0),
                    raw: crc.toString('hex')
                },
                timestamp: new Date().toISOString()
            });

            // Create confirmation packet (0x02)
            const confirmationPacket = Buffer.alloc(3);
            confirmationPacket[0] = 0x02;  // Header
            confirmationPacket[1] = crc[0];  // First byte of CRC
            confirmationPacket[2] = crc[1];  // Second byte of CRC
            
            console.log('Sending confirmation packet:', {
                type: '0x02',
                crc: crc.toString('hex'),
                packet: confirmationPacket.toString('hex'),
                originalPacket: buffer.slice(0, 3 + packetLength + 2).toString('hex'),
                isFirstPacket: isFirst
            });

            if (socket.writable) {
                socket.write(confirmationPacket, (err) => {
                    if (err) {
                        console.error('Error sending confirmation:', err);
                    } else {
                        console.log('Confirmation sent successfully');
                        if (isFirst) {
                            this.isFirstPacket.set(socket, false);
                        }
                    }
                });
            }

            try {
                // Parse the packet data (HEAD + LENGTH + DATA)
                const packetToParse = buffer.slice(0, 3 + packetLength);
                const result = await this.parser.parsePacket(packetToParse);
                console.log('Parsed packet:', result);
            } catch (error) {
                console.error('Error parsing packet:', error);
            }

            // Remove the processed packet from the buffer
            this.streamBuffers.set(socket, buffer.slice(3 + packetLength + 2));
        }
    }

    stop() {
        if (this.server) {
            this.server.close();
            this.server = null;
        }
    }
}

module.exports = { GalileoSkyParser };
