const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

class MobileSyncClient {
    constructor(syncServerUrl, deviceId) {
        this.syncServerUrl = syncServerUrl;
        this.deviceId = deviceId;
        this.lastSyncTime = null;
        this.isOnline = false;
        this.syncInterval = null;
        this.retryInterval = null;
        this.syncEnabled = true;
        
        // Load last sync time from file
        this.loadLastSyncTime();
    }

    // Load last sync time from file
    loadLastSyncTime() {
        try {
            const syncFile = path.join(__dirname, 'data', 'last_sync.json');
            if (fs.existsSync(syncFile)) {
                const data = JSON.parse(fs.readFileSync(syncFile, 'utf8'));
                this.lastSyncTime = data.lastSyncTime;
                console.log(`📱 Loaded last sync time: ${this.lastSyncTime}`);
            }
        } catch (error) {
            console.error('Error loading last sync time:', error);
        }
    }

    // Save last sync time to file
    saveLastSyncTime() {
        try {
            const dataDir = path.join(__dirname, 'data');
            if (!fs.existsSync(dataDir)) {
                fs.mkdirSync(dataDir, { recursive: true });
            }
            
            const syncFile = path.join(dataDir, 'last_sync.json');
            fs.writeFileSync(syncFile, JSON.stringify({
                lastSyncTime: this.lastSyncTime,
                deviceId: this.deviceId
            }, null, 2));
        } catch (error) {
            console.error('Error saving last sync time:', error);
        }
    }

    // Make HTTP request
    async makeRequest(method, endpoint, data = null) {
        return new Promise((resolve, reject) => {
            const url = new URL(endpoint, this.syncServerUrl);
            const isHttps = url.protocol === 'https:';
            const client = isHttps ? https : http;
            
            const options = {
                hostname: url.hostname,
                port: url.port || (isHttps ? 443 : 80),
                path: url.pathname + url.search,
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': 'Galileosky-Mobile-Sync/1.0'
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

    // Upload local data to sync server
    async uploadData(parsedData, devices, lastIMEI) {
        if (!this.syncEnabled) {
            console.log('📱 Sync disabled, skipping upload');
            return;
        }

        try {
            console.log(`📱 Uploading ${parsedData.length} records to sync server...`);
            
            const uploadData = {
                deviceId: this.deviceId,
                data: parsedData,
                devices: Object.fromEntries(devices),
                lastIMEI: lastIMEI,
                timestamp: new Date().toISOString()
            };

            const result = await this.makeRequest('POST', '/api/sync/upload', uploadData);
            
            console.log(`✅ Upload successful: ${result.newRecords} new records synced`);
            this.isOnline = true;
            
            return result;
        } catch (error) {
            console.error('❌ Upload failed:', error.message);
            this.isOnline = false;
            throw error;
        }
    }

    // Download data from sync server
    async downloadData() {
        if (!this.syncEnabled) {
            console.log('📱 Sync disabled, skipping download');
            return null;
        }

        try {
            console.log('📱 Downloading data from sync server...');
            
            const downloadData = {
                deviceId: this.deviceId,
                lastSyncTime: this.lastSyncTime
            };

            const result = await this.makeRequest('POST', '/api/sync/download', downloadData);
            
            console.log(`✅ Download successful: ${result.downloadedRecords} records received`);
            this.lastSyncTime = new Date().toISOString();
            this.saveLastSyncTime();
            this.isOnline = true;
            
            return result;
        } catch (error) {
            console.error('❌ Download failed:', error.message);
            this.isOnline = false;
            throw error;
        }
    }

    // Get sync status
    async getSyncStatus() {
        try {
            const result = await this.makeRequest('GET', '/api/sync/status');
            return result;
        } catch (error) {
            console.error('❌ Status check failed:', error.message);
            return null;
        }
    }

    // Merge downloaded data with local data
    mergeData(localData, downloadedData) {
        if (!downloadedData || !downloadedData.records) {
            return localData;
        }

        console.log(`📱 Merging ${downloadedData.records.length} downloaded records with ${localData.length} local records`);

        // Create a map of existing records by timestamp and deviceId
        const existingRecords = new Map();
        localData.forEach(record => {
            const key = `${record.timestamp}_${record.deviceId}`;
            existingRecords.set(key, record);
        });

        // Add new records from download
        let newRecordsCount = 0;
        downloadedData.records.forEach(record => {
            const key = `${record.timestamp}_${record.deviceId}`;
            if (!existingRecords.has(key)) {
                existingRecords.set(key, record);
                newRecordsCount++;
            }
        });

        // Convert back to array and sort by timestamp
        const mergedData = Array.from(existingRecords.values())
            .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

        console.log(`📱 Merge complete: ${newRecordsCount} new records added, total: ${mergedData.length}`);

        return mergedData;
    }

    // Start automatic sync
    startAutoSync(intervalMinutes = 5) {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
        }

        this.syncInterval = setInterval(async () => {
            if (this.syncEnabled) {
                try {
                    await this.performSync();
                } catch (error) {
                    console.error('Auto sync failed:', error.message);
                }
            }
        }, intervalMinutes * 60 * 1000);

        console.log(`📱 Auto sync started (every ${intervalMinutes} minutes)`);
    }

    // Stop automatic sync
    stopAutoSync() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
            console.log('📱 Auto sync stopped');
        }
    }

    // Perform full sync cycle
    async performSync() {
        console.log('📱 Starting sync cycle...');
        
        try {
            // First upload local data
            // Note: This would need to be called with actual data from the main backend
            // await this.uploadData(parsedData, devices, lastIMEI);
            
            // Then download new data
            const downloadedData = await this.downloadData();
            
            if (downloadedData) {
                console.log(`📱 Sync cycle complete: ${downloadedData.downloadedRecords} records downloaded`);
                return downloadedData;
            }
        } catch (error) {
            console.error('📱 Sync cycle failed:', error.message);
            throw error;
        }
    }

    // Enable/disable sync
    setSyncEnabled(enabled) {
        this.syncEnabled = enabled;
        console.log(`📱 Sync ${enabled ? 'enabled' : 'disabled'}`);
    }

    // Get sync status info
    getStatus() {
        return {
            deviceId: this.deviceId,
            syncEnabled: this.syncEnabled,
            isOnline: this.isOnline,
            lastSyncTime: this.lastSyncTime,
            syncServerUrl: this.syncServerUrl
        };
    }
}

module.exports = MobileSyncClient; 