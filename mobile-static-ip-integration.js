// ========================================
// MOBILE STATIC IP INTEGRATION
// ========================================
// Adds static IP functionality to existing mobile backend
// Last updated: 2025-01-27
// ========================================

const fs = require('fs');
const path = require('path');
const { networkInterfaces } = require('os');

class StaticIpIntegration {
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
                console.log(`📡 Static IP loaded: ${this.staticIp}`);
                return true;
            }
        } catch (error) {
            console.error('❌ Error loading static IP config:', error.message);
        }
        return false;
    }

    // Get preferred IP (static if available, current otherwise)
    getPreferredIp() {
        if (this.staticIp) {
            return this.staticIp;
        }
        
        const nets = networkInterfaces();
        for (const name of Object.keys(nets)) {
            for (const net of nets[name]) {
                if (net.family === 'IPv4' && !net.internal) {
                    return net.address;
                }
            }
        }
        return 'localhost';
    }

    // Get server URLs
    getServerUrls() {
        const ip = this.getPreferredIp();
        return {
            http: `http://${ip}:3000`,
            peerSync: `http://${ip}:3001`,
            tcp: `${ip}:3003`,
            peerSyncUI: `http://${ip}:3001/mobile-peer-sync-ui.html`
        };
    }

    // Display network information
    displayNetworkInfo() {
        const currentIp = this.getCurrentIp();
        const preferredIp = this.getPreferredIp();
        const urls = this.getServerUrls();
        
        console.log('');
        console.log('🌐 NETWORK CONFIGURATION');
        console.log('========================');
        console.log(`Current IP: ${currentIp}`);
        console.log(`Static IP: ${this.staticIp || 'Not configured'}`);
        console.log(`Preferred IP: ${preferredIp}`);
        console.log(`Static IP Configured: ${this.staticIp ? 'Yes' : 'No'}`);
        console.log('');
        console.log('📱 SERVER URLs');
        console.log('==============');
        console.log(`Mobile Interface: ${urls.http}`);
        console.log(`Peer Sync Interface: ${urls.peerSyncUI}`);
        console.log(`TCP Server: ${urls.tcp}`);
        console.log('');
        
        if (!this.staticIp) {
            console.log('💡 To set up static IP, run:');
            console.log('  curl -sSL https://raw.githubusercontent.com/haryowl/galileosky-parser/main/mobile-static-ip-setup.sh | bash');
            console.log('');
        }
    }

    // Get current IP
    getCurrentIp() {
        const nets = networkInterfaces();
        for (const name of Object.keys(nets)) {
            for (const net of nets[name]) {
                if (net.family === 'IPv4' && !net.internal) {
                    return net.address;
                }
            }
        }
        return 'localhost';
    }

    // Suggest static IP
    suggestStaticIp() {
        const currentIp = this.getCurrentIp();
        if (currentIp === 'localhost') {
            return null;
        }
        
        const networkPrefix = currentIp.split('.').slice(0, 3).join('.');
        return `${networkPrefix}.200`;
    }
}

// Export for use in other files
module.exports = StaticIpIntegration;

// If run directly, display network info
if (require.main === module) {
    const staticIp = new StaticIpIntegration();
    staticIp.displayNetworkInfo();
} 