// frontend/src/pages/DeviceDetail.js

import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import {
  Container,
  Grid,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from '@mui/material';
import { Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import useWebSocket from '../hooks/useWebSocket';
import SmartMap from '../components/SmartMap';

const DeviceDetail = () => {
  const { deviceId } = useParams();
  const [device, setDevice] = useState(null);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadDeviceData = useCallback(async () => {
    try {
      const [deviceResponse, dataResponse] = await Promise.all([
        fetch(`${process.env.REACT_APP_API_URL}/api/devices/${deviceId}`),
        fetch(`${process.env.REACT_APP_API_URL}/api/data/${deviceId}`)
      ]);

      const deviceData = await deviceResponse.json();
      const deviceHistory = await dataResponse.json();

      setDevice(deviceData);
      setData(deviceHistory);
      setLoading(false);
    } catch (error) {
      console.error('Error loading device data:', error);
      setLoading(false);
    }
  }, [deviceId]);

  const handleWebSocketMessage = (message) => {
    if (message.type === 'deviceUpdate' && message.data.deviceId === deviceId) {
      setDevice(prev => ({ ...prev, ...message.data }));
    } else if (message.type === 'dataUpdate' && message.data.deviceId === deviceId) {
      setData(prev => [...prev, message.data]);
    }
  };

  const ws = useWebSocket('ws://localhost:3000', handleWebSocketMessage);

  useEffect(() => {
    loadDeviceData();
  }, [loadDeviceData, ws]);

  if (loading) {
    return (
      <Container>
        <Typography>Loading...</Typography>
      </Container>
    );
  }

  if (!device) {
    return (
      <Container>
        <Typography>Device not found</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h4" gutterBottom>
              {device.name}
            </Typography>
            <Typography variant="subtitle1">
              IMEI: {device.imei}
            </Typography>
            <Typography variant="subtitle1">
              Status: {device.status}
            </Typography>
            <Typography variant="subtitle1">
              Last Seen: {new Date(device.lastSeen).toLocaleString()}
            </Typography>
          </Paper>
        </Grid>

        {device.latitude && device.longitude && (
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2, height: 400 }}>
              <Typography variant="h6" gutterBottom>
                Location
              </Typography>
              <SmartMap
                center={[device.latitude, device.longitude]}
                zoom={13}
                height="100%"
              >
                <Marker position={[device.latitude, device.longitude]}>
                  <Popup>
                    {device.name}
                  </Popup>
                </Marker>
              </SmartMap>
            </Paper>
          </Grid>
        )}

        <Grid item xs={12} md={device.latitude && device.longitude ? 6 : 12}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Recent Data
            </Typography>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Timestamp</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Value</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        {new Date(item.timestamp).toLocaleString()}
                      </TableCell>
                      <TableCell>{item.type}</TableCell>
                      <TableCell>{item.value}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default DeviceDetail;
