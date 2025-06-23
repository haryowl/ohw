import React, { useState, useEffect } from 'react';
import {
  Container,
  Grid,
  Paper,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Button,
  Box,
  Card,
  CardContent,
  Chip,
  Alert
} from '@mui/material';
import { Marker, Popup, Polyline } from 'react-leaflet';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import SmartMap from '../components/SmartMap';

// Fix for default markers in react-leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

const Tracking = () => {
  const [devices, setDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState('');
  const [startDate, setStartDate] = useState(new Date(Date.now() - 24 * 60 * 60 * 1000)); // 24 hours ago
  const [endDate, setEndDate] = useState(new Date());
  const [trackingData, setTrackingData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mapCenter, setMapCenter] = useState([0, 0]);
  const [mapZoom, setMapZoom] = useState(2);
  const [debugInfo, setDebugInfo] = useState('');

  // Load devices
  useEffect(() => {
    const loadDevices = async () => {
      try {
        console.log('Loading devices...');
        const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001';
        const response = await fetch(`${apiUrl}/api/devices`);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const devicesData = await response.json();
        console.log('Devices loaded:', devicesData);
        setDevices(devicesData);
        setDebugInfo(`Loaded ${devicesData.length} devices`);
      } catch (error) {
        console.error('Error loading devices:', error);
        setError(`Failed to load devices: ${error.message}`);
        setDebugInfo(`Error: ${error.message}`);
      }
    };
    loadDevices();
  }, []);

  // Load tracking data
  const loadTrackingData = async () => {
    if (!selectedDevice) {
      setError('Please select a device');
      return;
    }

    setLoading(true);
    setError('');
    setDebugInfo('Loading tracking data...');

    try {
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001';
      const params = new URLSearchParams({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      });

      const url = `${apiUrl}/api/data/${selectedDevice}/tracking?${params}`;
      console.log('Fetching tracking data from:', url);

      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Tracking data received:', data);
      setTrackingData(data);
      setDebugInfo(`Loaded ${data.length} tracking points`);

      // Set map center to first point or default
      if (data.length > 0) {
        setMapCenter([data[0].latitude, data[0].longitude]);
        setMapZoom(13);
      }
    } catch (error) {
      console.error('Error loading tracking data:', error);
      setError(`Failed to load tracking data: ${error.message}`);
      setDebugInfo(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Create polyline coordinates for the track
  const trackCoordinates = trackingData.map(point => [point.latitude, point.longitude]);

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Grid container spacing={3}>
        {/* Controls */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h5" gutterBottom>
              Device Tracking
            </Typography>
            
            {/* Debug Info */}
            {debugInfo && (
              <Alert severity="info" sx={{ mb: 2 }}>
                Debug: {debugInfo}
              </Alert>
            )}
            
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={3}>
                <FormControl fullWidth>
                  <InputLabel>Device</InputLabel>
                  <Select
                    value={selectedDevice}
                    onChange={(e) => setSelectedDevice(e.target.value)}
                    label="Device"
                  >
                    {devices.map((device) => (
                      <MenuItem key={device.imei} value={device.imei}>
                        {device.name || device.imei}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} md={3}>
                <LocalizationProvider dateAdapter={AdapterDateFns}>
                  <DateTimePicker
                    label="Start Date"
                    value={startDate}
                    onChange={setStartDate}
                    renderInput={(params) => <TextField {...params} fullWidth />}
                  />
                </LocalizationProvider>
              </Grid>
              
              <Grid item xs={12} md={3}>
                <LocalizationProvider dateAdapter={AdapterDateFns}>
                  <DateTimePicker
                    label="End Date"
                    value={endDate}
                    onChange={setEndDate}
                    renderInput={(params) => <TextField {...params} fullWidth />}
                  />
                </LocalizationProvider>
              </Grid>
              
              <Grid item xs={12} md={3}>
                <Button
                  variant="contained"
                  onClick={loadTrackingData}
                  disabled={loading || !selectedDevice}
                  fullWidth
                >
                  {loading ? 'Loading...' : 'Load Track'}
                </Button>
              </Grid>
            </Grid>

            {error && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {error}
              </Alert>
            )}
          </Paper>
        </Grid>

        {/* Map */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 2, height: 600 }}>
            <Typography variant="h6" gutterBottom>
              Track Map
            </Typography>
            <SmartMap
              center={mapCenter}
              zoom={mapZoom}
              height="100%"
            >
              {/* Track line */}
              {trackCoordinates.length > 1 && (
                <Polyline
                  positions={trackCoordinates}
                  color="blue"
                  weight={3}
                  opacity={0.7}
                />
              )}
              
              {/* Start marker */}
              {trackingData.length > 0 && (
                <Marker position={[trackingData[0].latitude, trackingData[0].longitude]}>
                  <Popup>
                    <div>
                      <strong>Start Point</strong><br />
                      Time: {new Date(trackingData[0].timestamp).toLocaleString()}<br />
                      Speed: {trackingData[0].speed || 0} km/h<br />
                      Direction: {trackingData[0].direction || 0}°
                    </div>
                  </Popup>
                </Marker>
              )}
              
              {/* End marker */}
              {trackingData.length > 1 && (
                <Marker position={[trackingData[trackingData.length - 1].latitude, trackingData[trackingData.length - 1].longitude]}>
                  <Popup>
                    <div>
                      <strong>End Point</strong><br />
                      Time: {new Date(trackingData[trackingData.length - 1].timestamp).toLocaleString()}<br />
                      Speed: {trackingData[trackingData.length - 1].speed || 0} km/h<br />
                      Direction: {trackingData[trackingData.length - 1].direction || 0}°
                    </div>
                  </Popup>
                </Marker>
              )}
            </SmartMap>
          </Paper>
        </Grid>

        {/* Track Info */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, height: 600, overflow: 'auto' }}>
            <Typography variant="h6" gutterBottom>
              Track Information
            </Typography>
            
            {trackingData.length > 0 ? (
              <Box>
                <Card sx={{ mb: 2 }}>
                  <CardContent>
                    <Typography variant="subtitle1" gutterBottom>
                      Track Summary
                    </Typography>
                    <Typography variant="body2">
                      <strong>Points:</strong> {trackingData.length}<br />
                      <strong>Duration:</strong> {trackingData.length > 1 
                        ? `${Math.round((new Date(trackingData[trackingData.length - 1].timestamp) - new Date(trackingData[0].timestamp)) / (1000 * 60 * 60))} hours`
                        : 'N/A'}<br />
                      <strong>Start:</strong> {new Date(trackingData[0].timestamp).toLocaleString()}<br />
                      <strong>End:</strong> {new Date(trackingData[trackingData.length - 1].timestamp).toLocaleString()}
                    </Typography>
                  </CardContent>
                </Card>

                <Typography variant="subtitle1" gutterBottom>
                  Recent Points
                </Typography>
                
                {trackingData.slice(-10).reverse().map((point, index) => (
                  <Card key={index} sx={{ mb: 1 }}>
                    <CardContent sx={{ py: 1 }}>
                      <Typography variant="body2">
                        <strong>{new Date(point.timestamp).toLocaleString()}</strong><br />
                        <Chip 
                          label={`${point.latitude.toFixed(6)}, ${point.longitude.toFixed(6)}`} 
                          size="small" 
                          sx={{ mr: 1, mb: 1 }}
                        />
                        {point.speed && (
                          <Chip 
                            label={`${point.speed} km/h`} 
                            size="small" 
                            color="primary" 
                            sx={{ mr: 1, mb: 1 }}
                          />
                        )}
                        {point.direction && (
                          <Chip 
                            label={`${point.direction}°`} 
                            size="small" 
                            color="secondary" 
                            sx={{ mb: 1 }}
                          />
                        )}
                      </Typography>
                    </CardContent>
                  </Card>
                ))}
              </Box>
            ) : (
              <Typography variant="body2" color="text.secondary">
                No tracking data available. Select a device and time period to view the track.
              </Typography>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default Tracking; 