const express = require('express');
const router = express.Router();
const mobileOptimizer = require('../services/mobileOptimizer');
const { exec } = require('child_process');
const { promisify } = require('util');
const logger = require('../utils/logger');

const execAsync = promisify(exec);

// Get mobile device status
router.get('/mobile/status', async (req, res) => {
  try {
    const status = {
      ...mobileOptimizer.getStatus(),
      network: await getNetworkInfo(),
      system: await getSystemInfo(),
      services: await getServicesStatus()
    };
    
    res.json(status);
  } catch (error) {
    logger.error('Error getting mobile status:', error);
    res.status(500).json({ error: 'Failed to get mobile status' });
  }
});

// Get mobile device info
router.get('/mobile/info', async (req, res) => {
  try {
    const info = {
      device: await getDeviceInfo(),
      android: await getAndroidInfo(),
      hardware: await getHardwareInfo()
    };
    
    res.json(info);
  } catch (error) {
    logger.error('Error getting mobile info:', error);
    res.status(500).json({ error: 'Failed to get mobile info' });
  }
});

// Control mobile optimizations
router.post('/mobile/optimize', async (req, res) => {
  try {
    const { level } = req.body;
    
    if (level && ['power_save', 'balanced', 'performance'].includes(level)) {
      mobileOptimizer.optimizationLevel = level;
      mobileOptimizer.applyOptimizations();
      
      res.json({ 
        message: `Optimization level set to ${level}`,
        status: mobileOptimizer.getStatus()
      });
    } else {
      res.status(400).json({ error: 'Invalid optimization level' });
    }
  } catch (error) {
    logger.error('Error setting optimization level:', error);
    res.status(500).json({ error: 'Failed to set optimization level' });
  }
});

// Trigger storage cleanup
router.post('/mobile/cleanup', async (req, res) => {
  try {
    await mobileOptimizer.cleanupStorage();
    
    res.json({ 
      message: 'Storage cleanup completed',
      status: mobileOptimizer.getStatus()
    });
  } catch (error) {
    logger.error('Error during storage cleanup:', error);
    res.status(500).json({ error: 'Failed to cleanup storage' });
  }
});

// Get network information
async function getNetworkInfo() {
  try {
    const networkInfo = {};
    
    // Get WiFi info
    try {
      const { stdout: wifiInfo } = await execAsync('dumpsys wifi');
      const ssidMatch = wifiInfo.match(/SSID:\s*"([^"]+)"/);
      const signalMatch = wifiInfo.match(/RSSI:\s*(-?\d+)/);
      
      if (ssidMatch) networkInfo.wifi = { ssid: ssidMatch[1] };
      if (signalMatch) networkInfo.wifi.signal = parseInt(signalMatch[1]);
    } catch (error) {
      networkInfo.wifi = { error: 'Not available' };
    }
    
    // Get mobile data info
    try {
      const { stdout: mobileInfo } = await execAsync('dumpsys telephony.registry');
      const connectedMatch = mobileInfo.match(/mDataConnectionState=(\d+)/);
      
      if (connectedMatch) {
        networkInfo.mobile = { 
          connected: connectedMatch[1] === '2',
          state: connectedMatch[1]
        };
      }
    } catch (error) {
      networkInfo.mobile = { error: 'Not available' };
    }
    
    // Get IP addresses
    try {
      const { stdout: ipInfo } = await execAsync('ip addr show');
      const ipMatches = ipInfo.match(/inet\s+([0-9.]+)/g);
      
      if (ipMatches) {
        networkInfo.ips = ipMatches.map(match => match.replace('inet ', ''));
      }
    } catch (error) {
      networkInfo.ips = [];
    }
    
    return networkInfo;
  } catch (error) {
    return { error: 'Failed to get network info' };
  }
}

// Get system information
async function getSystemInfo() {
  try {
    const systemInfo = {};
    
    // Get uptime
    try {
      const { stdout: uptime } = await execAsync('uptime');
      systemInfo.uptime = uptime.trim();
    } catch (error) {
      systemInfo.uptime = 'Unknown';
    }
    
    // Get load average
    try {
      const { stdout: loadavg } = await execAsync('cat /proc/loadavg');
      const parts = loadavg.split(' ');
      systemInfo.loadAverage = {
        '1min': parseFloat(parts[0]),
        '5min': parseFloat(parts[1]),
        '15min': parseFloat(parts[2])
      };
    } catch (error) {
      systemInfo.loadAverage = { error: 'Not available' };
    }
    
    // Get CPU info
    try {
      const { stdout: cpuInfo } = await execAsync('cat /proc/cpuinfo');
      const cpuCount = (cpuInfo.match(/processor/g) || []).length;
      systemInfo.cpu = { cores: cpuCount };
    } catch (error) {
      systemInfo.cpu = { error: 'Not available' };
    }
    
    return systemInfo;
  } catch (error) {
    return { error: 'Failed to get system info' };
  }
}

