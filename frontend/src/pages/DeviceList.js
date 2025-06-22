import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Button,
  Box
} from '@mui/material';
import { LocationOn as LocationIcon } from '@mui/icons-material';

const DeviceList = () => {
  const navigate = useNavigate();

  // Sample data
  const devices = [
    {
      id: 1,
      name: 'Device 1',
      imei: '123456789012345',
      status: 'Active',
      lastSeen: new Date().toISOString()
    },
    {
      id: 2,
      name: 'Device 2',
      imei: '987654321098765',
      status: 'Inactive',
      lastSeen: null
    }
  ];

  const handleDeviceClick = (deviceId) => {
    navigate(`/devices/${deviceId}`);
  };

  const handleTrackingClick = () => {
    navigate('/tracking');
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Devices
        </Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<LocationIcon />}
          onClick={handleTrackingClick}
        >
          View Tracking
        </Button>
      </Box>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>IMEI</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Last Seen</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {devices.map((device) => (
              <TableRow key={device.id}>
                <TableCell>{device.name}</TableCell>
                <TableCell>{device.imei}</TableCell>
                <TableCell>{device.status}</TableCell>
                <TableCell>
                  {device.lastSeen ? new Date(device.lastSeen).toLocaleString() : 'Never'}
                </TableCell>
                <TableCell>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={() => handleDeviceClick(device.id)}
                  >
                    View Details
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Container>
  );
};

export default DeviceList; 