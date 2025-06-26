# 🌐 Static IP Setup for Galileosky Parser Mobile

## 📋 Overview

This guide explains how to configure a static IP address for your Galileosky Parser mobile server. A static IP ensures that your server always has the same IP address, making it easier for devices to connect consistently.

## 🎯 Benefits of Static IP

- **Consistent Connectivity**: Devices always know where to find your server
- **No IP Changes**: Server address remains the same even after network restarts
- **Easy Configuration**: Other devices can be pre-configured with your server IP
- **Reliable Peer Sync**: Peer-to-peer synchronization works consistently
- **Professional Setup**: Suitable for production deployments

## 🚀 Quick Setup

### Option 1: Automatic Setup (Recommended)

```bash
# Download and run the automatic setup script
curl -sSL https://raw.githubusercontent.com/haryowl/galileosky-parser/main/mobile-static-ip-setup.sh | bash
```

### Option 2: Manual Setup

1. **Detect Current Network**:
   ```bash
   ip addr show wlan0
   ip route | grep default
   ```

2. **Choose Static IP**:
   - If your current IP is `192.168.1.100`, use `192.168.1.200`
   - If your current IP is `10.0.0.50`, use `10.0.0.200`
   - Avoid IPs in the DHCP range (usually .1-.100)

3. **Configure Android WiFi**:
   - Go to Settings > Network & Internet > WiFi
   - Long press your WiFi network > Modify network
   - Expand Advanced options
   - Set IP settings to "Static"
   - Enter your chosen static IP
   - Set Gateway (usually `192.168.1.1` or `10.0.0.1`)
   - Set Network prefix length to `24`

## 📱 Mobile Setup Instructions

### Step 1: Install Dependencies

```bash
# Update Termux
pkg update -y

# Install required packages
pkg install nodejs git curl -y

# Clone the repository
git clone https://github.com/haryowl/galileosky-parser.git
cd galileosky-parser
```

### Step 2: Set Up Static IP

```bash
# Run the static IP setup script
curl -sSL https://raw.githubusercontent.com/haryowl/galileosky-parser/main/mobile-static-ip-setup.sh | bash
```

### Step 3: Configure Android WiFi

1. **Open Android Settings**
2. **Go to Network & Internet > WiFi**
3. **Long press your WiFi network**
4. **Select "Modify network"**
5. **Expand "Advanced options"**
6. **Set IP settings to "Static"**
7. **Enter the suggested IP address**
8. **Set Gateway and Network prefix**
9. **Save the configuration**

### Step 4: Start the Server

```bash
# Start with static IP support
./start-with-static-ip.sh
```

## 🔧 Configuration Files

### Static IP Configuration (`config/static-ip.json`)

```json
{
  "static_ip": {
    "enabled": true,
    "interface": "wlan0",
    "ip_address": "192.168.1.200",
    "gateway": "192.168.1.1",
    "subnet_mask": "24",
    "dns_servers": ["8.8.8.8", "8.8.4.4"],
    "description": "Static IP for Galileosky Parser Mobile Server"
  },
  "server": {
    "http_port": 3000,
    "peer_sync_port": 3001,
    "tcp_port": 3003,
    "host": "0.0.0.0"
  },
  "network": {
    "current_ip": "192.168.1.100",
    "network_prefix": "192.168.1",
    "last_updated": "2025-01-27T10:30:00.000Z"
  }
}
```

## 📊 Network Information

### Server URLs

Once configured, your server will be available at:

- **Mobile Interface**: `http://192.168.1.200:3000`
- **Peer Sync Interface**: `http://192.168.1.200:3001/mobile-peer-sync-ui.html`
- **TCP Server**: `192.168.1.200:3003`

### Network Status

Check your network configuration:

```bash
./network-status.sh
```

This will show:
- Current IP address
- Static IP configuration
- Server URLs
- Quick action commands

## 🔄 Integration with Existing Backends

### Automatic Integration

The setup script automatically integrates static IP functionality into existing backend files:

- `termux-peer-sync-backend.js`
- `termux-enhanced-backend.js`
- `termux-simple-backend.js`

### Manual Integration

