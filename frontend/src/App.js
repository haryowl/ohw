// frontend/src/App.js

import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import DeviceList from './pages/DeviceList';
import DeviceDetail from './pages/DeviceDetail';
import Mapping from './pages/Mapping';
import Tracking from './pages/Tracking';
import Settings from './pages/Settings';
import Alerts from './pages/Alerts';
import DataTablePage from './pages/DataTable';
import DataExport from './pages/DataExport';
import OfflineGridDemo from './components/OfflineGridDemo';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout><Dashboard /></Layout>} />
          <Route path="/devices" element={<Layout><DeviceList /></Layout>} />
          <Route path="/devices/:id" element={<Layout><DeviceDetail /></Layout>} />
          <Route path="/mapping" element={<Layout><Mapping /></Layout>} />
          <Route path="/tracking" element={<Layout><Tracking /></Layout>} />
          <Route path="/settings" element={<Layout><Settings /></Layout>} />
          <Route path="/alerts" element={<Layout><Alerts /></Layout>} />
          <Route path="/data" element={<Layout><DataTablePage /></Layout>} />
          <Route path="/export" element={<Layout><DataExport /></Layout>} />
          <Route path="/demo" element={<Layout><OfflineGridDemo /></Layout>} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
