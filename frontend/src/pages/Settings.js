import React, { useState, useEffect, useCallback } from 'react';
import {
  Container,
  Paper,
  Typography,
  Grid,
  TextField,
  Button,
  Switch,
  FormControlLabel,
  Box,
  Alert,
  Snackbar,
  Card,
  CardContent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  LinearProgress,
  Chip
} from '@mui/material';
import {
  Save as SaveIcon,
  Backup as BackupIcon,
  Restore as RestoreIcon,
  Delete as DeleteIcon,
  FileDownload as ExportIcon,
  FileUpload as ImportIcon,
  Refresh as RefreshIcon,
  Memory as MemoryIcon,
  Storage as StorageIcon,
  Speed as SpeedIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon
} from '@mui/icons-material';
import axios from 'axios';
import { BASE_URL } from '../services/api';

const Settings = () => {
  const [settings, setSettings] = useState({
    serverUrl: BASE_URL || '',
    wsUrl: BASE_URL.replace('http', 'ws') || '',
    dataRetentionDays: 30,
    enableNotifications: true,
    enableAutoRefresh: true,
    refreshInterval: 30,
    enableDataExport: true,
    exportFormat: 'csv',
    enableDebugLogging: false
  });

  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  const [backups, setBackups] = useState([]);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [backupDialogOpen, setBackupDialogOpen] = useState(false);
  const [backupName, setBackupName] = useState('');
  const [systemStatus, setSystemStatus] = useState({
    cpu: 0,
    memory: 0,
    disk: 0,
    uptime: 0,
    activeConnections: 0,
    lastUpdate: null
  });
  const [isLoadingStatus, setIsLoadingStatus] = useState(false);
  const [systemHealth, setSystemHealth] = useState({
    status: 'unknown',
    checks: [],
    lastCheck: null
  });
  const [isCheckingHealth, setIsCheckingHealth] = useState(false);

  const showSnackbar = (message, severity) => {
    setSnackbar({
      open: true,
      message,
      severity
    });
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const fetchSettings = useCallback(async () => {
    try {
      const response = await axios.get(`${BASE_URL}/api/settings`);
      setSettings(response.data);
    } catch (error) {
      console.error('Error fetching settings:', error);
      showSnackbar('Error loading settings', 'error');
    }
  }, []);

  const fetchBackups = async () => {
    try {
      const response = await axios.get(`${BASE_URL}/api/settings/backups`);
      setBackups(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Error fetching backups:', error);
      setBackups([]);
    }
  };

  const fetchSystemStatus = async () => {
    setIsLoadingStatus(true);
    try {
      const response = await axios.get(`${BASE_URL}/api/settings/status`);
      setSystemStatus({
        ...response.data,
        lastUpdate: new Date()
      });
    } catch (error) {
      console.error('Error fetching system status:', error);
    } finally {
      setIsLoadingStatus(false);
    }
  };

  const checkSystemHealth = async () => {
    setIsCheckingHealth(true);
    try {
      const response = await axios.get(`${BASE_URL}/api/settings/health`);
      setSystemHealth({
        ...response.data,
        lastCheck: new Date()
      });
    } catch (error) {
      console.error('Error checking system health:', error);
    } finally {
      setIsCheckingHealth(false);
    }
  };

  useEffect(() => {
    fetchSettings();
    fetchBackups();
    fetchSystemStatus();
    checkSystemHealth();
    const statusInterval = setInterval(fetchSystemStatus, 30000); // Update every 30 seconds
    const healthInterval = setInterval(checkSystemHealth, 60000); // Check every minute
    return () => {
      clearInterval(statusInterval);
      clearInterval(healthInterval);
    };
  }, [fetchSettings]);

  const handleSave = async () => {
    try {
      await axios.put(`${BASE_URL}/api/settings`, settings);
      showSnackbar('Settings saved successfully', 'success');
    } catch (error) {
      console.error('Error saving settings:', error);
      showSnackbar('Error saving settings', 'error');
    }
  };

  const handleCreateBackup = async () => {
    try {
      await axios.post(`${BASE_URL}/api/settings/backups`, {
        name: backupName || `Backup_${new Date().toISOString()}`
      });
      setBackupDialogOpen(false);
      setBackupName('');
      fetchBackups();
      setSnackbar({ open: true, message: 'Backup created successfully', severity: 'success' });
    } catch (error) {
      console.error('Error creating backup:', error);
      setSnackbar({ open: true, message: 'Error creating backup', severity: 'error' });
    }
  };

  const handleRestoreBackup = async (backupId) => {
    try {
      await axios.post(`${BASE_URL}/api/settings/backups/${backupId}/restore`);
      fetchSettings();
      setSnackbar({ open: true, message: 'Settings restored successfully', severity: 'success' });
    } catch (error) {
      console.error('Error restoring backup:', error);
      setSnackbar({ open: true, message: 'Error restoring backup', severity: 'error' });
    }
  };

  const handleDeleteBackup = async (backupId) => {
    try {
      await axios.delete(`${BASE_URL}/api/settings/backups/${backupId}`);
      fetchBackups();
      setSnackbar({ open: true, message: 'Backup deleted successfully', severity: 'success' });
    } catch (error) {
      console.error('Error deleting backup:', error);
      setSnackbar({ open: true, message: 'Error deleting backup', severity: 'error' });
    }
  };

  const handleExportSettings = async () => {
    try {
      const response = await axios.get(`${BASE_URL}/api/settings/export`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'settings.json');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error exporting settings:', error);
      setSnackbar({ open: true, message: 'Error exporting settings', severity: 'error' });
    }
  };

  const handleImportSettings = async () => {
    if (!selectedFile) return;

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      await axios.post(`${BASE_URL}/api/settings/import`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      setImportDialogOpen(false);
      setSelectedFile(null);
      fetchSettings();
      setSnackbar({ open: true, message: 'Settings imported successfully', severity: 'success' });
    } catch (error) {
      console.error('Error importing settings:', error);
      setSnackbar({ open: true, message: 'Error importing settings', severity: 'error' });
    }
  };

  const formatUptime = (seconds) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${days}d ${hours}h ${minutes}m`;
  };

  const getHealthStatusColor = (status) => {
    if (!status) return 'default';
    switch (status.toLowerCase()) {
      case 'healthy':
        return 'success';
      case 'warning':
        return 'warning';
      case 'error':
        return 'error';
      default:
        return 'default';
    }
  };

  const getHealthStatusIcon = (status) => {
    if (!status) return <ErrorIcon />;
    switch (status.toLowerCase()) {
      case 'healthy':
        return <CheckCircleIcon />;
      case 'warning':
        return <WarningIcon />;
      case 'error':
        return <ErrorIcon />;
      default:
        return <ErrorIcon />;
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Settings
        </Typography>
        <Box>
          <Button
            variant="outlined"
            startIcon={<BackupIcon />}
            onClick={() => setBackupDialogOpen(true)}
            sx={{ mr: 2 }}
          >
            Create Backup
          </Button>
          <Button
            variant="outlined"
            startIcon={<ExportIcon />}
            onClick={handleExportSettings}
            sx={{ mr: 2 }}
          >
            Export
          </Button>
          <Button
            variant="outlined"
            startIcon={<ImportIcon />}
            onClick={() => setImportDialogOpen(true)}
            sx={{ mr: 2 }}
          >
            Import
          </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={<SaveIcon />}
            onClick={handleSave}
          >
            Save Changes
          </Button>
        </Box>
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6">System Health</Typography>
                <Button
                  startIcon={<RefreshIcon />}
                  onClick={checkSystemHealth}
                  disabled={isCheckingHealth}
                >
                  Check Health
                </Button>
              </Box>
              <Box display="flex" alignItems="center" mb={2}>
                <Chip
                  icon={getHealthStatusIcon(systemHealth?.status)}
                  label={(systemHealth?.status || 'unknown').toUpperCase()}
                  color={getHealthStatusColor(systemHealth?.status)}
                  sx={{ mr: 2 }}
                />
                {systemHealth?.lastCheck && (
                  <Typography variant="body2" color="text.secondary">
                    Last checked: {systemHealth.lastCheck.toLocaleString()}
                  </Typography>
                )}
              </Box>
              <List>
                {(systemHealth?.checks || []).map((check, index) => (
                  <ListItem key={index}>
                    <ListItemText
                      primary={check.name}
                      secondary={check.message}
                    />
                    <ListItemSecondaryAction>
                      <Chip
                        icon={getHealthStatusIcon(check.status)}
                        label={(check.status || 'unknown').toUpperCase()}
                        color={getHealthStatusColor(check.status)}
                        size="small"
                      />
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6">System Status</Typography>
                <Button
                  startIcon={<RefreshIcon />}
                  onClick={fetchSystemStatus}
                  disabled={isLoadingStatus}
                >
                  Refresh
                </Button>
              </Box>
              <Grid container spacing={3}>
                <Grid item xs={12} md={4}>
                  <Box display="flex" alignItems="center" mb={1}>
                    <MemoryIcon sx={{ mr: 1 }} />
                    <Typography variant="subtitle1">CPU Usage</Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={systemStatus.cpu}
                    color={systemStatus.cpu > 80 ? 'error' : systemStatus.cpu > 60 ? 'warning' : 'primary'}
                    sx={{ height: 10, borderRadius: 5 }}
                  />
                  <Typography variant="body2" color="text.secondary" mt={1}>
                    {systemStatus.cpu}%
                  </Typography>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Box display="flex" alignItems="center" mb={1}>
                    <StorageIcon sx={{ mr: 1 }} />
                    <Typography variant="subtitle1">Memory Usage</Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={systemStatus.memory}
                    color={systemStatus.memory > 80 ? 'error' : systemStatus.memory > 60 ? 'warning' : 'primary'}
                    sx={{ height: 10, borderRadius: 5 }}
                  />
                  <Typography variant="body2" color="text.secondary" mt={1}>
                    {systemStatus.memory}%
                  </Typography>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Box display="flex" alignItems="center" mb={1}>
                    <SpeedIcon sx={{ mr: 1 }} />
                    <Typography variant="subtitle1">Disk Usage</Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={systemStatus.disk}
                    color={systemStatus.disk > 80 ? 'error' : systemStatus.disk > 60 ? 'warning' : 'primary'}
                    sx={{ height: 10, borderRadius: 5 }}
                  />
                  <Typography variant="body2" color="text.secondary" mt={1}>
                    {systemStatus.disk}%
                  </Typography>
                </Grid>
              </Grid>
              <Box mt={3}>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <Typography variant="body2" color="text.secondary">
                      Uptime: {formatUptime(systemStatus.uptime)}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="body2" color="text.secondary">
                      Active Connections: {systemStatus.activeConnections}
                    </Typography>
                  </Grid>
                </Grid>
              </Box>
              {systemStatus.lastUpdate && (
                <Typography variant="caption" color="text.secondary" display="block" mt={1}>
                  Last updated: {systemStatus.lastUpdate.toLocaleString()}
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Server Configuration
            </Typography>
            <TextField
              fullWidth
              label="Server URL"
              value={settings.serverUrl}
              onChange={(e) => setSettings({ ...settings, serverUrl: e.target.value })}
              margin="normal"
            />
            <TextField
              fullWidth
              label="WebSocket URL"
              value={settings.wsUrl}
              onChange={(e) => setSettings({ ...settings, wsUrl: e.target.value })}
              margin="normal"
            />
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Data Management
            </Typography>
            <TextField
              fullWidth
              type="number"
              label="Data Retention (days)"
              value={settings.dataRetentionDays}
              onChange={(e) => setSettings({ ...settings, dataRetentionDays: parseInt(e.target.value) || 30 })}
              margin="normal"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={settings.enableDataExport}
                  onChange={(e) => setSettings({ ...settings, enableDataExport: e.target.checked })}
                />
              }
              label="Enable Data Export"
            />
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Notifications
            </Typography>
            <FormControlLabel
              control={
                <Switch
                  checked={settings.enableNotifications}
                  onChange={(e) => setSettings({ ...settings, enableNotifications: e.target.checked })}
                />
              }
              label="Enable Notifications"
            />
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Display Settings
            </Typography>
            <FormControlLabel
              control={
                <Switch
                  checked={settings.enableAutoRefresh}
                  onChange={(e) => setSettings({ ...settings, enableAutoRefresh: e.target.checked })}
                />
              }
              label="Enable Auto Refresh"
            />
            <TextField
              fullWidth
              type="number"
              label="Refresh Interval (seconds)"
              value={settings.refreshInterval}
              onChange={(e) => setSettings({ ...settings, refreshInterval: parseInt(e.target.value) })}
              margin="normal"
              disabled={!settings.enableAutoRefresh}
            />
          </Paper>
        </Grid>

        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Advanced Settings
            </Typography>
            <FormControlLabel
              control={
                <Switch
                  checked={settings.enableDebugLogging}
                  onChange={(e) => setSettings({ ...settings, enableDebugLogging: e.target.checked })}
                />
              }
              label="Enable Debug Logging"
            />
          </Paper>
        </Grid>
      </Grid>

      <Grid item xs={12}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Backups
          </Typography>
          <List>
            {(Array.isArray(backups) ? backups : []).map((backup) => (
              <ListItem key={backup.id}>
                <ListItemText
                  primary={backup.name}
                  secondary={new Date(backup.createdAt).toLocaleString()}
                />
                <ListItemSecondaryAction>
                  <IconButton
                    edge="end"
                    aria-label="restore"
                    onClick={() => handleRestoreBackup(backup.id)}
                    sx={{ mr: 1 }}
                  >
                    <RestoreIcon />
                  </IconButton>
                  <IconButton
                    edge="end"
                    aria-label="delete"
                    onClick={() => handleDeleteBackup(backup.id)}
                  >
                    <DeleteIcon />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        </Paper>
      </Grid>

      <Dialog open={backupDialogOpen} onClose={() => setBackupDialogOpen(false)}>
        <DialogTitle>Create Backup</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Backup Name"
            fullWidth
            value={backupName}
            onChange={(e) => setBackupName(e.target.value)}
            placeholder="Enter backup name (optional)"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBackupDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleCreateBackup} variant="contained" color="primary">
            Create
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={importDialogOpen} onClose={() => setImportDialogOpen(false)}>
        <DialogTitle>Import Settings</DialogTitle>
        <DialogContent>
          <input
            type="file"
            accept=".json"
            onChange={(e) => setSelectedFile(e.target.files[0])}
            style={{ display: 'none' }}
            id="import-file"
          />
          <label htmlFor="import-file">
            <Button
              variant="outlined"
              component="span"
              startIcon={<ImportIcon />}
              fullWidth
            >
              Select File
            </Button>
          </label>
          {selectedFile && (
            <Typography variant="body2" sx={{ mt: 2 }}>
              Selected file: {selectedFile.name}
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setImportDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleImportSettings}
            variant="contained"
            color="primary"
            disabled={!selectedFile}
          >
            Import
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default Settings;
