const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');

class PeerToPeerSync {
    constructor(deviceId, port = 3001) {
        this.deviceId = deviceId;
        this.port = port;
        this.peerServer = null;
        this.isServerMode = false;
        this.syncInProgress = false;
        this.lastSyncTime = null;
    }

    // Start this device as a peer server (other devices can connect to it)
    startPeerServer(parsedData, devices, lastIMEI) {
        if (this.isServerMode) {
            console.log('📱 Peer server already running');
            return;
        }

        console.log(`📱 Starting peer server on port ${this.port}...`);

        this.peerServer = http.createServer((req, res) => {
            this.handlePeerRequest(req, res, parsedData, devices, lastIMEI);
        });

        this.peerServer.listen(this.port, '0.0.0.0', () => {
            this.isServerMode = true;
            console.log(`✅ Peer server started on port ${this.port}`);
            console.log(`📡 Other devices can connect to: http://YOUR_IP:${this.port}/peer/sync`);
        });

        this.peerServer.on('error', (error) => {
            if (error.code === 'EADDRINUSE') {
                console.error(`❌ Port ${this.port} is already in use`);
            } else {
                console.error('❌ Peer server error:', error.message);
            }
        });
    }

    // Stop the peer server
    stopPeerServer() {
        if (this.peerServer) {
            this.peerServer.close(() => {
                console.log('📱 Peer server stopped');
                this.isServerMode = false;
                this.peerServer = null;
            });
        }
    }

