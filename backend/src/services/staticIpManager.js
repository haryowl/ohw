const fs = require('fs');
const path = require('path');
const { networkInterfaces } = require('os');

class StaticIpManager {
    constructor() {
        this.configPath = path.join(process.cwd(), 'config', 'static-ip.json');
        this.config = null;
        this.staticIp = null;
        this.loadConfig();
    }

    // Load static IP configuration
    loadConfig() {
        try {
            if (fs.existsSync(this.configPath)) {
                this.config = JSON.parse(fs.readFileSync(this.configPath, 'utf8'));
                this.staticIp = this.config.static_ip.ip_address;
                console.log(`📡 Static IP configuration loaded: ${this.staticIp}`);
                return true;
            }
        } catch (error) {
            console.error('❌ Error loading static IP config:', error.message);
        }
        return false;
    }

    // Get static IP address
    getStaticIp() {
        return this.staticIp;
    }

    // Get current IP address
    getCurrentIp() {
        const nets = networkInterfaces();
        
        for (const name of Object.keys(nets)) {
            for (const net of nets[name]) {
                // Skip over non-IPv4 and internal addresses
                if (net.family === 'IPv4' && !net.internal) {
                    return net.address;
                }
            }
        }
        return 'localhost';
    }

    // Get preferred IP address (static if available, current otherwise)
    getPreferredIp() {
        return this.staticIp || this.getCurrentIp();
    }

    // Check if static IP is configured
    isStaticIpConfigured() {
        return this.staticIp !== null;
    }

    // Get server URLs with preferred IP
    getServerUrls() {
        const ip = this.getPreferredIp();
        return {
            http: `http://${ip}:3000`,
            peerSync: `http://${ip}:3001`,
            tcp: `${ip}:3003`,
            peerSyncUI: `http://${ip}:3001/mobile-peer-sync-ui.html`
        };
    }

    // Get network information
    getNetworkInfo() {
        const currentIp = this.getCurrentIp();
        const preferredIp = this.getPreferredIp();
        
        return {
            staticIp: this.staticIp,
            currentIp: currentIp,
            preferredIp: preferredIp,
            isStaticConfigured: this.isStaticIpConfigured(),
            urls: this.getServerUrls(),
            config: this.config
        };
    }

    // Update static IP configuration
    updateConfig(newConfig) {
        try {
            this.config = { ...this.config, ...newConfig };
            this.staticIp = this.config.static_ip.ip_address;
            
            // Ensure config directory exists
            const configDir = path.dirname(this.configPath);
            if (!fs.existsSync(configDir)) {
                fs.mkdirSync(configDir, { recursive: true });
            }
            
            // Write updated config
            fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2));
            console.log(`📡 Static IP configuration updated: ${this.staticIp}`);
            return true;
        } catch (error) {
            console.error('❌ Error updating static IP config:', error.message);
            return false;
        }
    }

    // Create default static IP configuration
    createDefaultConfig(ipAddress, gateway, subnetMask = '24') {
        const config = {
            static_ip: {
                enabled: true,
                interface: 'wlan0',
                ip_address: ipAddress,
                gateway: gateway,
                subnet_mask: subnetMask,
                dns_servers: ['8.8.8.8', '8.8.4.4'],
                description: 'Static IP for Galileosky Parser Mobile Server'
            },
            server: {
                http_port: 3000,
                peer_sync_port: 3001,
                tcp_port: 3003,
                host: '0.0.0.0'
            },
            network: {
                current_ip: this.getCurrentIp(),
                network_prefix: ipAddress.split('.').slice(0, 3).join('.'),
                last_updated: new Date().toISOString()
            }
        };
        
        return this.updateConfig(config);
    }

    // Validate IP address format
    validateIpAddress(ip) {
        const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
        return ipRegex.test(ip);
    }

    // Suggest static IP based on current network
    suggestStaticIp() {
        const currentIp = this.getCurrentIp();
        if (currentIp === 'localhost') {
            return null;
        }
        
        const networkPrefix = currentIp.split('.').slice(0, 3).join('.');
        
        // Suggest IP in the range .200-.254
        if (networkPrefix === '192.168.1') {
            return `${networkPrefix}.200`;
        } else if (networkPrefix.startsWith('10.0.')) {
            return `${networkPrefix}.200`;
        } else {
            return `${networkPrefix}.200`;
        }
    }

    // Get connection information for display
    getConnectionInfo() {
        const networkInfo = this.getNetworkInfo();
        const suggestedIp = this.suggestStaticIp();
        
        return {
            ...networkInfo,
            suggestedIp: suggestedIp,
            instructions: this.getSetupInstructions()
        };
    }

    // Get setup instructions
    getSetupInstructions() {
        if (!this.config) {
            return null;
        }
        
        return {
            title: 'Static IP Setup Instructions',
            steps: [
                'Go to Android Settings > Network & Internet > WiFi',
                'Long press your WiFi network > Modify network',
                'Expand Advanced options',
                'Set IP settings to "Static"',
                `Set IP address to: ${this.config.static_ip.ip_address}`,
                `Set Gateway to: ${this.config.static_ip.gateway}`,
                `Set Network prefix length to: ${this.config.static_ip.subnet_mask}`,
                'Save the configuration'
            ]
        };
    }

    // Export configuration for backup
    exportConfig() {
        return {
            config: this.config,
            networkInfo: this.getNetworkInfo(),
            connectionInfo: this.getConnectionInfo(),
            exportTime: new Date().toISOString()
        };
    }

    // Import configuration from backup
    importConfig(backupData) {
        if (backupData && backupData.config) {
            return this.updateConfig(backupData.config);
        }
        return false;
    }
}

module.exports = StaticIpManager; 