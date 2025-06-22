import React, { useState } from 'react';
import {
  Paper,
  Typography,
  Box,
  Button,
  Alert,
  Grid
} from '@mui/material';
import { Marker, Popup } from 'react-leaflet';
import SmartMap from './SmartMap';

const OfflineGridDemo = () => {
  const [showOfflineMode, setShowOfflineMode] = useState(false);

  // Sample device locations for demo
  const demoDevices = [
    {
      id: 1,
      name: 'Demo Device 1',
      latitude: -6.262428,
      longitude: 106.87698,
      status: 'Active'
    },
    {
      id: 2,
      name: 'Demo Device 2',
      latitude: -6.262576,
      longitude: 106.877006,
      status: 'Inactive'
    }
  ];

  return (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h5" gutterBottom>
            Offline Grid Demo
          </Typography>
          
          <Alert severity="info" sx={{ mb: 2 }}>
            This demo shows how the tracking system works with offline grid mode when internet is not available.
            Use the toggle button on the map to switch between online and offline modes.
          </Alert>

          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" gutterBottom>
              <strong>Features:</strong>
            </Typography>
            <ul>
              <li>Automatic detection of internet connectivity</li>
              <li>Fallback to coordinate grid when offline</li>
              <li>Manual toggle between online map and offline grid</li>
              <li>Coordinate labels on grid lines</li>
              <li>Responsive grid spacing based on zoom level</li>
            </ul>
          </Box>

          <Button
            variant="contained"
            onClick={() => setShowOfflineMode(!showOfflineMode)}
            sx={{ mb: 2 }}
          >
            {showOfflineMode ? 'Show Online Mode' : 'Show Offline Mode'}
          </Button>
        </Paper>
      </Grid>

      <Grid item xs={12}>
        <Paper sx={{ p: 2, height: 500 }}>
          <Typography variant="h6" gutterBottom>
            Interactive Map with Offline Grid Support
          </Typography>
          <SmartMap
            center={[-6.262428, 106.87698]}
            zoom={12}
            height="100%"
          >
            {demoDevices.map((device) => (
              <Marker 
                key={device.id}
                position={[device.latitude, device.longitude]}
              >
                <Popup>
                  <div>
                    <strong>{device.name}</strong><br />
                    <strong>Status:</strong> {device.status}<br />
                    <strong>Coordinates:</strong><br />
                    {device.latitude.toFixed(6)}, {device.longitude.toFixed(6)}
                  </div>
                </Popup>
              </Marker>
            ))}
          </SmartMap>
        </Paper>
      </Grid>

      <Grid item xs={12}>
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            How to Test Offline Mode
          </Typography>
          <Typography variant="body2" paragraph>
            <strong>Method 1 - Manual Toggle:</strong> Click the "📐 Grid" button on the top-left of the map to switch to offline grid mode.
          </Typography>
          <Typography variant="body2" paragraph>
            <strong>Method 2 - Disconnect Internet:</strong> Disconnect your internet connection and refresh the page. The map will automatically switch to offline grid mode.
          </Typography>
          <Typography variant="body2" paragraph>
            <strong>Method 3 - Block Map Tiles:</strong> Use browser developer tools to block requests to OpenStreetMap tile servers.
          </Typography>
          <Typography variant="body2">
            <strong>Grid Features:</strong> The offline grid shows coordinate lines with labels, making it easy to locate devices even without internet access.
          </Typography>
        </Paper>
      </Grid>
    </Grid>
  );
};

export default OfflineGridDemo; 