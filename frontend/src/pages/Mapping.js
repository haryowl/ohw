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
  TextField,
  Button,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Chip,
  Checkbox,
  Tooltip,
  Tabs,
  Tab,
  CircularProgress,
  Menu,
  ListItemIcon,
  ListItemText
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Search as SearchIcon,
  FileDownload as ExportIcon,
  Visibility as PreviewIcon,
  Refresh as RefreshIcon,
  Description as DescriptionIcon,
  TableChart as TableChartIcon,
  Code as CodeIcon
} from '@mui/icons-material';
import axios from 'axios';

const Mapping = () => {
  const [mappings, setMappings] = useState([]);
  const [open, setOpen] = useState(false);
  const [editingMapping, setEditingMapping] = useState(null);
  const [newMapping, setNewMapping] = useState({
    originalField: '',
    customName: '',
    dataType: 'string',
    unit: '',
    enabled: true
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [selectedMappings, setSelectedMappings] = useState([]);
  const [isExporting, setIsExporting] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [previewData, setPreviewData] = useState([]);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [previewError, setPreviewError] = useState(null);
  const [exportMenuAnchor, setExportMenuAnchor] = useState(null);

  useEffect(() => {
    fetchMappings();
    if (activeTab === 1) {
      fetchPreviewData();
    }
  }, [activeTab]);

  const fetchMappings = async () => {
    try {
      const response = await axios.get('http://localhost:3001/api/mapping/all');
      setMappings(response.data || []);
    } catch (error) {
      console.error('Error fetching mappings:', error);
      setMappings([]);
    }
  };

  const fetchPreviewData = async () => {
    setIsLoadingPreview(true);
    setPreviewError(null);
    try {
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/mapping/preview`);
      setPreviewData(response.data);
    } catch (error) {
      console.error('Error fetching preview data:', error);
      setPreviewError('Failed to load preview data');
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const handleCreateMapping = async () => {
    try {
      await axios.post('http://localhost:3001/api/mapping', newMapping);
      setOpen(false);
      setNewMapping({
        originalField: '',
        customName: '',
        dataType: 'string',
        unit: '',
        enabled: true
      });
      fetchMappings();
    } catch (error) {
      console.error('Error creating mapping:', error);
    }
  };

  const handleUpdateMapping = async (mappingId, updatedData) => {
    try {
      await axios.put(`http://localhost:3001/api/mapping/${mappingId}`, updatedData);
      setOpen(false);
      setEditingMapping(null);
      fetchMappings();
    } catch (error) {
      console.error('Error updating mapping:', error);
    }
  };

  const handleDeleteMapping = async (mappingId) => {
    try {
      await axios.delete(`http://localhost:3001/api/mapping/${mappingId}`);
      fetchMappings();
    } catch (error) {
      console.error('Error deleting mapping:', error);
    }
  };

  const handleEditClick = (mapping) => {
    setEditingMapping(mapping);
    setNewMapping(mapping);
    setOpen(true);
  };

  const handleSelectAll = (event) => {
    if (event.target.checked) {
      setSelectedMappings(mappings.map(mapping => mapping.id));
    } else {
      setSelectedMappings([]);
    }
  };

  const handleSelectMapping = (id) => {
    const currentIndex = selectedMappings.indexOf(id);
    const newSelected = [...selectedMappings];

    if (currentIndex === -1) {
      newSelected.push(id);
    } else {
      newSelected.splice(currentIndex, 1);
    }

    setSelectedMappings(newSelected);
  };

  const handleBulkDelete = async () => {
    try {
      await Promise.all(selectedMappings.map(id => handleDeleteMapping(id)));
      setSelectedMappings([]);
    } catch (error) {
      console.error('Error deleting mappings:', error);
    }
  };

  const handleExportMenuOpen = (event) => {
    setExportMenuAnchor(event.currentTarget);
  };

  const handleExportMenuClose = () => {
    setExportMenuAnchor(null);
  };

  const handleExport = async (format) => {
    setIsExporting(true);
    try {
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/mapping/export/${format}`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `mappings.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error exporting mappings:', error);
    } finally {
      setIsExporting(false);
      handleExportMenuClose();
    }
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const renderPreviewData = () => {
    if (isLoadingPreview) {
      return (
        <Box display="flex" justifyContent="center" alignItems="center" p={3}>
          <CircularProgress />
        </Box>
      );
    }

    if (previewError) {
      return (
        <Box p={3}>
          <Typography color="error">{previewError}</Typography>
        </Box>
      );
    }

    if (previewData.length === 0) {
      return (
        <Box p={3}>
          <Typography>No preview data available</Typography>
        </Box>
      );
    }

    const columns = Object.keys(previewData[0]);

    return (
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              {columns.map((column) => (
                <TableCell key={column}>{column}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {previewData.map((row, index) => (
              <TableRow key={index}>
                {columns.map((column) => (
                  <TableCell key={`${index}-${column}`}>
                    {typeof row[column] === 'object' 
                      ? JSON.stringify(row[column])
                      : String(row[column])}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  const filteredMappings = mappings.filter(mapping => {
    const matchesSearch = mapping.originalField.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         mapping.customName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'all' || mapping.dataType === typeFilter;
    return matchesSearch && matchesType;
  });

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Field Mappings
        </Typography>
        <Box>
          <Button
            variant="outlined"
            startIcon={<ExportIcon />}
            onClick={handleExportMenuOpen}
            disabled={isExporting}
            sx={{ mr: 2 }}
          >
            Export
          </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={() => {
              setEditingMapping(null);
              setNewMapping({
                originalField: '',
                customName: '',
                dataType: 'string',
                unit: '',
                enabled: true
              });
              setOpen(true);
            }}
          >
            Add Mapping
          </Button>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={() => {
              fetchMappings();
              fetchPreviewData();
            }}
          >
            Refresh
          </Button>
        </Box>
      </Box>

      <Tabs value={activeTab} onChange={handleTabChange} sx={{ mb: 3 }}>
        <Tab label="Mappings" />
        <Tab label="Data Preview" />
      </Tabs>

      <Menu
        anchorEl={exportMenuAnchor}
        open={Boolean(exportMenuAnchor)}
        onClose={handleExportMenuClose}
      >
        <MenuItem onClick={() => handleExport('json')}>
          <ListItemIcon>
            <CodeIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Export as JSON</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleExport('csv')}>
          <ListItemIcon>
            <TableChartIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Export as CSV</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleExport('md')}>
          <ListItemIcon>
            <DescriptionIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Export as Markdown</ListItemText>
        </MenuItem>
      </Menu>

      {activeTab === 0 ? (
        <>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Search Mappings"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
                }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Data Type</InputLabel>
                <Select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  label="Data Type"
                >
                  <MenuItem value="all">All Types</MenuItem>
                  <MenuItem value="string">String</MenuItem>
                  <MenuItem value="number">Number</MenuItem>
                  <MenuItem value="boolean">Boolean</MenuItem>
                  <MenuItem value="date">Date</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>

          {selectedMappings.length > 0 && (
            <Box sx={{ mb: 2 }}>
              <Button
                variant="outlined"
                color="error"
                startIcon={<DeleteIcon />}
                onClick={handleBulkDelete}
              >
                Delete Selected ({selectedMappings.length})
              </Button>
            </Box>
          )}

          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox">
                    <Checkbox
                      indeterminate={selectedMappings.length > 0 && selectedMappings.length < mappings.length}
                      checked={mappings.length > 0 && selectedMappings.length === mappings.length}
                      onChange={handleSelectAll}
                    />
                  </TableCell>
                  <TableCell>Original Field</TableCell>
                  <TableCell>Custom Name</TableCell>
                  <TableCell>Data Type</TableCell>
                  <TableCell>Unit</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredMappings.map((mapping) => (
                  <TableRow key={mapping.id}>
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={selectedMappings.indexOf(mapping.id) !== -1}
                        onChange={() => handleSelectMapping(mapping.id)}
                      />
                    </TableCell>
                    <TableCell>{mapping.originalField}</TableCell>
                    <TableCell>{mapping.customName}</TableCell>
                    <TableCell>
                      <Chip
                        label={mapping.dataType}
                        color={
                          mapping.dataType === 'number' ? 'primary' :
                          mapping.dataType === 'boolean' ? 'secondary' :
                          mapping.dataType === 'date' ? 'info' :
                          'default'
                        }
                      />
                    </TableCell>
                    <TableCell>{mapping.unit || '-'}</TableCell>
                    <TableCell>
                      <Tooltip title="Edit">
                        <IconButton
                          color="primary"
                          onClick={() => handleEditClick(mapping)}
                        >
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton
                          color="error"
                          onClick={() => handleDeleteMapping(mapping.id)}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      ) : (
        <>
          <Box display="flex" justifyContent="flex-end" mb={2}>
            <Button
              variant="outlined"
              startIcon={<PreviewIcon />}
              onClick={fetchPreviewData}
              disabled={isLoadingPreview}
            >
              Refresh Preview
            </Button>
          </Box>
          {renderPreviewData()}
        </>
      )}

      <Dialog open={open} onClose={() => setOpen(false)}>
        <DialogTitle>
          {editingMapping ? 'Edit Field Mapping' : 'Create Field Mapping'}
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Original Field"
            fullWidth
            value={newMapping.originalField}
            onChange={(e) => setNewMapping({ ...newMapping, originalField: e.target.value })}
          />
          <TextField
            margin="dense"
            label="Custom Name"
            fullWidth
            value={newMapping.customName}
            onChange={(e) => setNewMapping({ ...newMapping, customName: e.target.value })}
          />
          <FormControl fullWidth margin="dense">
            <InputLabel>Data Type</InputLabel>
            <Select
              value={newMapping.dataType}
              onChange={(e) => setNewMapping({ ...newMapping, dataType: e.target.value })}
            >
              <MenuItem value="string">String</MenuItem>
              <MenuItem value="number">Number</MenuItem>
              <MenuItem value="boolean">Boolean</MenuItem>
              <MenuItem value="date">Date</MenuItem>
            </Select>
          </FormControl>
          <TextField
            margin="dense"
            label="Unit"
            fullWidth
            value={newMapping.unit}
            onChange={(e) => setNewMapping({ ...newMapping, unit: e.target.value })}
            helperText="Optional: e.g., km/h, °C, etc."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            onClick={() => {
              if (editingMapping) {
                handleUpdateMapping(editingMapping.id, newMapping);
              } else {
                handleCreateMapping();
              }
            }}
            color="primary"
          >
            {editingMapping ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Mapping;