    // Handle incoming peer requests
    handlePeerRequest(req, res, parsedData, devices, lastIMEI) {
        const url = new URL(req.url, `http://${req.headers.host}`);
        const pathname = url.pathname;

        // Set CORS headers for cross-device requests
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        if (req.method === 'OPTIONS') {
            res.writeHead(200);
            res.end();
            return;
        }

        console.log(`📱 Peer request: ${req.method} ${pathname}`);

        if (pathname === '/peer/status') {
            // Return device status
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                deviceId: this.deviceId,
                isServerMode: this.isServerMode,
                totalRecords: parsedData.length,
                totalDevices: devices.size,
                lastIMEI: lastIMEI,
                lastSyncTime: this.lastSyncTime,
                timestamp: new Date().toISOString()
            }));
        } else if (pathname === '/peer/export') {
            // Export data to peer
            const exportData = {
                deviceId: this.deviceId,
                records: parsedData,
                devices: Object.fromEntries(devices),
                lastIMEI: lastIMEI,
                exportTime: new Date().toISOString()
            };

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(exportData));
            console.log(`📱 Exported ${parsedData.length} records to peer`);

        } else if (pathname === '/peer/import' && req.method === 'POST') {
            // Import data from peer
            let body = '';
            req.on('data', chunk => {
                body += chunk.toString();
            });

            req.on('end', () => {
                try {
                    const importData = JSON.parse(body);
                    const result = this.mergePeerData(parsedData, devices, importData);
                    
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({
                        success: true,
                        newRecords: result.newRecords,
                        totalRecords: parsedData.length,
                        message: `Imported ${result.newRecords} new records from peer`
                    }));

                    console.log(`📱 Imported ${result.newRecords} records from peer`);
                } catch (error) {
                    console.error('❌ Import error:', error.message);
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Invalid import data' }));
                }
            });
        } else if (pathname === '/peer/sync' && req.method === 'POST') {
            // Full sync (export and import in one request)
            let body = '';
            req.on('data', chunk => {
                body += chunk.toString();
            });

            req.on('end', () => {
                try {
                    const peerData = JSON.parse(body);
                    
                    // Export our data to peer
                    const exportData = {
                        deviceId: this.deviceId,
                        records: parsedData,
                        devices: Object.fromEntries(devices),
                        lastIMEI: lastIMEI,
                        exportTime: new Date().toISOString()
                    };

                    // Merge peer data into our data
                    const mergeResult = this.mergePeerData(parsedData, devices, peerData);

                    // Return our data to peer and sync result
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({
                        success: true,
                        peerData: exportData,
                        syncResult: {
                            newRecords: mergeResult.newRecords,
                            totalRecords: parsedData.length
                        },
                        message: `Sync complete: ${mergeResult.newRecords} new records added`
                    }));

                    this.lastSyncTime = new Date().toISOString();
                    console.log(`📱 Peer sync completed: ${mergeResult.newRecords} new records`);
                } catch (error) {
                    console.error('❌ Sync error:', error.message);
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Sync failed' }));
                }
            });
        } else {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Peer endpoint not found' }));
        }
    }

    // Merge data from peer device
    mergePeerData(parsedData, devices, peerData) {
        if (!peerData || !peerData.records) {
            return { newRecords: 0 };
        }

        console.log(`📱 Merging ${peerData.records.length} records from peer device ${peerData.deviceId}`);
        console.log(`📱 Peer data details:`, {
            totalRecords: peerData.totalRecords,
            actualRecordsLength: peerData.records.length,
            devices: peerData.devices ? Object.keys(peerData.devices) : [],
            lastIMEI: peerData.lastIMEI
        });

        // Create a map of existing records by unique key (timestamp + deviceId)
        const existingRecords = new Map();
        parsedData.forEach(record => {
            const key = `${record.timestamp}_${record.deviceId}`;
            existingRecords.set(key, record);
        });

        // Merge devices with IMEI keys
        if (peerData.devices) {
            console.log(`📱 Merging devices from peer:`, Object.keys(peerData.devices));
            Object.entries(peerData.devices).forEach(([key, deviceInfo]) => {
                // Use deviceId (which contains IMEI) as the key instead of numeric key
                const imei = deviceInfo.deviceId || key;
                console.log(`📱 Merging device with IMEI: ${imei} (from key: ${key})`);
                devices.set(imei, deviceInfo); // ✅ Use IMEI as key
            });
            console.log(`📱 Devices after merge:`, Array.from(devices.keys()));
        }

        // Add new records from peer
        let newRecordsCount = 0;
        peerData.records.forEach(record => {
            const key = `${record.timestamp}_${record.deviceId}`;
            if (!existingRecords.has(key)) {
                existingRecords.set(key, record);
                newRecordsCount++;
            }
        });

        // Convert back to array and sort by timestamp
        const mergedData = Array.from(existingRecords.values())
            .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

        // Replace the original array with merged data
        parsedData.length = 0;
        parsedData.push(...mergedData);

        console.log(`📱 Merge complete: ${newRecordsCount} new records added, total: ${parsedData.length}`);

        return { newRecords: newRecordsCount };
    }

    // Connect to another peer device and sync
    async connectToPeer(peerUrl, parsedData, devices, lastIMEI) {
        if (this.syncInProgress) {
            console.log('📱 Sync already in progress, please wait...');
            return;
        }

        this.syncInProgress = true;
        console.log(`📱 Connecting to peer: ${peerUrl}`);

        try {
            // First, check peer status
            const status = await this.makePeerRequest(peerUrl, 'GET', '/peer/status');
            console.log(`📱 Peer status: ${status.deviceId}, ${status.totalRecords} records`);

            // Prepare our data for sync
            const ourData = {
                deviceId: this.deviceId,
                records: parsedData,
                devices: Object.fromEntries(devices),
                lastIMEI: lastIMEI,
                exportTime: new Date().toISOString()
            };

            // Perform full sync
            const syncResult = await this.makePeerRequest(peerUrl, 'POST', '/peer/sync', ourData);
            
            if (syncResult.success) {
                // Merge peer data into our data
                const mergeResult = this.mergePeerData(parsedData, devices, syncResult.peerData);
                
                console.log(`✅ Peer sync successful:`);
                console.log(`   📤 Sent: ${parsedData.length} records`);
                console.log(`   📥 Received: ${syncResult.syncResult.newRecords} new records`);
                console.log(`   📊 Total after sync: ${parsedData.length} records`);
                
                this.lastSyncTime = new Date().toISOString();
                return syncResult;
            } else {
                throw new Error('Sync failed');
            }

        } catch (error) {
            console.error('❌ Peer sync failed:', error.message);
            throw error;
        } finally {
            this.syncInProgress = false;
        }
    }

    // Make HTTP request to peer
    async makePeerRequest(peerUrl, method, endpoint, data = null) {
        return new Promise((resolve, reject) => {
            const url = new URL(endpoint, peerUrl);
            const isHttps = url.protocol === 'https:';
            const client = isHttps ? https : http;
            
            const options = {
                hostname: url.hostname,
                port: url.port || (isHttps ? 443 : 80),
                path: url.pathname + url.search,
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': 'Galileosky-Peer-Sync/1.0'
                }
            };

            if (data) {
                const postData = JSON.stringify(data);
                options.headers['Content-Length'] = Buffer.byteLength(postData);
            }

            const req = client.request(options, (res) => {
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

            req.on('timeout', () => {
                req.destroy();
                reject(new Error('Request timeout'));
            });

            req.setTimeout(30000); // 30 second timeout

            if (data) {
                req.write(JSON.stringify(data));
            }
            
            req.end();
        });
    }

    // Get device IP address (for peer connection)
    getDeviceIP() {
        const { networkInterfaces } = require('os');
        const nets = networkInterfaces();
        
        for (const name of Object.keys(nets)) {
            for (const net of nets[name]) {
                // Skip over non-IPv4 and internal (i.e. 127.0.0.1) addresses
                if (net.family === 'IPv4' && !net.internal) {
                    return net.address;
                }
            }
        }
        return 'localhost';
    }

    // Get sync status
    getStatus() {
        return {
            deviceId: this.deviceId,
            isServerMode: this.isServerMode,
            port: this.port,
            lastSyncTime: this.lastSyncTime,
            syncInProgress: this.syncInProgress,
            deviceIP: this.getDeviceIP()
        };
    }
}

module.exports = PeerToPeerSync; 