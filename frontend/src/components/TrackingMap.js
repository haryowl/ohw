import React, { useState, useEffect } from 'react';
import {
  Paper,
  Typography,
  Box,
  Chip,
  Card,
  CardContent,
  Grid
} from '@mui/material';
import { Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import SmartMap from './SmartMap';

// Fix for default markers in react-leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

const TrackingMap = ({ height = 400, showInfo = true }) => {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mapCenter, setMapCenter] = useState([0, 0]);
  const [mapZoom, setMapZoom] = useState(2);

  useEffect(() => {
    const loadDevicesWithLocations = async () => {
      try {
        const response = await fetch(`${process.env.REACT_APP_API_URL}/api/devices/locations`);
        const devicesData = await response.json();
        setDevices(devicesData);
        
        // Set map center to first device with location or default
        const devicesWithLocation = devicesData.filter(device => device.location);
        if (devicesWithLocation.length > 0) {
          setMapCenter([devicesWithLocation[0].location.latitude, devicesWithLocation[0].location.longitude]);
          setMapZoom(10);
        }
      } catch (error) {
        console.error('Error loading devices with locations:', error);
      } finally {
        setLoading(false);
      }
    };

    loadDevicesWithLocations();
  }, []);

  if (loading) {
    return (
      <Paper sx={{ p: 2, height }}>
        <Typography>Loading devices...</Typography>
      </Paper>
    );
  }

  const devicesWithLocation = devices.filter(device => device.location);

  return (
    <Grid container spacing={2}>
      <Grid item xs={12} md={showInfo ? 8 : 12}>
        <Paper sx={{ p: 2, height }}>
          <Typography variant="h6" gutterBottom>
            Device Locations
          </Typography>
          <SmartMap
            center={mapCenter}
            zoom={mapZoom}
            height="100%"
          >
            {devicesWithLocation.map((device) => (
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
            ))}
          </SmartMap>
        </Paper>
      </Grid>

      {showInfo && (
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, height, overflow: 'auto' }}>
            <Typography variant="h6" gutterBottom>
              Device Status
            </Typography>
            
            {devicesWithLocation.length > 0 ? (
              <Box>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  {devicesWithLocation.length} devices with location data
                </Typography>
                
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