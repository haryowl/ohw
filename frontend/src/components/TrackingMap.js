import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Paper,
  Typography,
  Box,
  Chip,
  Card,
  CardContent,
  Grid,
  CircularProgress,
  Alert,
  IconButton,
  Tooltip
} from '@mui/material';
import { Refresh, Memory, Speed } from '@mui/icons-material';
import { Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import SmartMap from './SmartMap';
import useWebSocket from '../hooks/useWebSocket';

// Fix for default markers in react-leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

const TrackingMap = ({ height = 400, showInfo = true, maxDevices = 50 }) => {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [mapCenter, setMapCenter] = useState([0, 0]);
  const [mapZoom, setMapZoom] = useState(2);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [stats, setStats] = useState({
    totalDevices: 0,
    devicesWithLocation: 0,
    lastUpdateTime: null,
    memoryUsage: 0
  });

  // WebSocket connection for real-time updates
  const handleWebSocketMessage = useCallback((message) => {
    if (message.type === 'deviceData' && message.data) {
      setDevices(prevDevices => {
        const deviceIndex = prevDevices.findIndex(d => d.imei === message.deviceId);
        const updatedDevice = {
          ...prevDevices[deviceIndex],
          location: {
            latitude: message.data.latitude,
            longitude: message.data.longitude,
            timestamp: new Date().toISOString(),
            speed: message.data.speed,
            direction: message.data.direction
          }
        };

        if (deviceIndex >= 0) {
          // Update existing device
          const newDevices = [...prevDevices];
          newDevices[deviceIndex] = updatedDevice;
          return newDevices;
        } else {
          // Add new device
          return [...prevDevices, {
            imei: message.deviceId,
            name: message.deviceId,
            location: updatedDevice.location
          }].slice(-maxDevices); // Keep only the latest devices
        }
      });
    }
  }, [maxDevices]);

  const { getConnectionStatus, getQueueStats } = useWebSocket(
    null,
    handleWebSocketMessage,
    {
      throttleInterval: 200, // Throttle updates to prevent UI blocking
      maxMessageQueueSize: 50,
      heartbeatInterval: 30000
    }
  );

  // Load devices with locations
  const loadDevicesWithLocations = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/devices/locations`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const devicesData = await response.json();
      
      // Limit devices to prevent memory issues
      const limitedDevices = devicesData.slice(0, maxDevices);
      
      setDevices(limitedDevices);
      setLastUpdate(new Date());
      
      // Update statistics
      setStats(prev => ({
        ...prev,
        totalDevices: devicesData.length,
        devicesWithLocation: limitedDevices.filter(d => d.location).length,
        lastUpdateTime: new Date().toISOString(),
        memoryUsage: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1024 / 1024) : 0
      }));
      
      // Set map center to first device with location or default
      const devicesWithLocation = limitedDevices.filter(device => device.location);
      if (devicesWithLocation.length > 0) {
        setMapCenter([devicesWithLocation[0].location.latitude, devicesWithLocation[0].location.longitude]);
        setMapZoom(10);
      }
    } catch (error) {
      console.error('Error loading devices with locations:', error);
      setError(`Failed to load devices: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }, [maxDevices]);

  // Initial load
  useEffect(() => {
    loadDevicesWithLocations();
  }, [loadDevicesWithLocations]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (getConnectionStatus() === 'disconnected') {
        loadDevicesWithLocations();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [loadDevicesWithLocations, getConnectionStatus]);

  // Memoize devices with location to prevent unnecessary re-renders
  const devicesWithLocation = useMemo(() => {
    return devices.filter(device => device.location);
  }, [devices]);

  // Memoize map markers to prevent unnecessary re-renders
  const mapMarkers = useMemo(() => {
    return devicesWithLocation.map((device) => (
      <Marker 
        key={device.imei}
        position={[device.location.latitude, device.location.longitude]}
      >
        <Popup>
          <div>
            <strong>{device.name || device.imei}</strong><br />
            <strong>IMEI:</strong> {device.imei}<br />
            <strong>Last Seen:</strong> {new Date(device.location.timestamp).toLocaleString()}<br />
            {device.location.speed && (
              <><strong>Speed:</strong> {device.location.speed} km/h<br /></>
            )}
            {device.location.direction && (
              <><strong>Direction:</strong> {device.location.direction}°<br /></>
            )}
            <strong>Coordinates:</strong><br />
            {device.location.latitude.toFixed(6)}, {device.location.longitude.toFixed(6)}
          </div>
        </Popup>
      </Marker>
    ));
  }, [devicesWithLocation]);

  // Handle refresh
  const handleRefresh = useCallback(() => {
    loadDevicesWithLocations();
  }, [loadDevicesWithLocations]);

  if (loading) {
    return (
      <Paper sx={{ p: 2, height }}>
        <Box display="flex" alignItems="center" justifyContent="center" height="100%">
          <CircularProgress />
          <Typography sx={{ ml: 2 }}>Loading devices...</Typography>
        </Box>
      </Paper>
    );
  }

  const connectionStatus = getConnectionStatus();
  const queueStats = getQueueStats();

  return (
    <Grid container spacing={2}>
      <Grid item xs={12} md={showInfo ? 8 : 12}>
        <Paper sx={{ p: 2, height }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6" gutterBottom>
              Device Locations
            </Typography>
            <Box display="flex" alignItems="center" gap={1}>
              <Chip 
                label={connectionStatus} 
                color={connectionStatus === 'connected' ? 'success' : 'warning'}
                size="small"
              />
              {queueStats.queueSize > 0 && (
                <Chip 
                  label={`Queue: ${queueStats.queueSize}`}
                  color="info"
                  size="small"
                />
              )}
              <Tooltip title="Refresh">
                <IconButton onClick={handleRefresh} size="small">
                  <Refresh />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
          
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          
          <SmartMap
            center={mapCenter}
            zoom={mapZoom}
            height="calc(100% - 80px)"
          >
            {mapMarkers}
          </SmartMap>
        </Paper>
      </Grid>

      {showInfo && (
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, height, overflow: 'auto' }}>
            <Typography variant="h6" gutterBottom>
              Device Status
            </Typography>
            
            {/* Statistics */}
            <Box sx={{ mb: 2 }}>
              <Grid container spacing={1}>
                <Grid item xs={6}>
                  <Card sx={{ p: 1, textAlign: 'center' }}>
                    <Typography variant="h6" color="primary">
                      {stats.totalDevices}
                    </Typography>
                    <Typography variant="caption">Total Devices</Typography>
                  </Card>
                </Grid>
                <Grid item xs={6}>
                  <Card sx={{ p: 1, textAlign: 'center' }}>
                    <Typography variant="h6" color="success.main">
                      {stats.devicesWithLocation}
                    </Typography>
                    <Typography variant="caption">With Location</Typography>
                  </Card>
                </Grid>
              </Grid>
            </Box>
            
            {/* Connection Info */}
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Connection Status
              </Typography>
              <Box display="flex" alignItems="center" gap={1} mb={1}>
                <Speed fontSize="small" />
                <Typography variant="caption">
                  {connectionStatus === 'connected' ? 'Real-time updates' : 'Polling mode'}
                </Typography>
              </Box>
              {stats.memoryUsage > 0 && (
                <Box display="flex" alignItems="center" gap={1}>
                  <Memory fontSize="small" />
                  <Typography variant="caption">
                    Memory: {stats.memoryUsage} MB
                  </Typography>
                </Box>
              )}
            </Box>
            
            {devicesWithLocation.length > 0 ? (
              <Box>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  {devicesWithLocation.length} devices with location data
                </Typography>
                
                {/* Virtual scrolling for device list */}
                <Box sx={{ maxHeight: 'calc(100% - 200px)', overflow: 'auto' }}>
                  {devicesWithLocation.map((device) => (
                    <Card key={device.imei} sx={{ mb: 1 }}>
                      <CardContent sx={{ py: 1 }}>
                        <Typography variant="subtitle2" gutterBottom>
                          {device.name || device.imei}
                        </Typography>
                        <Typography variant="caption" display="block">
                          <strong>IMEI:</strong> {device.imei}
                        </Typography>
                        <Typography variant="caption" display="block">
                          <strong>Last Seen:</strong> {new Date(device.location.timestamp).toLocaleString()}
                        </Typography>
                        <Box sx={{ mt: 1 }}>
                          <Chip 
                            label={`${device.location.latitude.toFixed(4)}, ${device.location.longitude.toFixed(4)}`} 
                            size="small" 
                            sx={{ mr: 1, mb: 1 }}
                          />
                          {device.location.speed && (
                            <Chip 
                              label={`${device.location.speed} km/h`} 
                              size="small" 
                              color="primary" 
                              sx={{ mr: 1, mb: 1 }}
                            />
                          )}
                          {device.location.direction && (
                            <Chip 
                              label={`${device.location.direction}°`} 
                              size="small" 
                              color="secondary" 
                              sx={{ mb: 1 }}
                            />
                          )}
                        </Box>
                      </CardContent>
                    </Card>
                  ))}
                </Box>
              </Box>
            ) : (
              <Typography variant="body2" color="text.secondary">
                No devices with location data available.
              </Typography>
            )}
          </Paper>
        </Grid>
      )}
    </Grid>
  );
};

export default TrackingMap; 