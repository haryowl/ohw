import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Grid,
  Checkbox,
  FormControlLabel,
  Tabs,
  Tab,
} from '@mui/material';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import RefreshIcon from '@mui/icons-material/Refresh';
import axios from 'axios';

const DataExport = () => {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedFields, setSelectedFields] = useState({
    timestamp: true,
    deviceImei: true,
    recordNumber: true,
    latitude: true,
    longitude: true,
    speed: true,
    direction: true,
    status: true,
    supplyVoltage: true,
    batteryVoltage: true,
    input0: true,
    input1: true,
    input2: true,
    input3: true,
    inputVoltage0: true,
    inputVoltage1: true,
    inputVoltage2: true,
    inputVoltage3: true,
    inputVoltage4: true,
    inputVoltage5: true,
    inputVoltage6: true,
    userData0: true,
    userData1: true,
    userData2: true,
    userData3: true,
    userData4: true,
    userData5: true,
    userData6: true,
    userData7: true,
    modbus0: true,
    modbus1: true,
    modbus2: true,
    modbus3: true,
    modbus4: true,
    modbus5: true,
    modbus6: true,
    modbus7: true,
    modbus8: true,
    modbus9: true,
    modbus10: true,
    modbus11: true,
    modbus12: true,
    modbus13: true,
    modbus14: true,
    modbus15: true
  });
  const [exportFormat, setExportFormat] = useState('csv');
  const [activeTab, setActiveTab] = useState(0);

  const fieldGroups = {
    'Basic Information': ['timestamp', 'deviceImei', 'recordNumber', 'latitude', 'longitude', 'speed', 'direction', 'status'],
    'Power Information': ['supplyVoltage', 'batteryVoltage'],
    'Input States': ['input0', 'input1', 'input2', 'input3'],
    'Input Voltages': ['inputVoltage0', 'inputVoltage1', 'inputVoltage2', 'inputVoltage3', 'inputVoltage4', 'inputVoltage5', 'inputVoltage6'],
    'User Data': ['userData0', 'userData1', 'userData2', 'userData3', 'userData4', 'userData5', 'userData6', 'userData7'],
    'Modbus Data': ['modbus0', 'modbus1', 'modbus2', 'modbus3', 'modbus4', 'modbus5', 'modbus6', 'modbus7', 'modbus8', 'modbus9', 'modbus10', 'modbus11', 'modbus12', 'modbus13', 'modbus14', 'modbus15']
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/records`, {
        params: {
          startDate: new Date(startDate).toISOString(),
          endDate: new Date(endDate).toISOString(),
        },
      });
      setRecords(response.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [startDate, endDate]);

  const handleExport = async () => {
    try {
      const response = await axios.post(
        `${process.env.REACT_APP_API_URL}/api/records/export`,
        {
          startDate: new Date(startDate).toISOString(),
          endDate: new Date(endDate).toISOString(),
          format: exportFormat,
          fields: Object.entries(selectedFields)
            .filter(([_, selected]) => selected)
            .map(([field]) => field),
        },
        {
          responseType: 'blob',
        }
      );

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `data-export.${exportFormat}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error exporting data:', error);
    }
  };

  const handleFieldToggle = (field) => {
    setSelectedFields((prev) => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Data Export
        </Typography>
        <Grid container spacing={3} alignItems="center">
          <Grid item xs={12} md={3}>
            <TextField
              fullWidth
              label="Start Date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              InputLabelProps={{
                shrink: true,
              }}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField
              fullWidth
              label="End Date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              InputLabelProps={{
                shrink: true,
              }}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth>
              <InputLabel>Export Format</InputLabel>
              <Select
                value={exportFormat}
                onChange={(e) => setExportFormat(e.target.value)}
                label="Export Format"
              >
                <MenuItem value="csv">CSV</MenuItem>
                <MenuItem value="json">JSON</MenuItem>
                <MenuItem value="xlsx">Excel</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={3}>
            <Button
              variant="contained"
              startIcon={<FileDownloadIcon />}
              onClick={handleExport}
              fullWidth
            >
              Export Data
            </Button>
          </Grid>
        </Grid>
      </Paper>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Select Fields to Export
        </Typography>
        <Tabs value={activeTab} onChange={handleTabChange} sx={{ mb: 2 }}>
          {Object.keys(fieldGroups).map((groupName, index) => (
            <Tab key={groupName} label={groupName} />
          ))}
        </Tabs>
        <Grid container spacing={2}>
          {Object.entries(fieldGroups)[activeTab][1].map((field) => (
            <Grid item xs={6} sm={4} md={3} key={field}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={selectedFields[field]}
                    onChange={() => handleFieldToggle(field)}
                  />
                }
                label={field.charAt(0).toUpperCase() + field.slice(1)}
              />
            </Grid>
          ))}
        </Grid>
      </Paper>

      <Paper sx={{ p: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6">Data Preview</Typography>
          <Button
            startIcon={<RefreshIcon />}
            onClick={fetchData}
            disabled={loading}
          >
            Refresh
          </Button>
        </Box>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                {Object.entries(selectedFields)
                  .filter(([_, selected]) => selected)
                  .map(([field]) => (
                    <TableCell key={field}>
                      {field.charAt(0).toUpperCase() + field.slice(1)}
                    </TableCell>
                  ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {records.map((record, index) => (
                <TableRow key={index}>
                  {Object.entries(selectedFields)
                    .filter(([_, selected]) => selected)
                    .map(([field]) => (
                      <TableCell key={field}>
                        {field === 'timestamp'
                          ? new Date(record[field]).toLocaleString()
                          : typeof record[field] === 'object'
                          ? JSON.stringify(record[field])
                          : record[field]}
                      </TableCell>
                    ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Container>
  );
};

export default DataExport; 