If you need to manually integrate static IP:

```bash
# Run the integration script
./integrate-static-ip.sh
```

This will:
1. Backup existing files
2. Add static IP integration code
3. Update server URLs
4. Create enhanced startup scripts

## 🛠️ Troubleshooting

### Issue: "Static IP not configured"

**Solution**: Run the setup script again:
```bash
curl -sSL https://raw.githubusercontent.com/haryowl/galileosky-parser/main/mobile-static-ip-setup.sh | bash
```

### Issue: "Cannot connect to server"

**Solutions**:
1. Check if static IP is set in Android WiFi settings
2. Verify the IP address is not in use by another device
3. Try a different IP in the range .200-.254
4. Check firewall settings

### Issue: "IP address conflict"

**Solutions**:
1. Choose a different static IP
2. Check what devices are using IPs in your network
3. Use network scanning tools to find available IPs

### Issue: "Server starts but devices can't connect"

**Solutions**:
1. Verify the static IP is correctly configured
2. Check if the server is binding to `0.0.0.0` (all interfaces)
3. Ensure no firewall is blocking the ports
4. Test connectivity with `ping` command

## 📋 Available Scripts

### Setup Scripts

- `mobile-static-ip-setup.sh` - Complete static IP setup
- `integrate-static-ip.sh` - Integrate static IP into existing backends
- `setup-static-ip.sh` - Network configuration script

### Management Scripts

- `start-with-static-ip.sh` - Start server with static IP support
- `network-status.sh` - Show network configuration and status
- `mobile-static-ip-integration.js` - Static IP integration module

### Utility Scripts

- `connection-info.txt` - Connection information and instructions
- `qr-codes/` - QR codes for easy connection

## 🔐 Security Considerations

### Network Security

1. **Firewall**: Configure your router's firewall to allow only necessary ports
2. **Access Control**: Use authentication if exposing to the internet
3. **VPN**: Consider using VPN for remote access
4. **Updates**: Keep your system and dependencies updated

### Recommended Ports

- **3000**: HTTP interface (internal network only)
- **3001**: Peer sync interface (internal network only)
- **3003**: TCP server for Galileosky devices

## 📈 Performance Optimization

### Network Optimization

1. **WiFi Channel**: Use a less congested WiFi channel
2. **Signal Strength**: Ensure good WiFi signal strength
3. **Interference**: Minimize interference from other devices
4. **Bandwidth**: Ensure sufficient bandwidth for your use case

### Server Optimization

1. **Memory**: Monitor memory usage with large datasets
2. **CPU**: Check CPU usage during peak times
3. **Storage**: Ensure sufficient storage for data files
4. **Logs**: Rotate log files to prevent disk space issues

## 🔄 Backup and Recovery

### Configuration Backup

```bash
# Backup static IP configuration
cp config/static-ip.json config/static-ip.json.backup

# Backup all configuration
tar -czf config-backup-$(date +%Y%m%d).tar.gz config/
```

### Recovery

```bash
# Restore static IP configuration
cp config/static-ip.json.backup config/static-ip.json

# Restore from backup
tar -xzf config-backup-20250127.tar.gz
```

## 📞 Support

### Getting Help

1. **Check the logs**: `tail -f logs/server.log`
2. **Network status**: `./network-status.sh`
3. **Configuration**: `cat config/static-ip.json`
4. **GitHub Issues**: Create an issue on the repository

### Common Commands

```bash
# Check network status
./network-status.sh

# View server logs
tail -f logs/server.log

# Check static IP configuration
cat config/static-ip.json

# Test connectivity
ping 192.168.1.200

# Check server status
curl http://192.168.1.200:3000/status
```

## 🎉 Success Indicators

You'll know static IP is working correctly when:

- ✅ Server starts with static IP address
- ✅ Network status shows "Static IP configured"
- ✅ Other devices can connect consistently
- ✅ Server URLs remain the same after network restarts
- ✅ Peer sync works reliably
- ✅ No IP address conflicts

---

**Last updated**: 2025-01-27  
**Version**: 1.0.0  
**Compatibility**: Termux on Android 7.0+ 