// Get services status
async function getServicesStatus() {
  try {
    const services = {};
    
    // Check if backend is running
    try {
      const { stdout } = await execAsync('netstat -tlnp | grep :3001');
      services.backend = { running: true, port: 3001 };
    } catch (error) {
      services.backend = { running: false, port: 3001 };
    }
    
    // Check if frontend is running
    try {
      const { stdout } = await execAsync('netstat -tlnp | grep :3002');
      services.frontend = { running: true, port: 3002 };
    } catch (error) {
      services.frontend = { running: false, port: 3002 };
    }
    
    // Check if TCP server is running
    try {
      const { stdout } = await execAsync('netstat -tlnp | grep :3003');
      services.tcp = { running: true, port: 3003 };
    } catch (error) {
      services.tcp = { running: false, port: 3003 };
    }
    
    return services;
  } catch (error) {
    return { error: 'Failed to get services status' };
  }
}

// Get device information
async function getDeviceInfo() {
  try {
    const deviceInfo = {};
    
    // Get device model
    try {
      const { stdout: model } = await execAsync('getprop ro.product.model');
      deviceInfo.model = model.trim();
    } catch (error) {
      deviceInfo.model = 'Unknown';
    }
    
    // Get Android version
    try {
      const { stdout: version } = await execAsync('getprop ro.build.version.release');
      deviceInfo.androidVersion = version.trim();
    } catch (error) {
      deviceInfo.androidVersion = 'Unknown';
    }
    
    // Get API level
    try {
      const { stdout: apiLevel } = await execAsync('getprop ro.build.version.sdk');
      deviceInfo.apiLevel = parseInt(apiLevel.trim());
    } catch (error) {
      deviceInfo.apiLevel = 0;
    }
    
    // Get manufacturer
    try {
      const { stdout: manufacturer } = await execAsync('getprop ro.product.manufacturer');
      deviceInfo.manufacturer = manufacturer.trim();
    } catch (error) {
      deviceInfo.manufacturer = 'Unknown';
    }
    
    return deviceInfo;
  } catch (error) {
    return { error: 'Failed to get device info' };
  }
}

// Get Android system information
async function getAndroidInfo() {
  try {
    const androidInfo = {};
    
    // Get build number
    try {
      const { stdout: buildNumber } = await execAsync('getprop ro.build.number');
      androidInfo.buildNumber = buildNumber.trim();
    } catch (error) {
      androidInfo.buildNumber = 'Unknown';
    }
    
    // Get build date
    try {
      const { stdout: buildDate } = await execAsync('getprop ro.build.date');
      androidInfo.buildDate = buildDate.trim();
    } catch (error) {
      androidInfo.buildDate = 'Unknown';
    }
    
    // Get security patch
    try {
      const { stdout: securityPatch } = await execAsync('getprop ro.build.version.security_patch');
      androidInfo.securityPatch = securityPatch.trim();
    } catch (error) {
      androidInfo.securityPatch = 'Unknown';
    }
    
    return androidInfo;
  } catch (error) {
    return { error: 'Failed to get Android info' };
  }
}

// Get hardware information
async function getHardwareInfo() {
  try {
    const hardwareInfo = {};
    
    // Get total memory
    try {
      const { stdout: memInfo } = await execAsync('cat /proc/meminfo');
      const totalMatch = memInfo.match(/MemTotal:\s+(\d+)/);
      if (totalMatch) {
        hardwareInfo.totalMemory = parseInt(totalMatch[1]) * 1024; // Convert to bytes
      }
    } catch (error) {
      hardwareInfo.totalMemory = 0;
    }
    
    // Get available memory
    try {
      const { stdout: memInfo } = await execAsync('cat /proc/meminfo');
      const availableMatch = memInfo.match(/MemAvailable:\s+(\d+)/);
      if (availableMatch) {
        hardwareInfo.availableMemory = parseInt(availableMatch[1]) * 1024; // Convert to bytes
      }
    } catch (error) {
      hardwareInfo.availableMemory = 0;
    }
    
    // Get CPU architecture
    try {
      const { stdout: arch } = await execAsync('uname -m');
      hardwareInfo.architecture = arch.trim();
    } catch (error) {
      hardwareInfo.architecture = 'Unknown';
    }
    
    return hardwareInfo;
  } catch (error) {
    return { error: 'Failed to get hardware info' };
  }
}

module.exports = router; 