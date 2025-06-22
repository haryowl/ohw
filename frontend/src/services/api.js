// frontend/src/services/api.js

const API_BASE_URL = "http://192.168.1.114:3001"; // Use your server's LAN IP and backend port

export const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

export async function fetchDashboardData() {
  const response = await fetch(`${BASE_URL}/api/dashboard`);
  return await response.json();
}

export async function fetchDeviceData(deviceId) {
  const response = await fetch(`${BASE_URL}/api/devices/${deviceId}`);
  return await response.json();
}

export async function updateDeviceMapping(deviceId, mapping) {
  const response = await fetch(`${BASE_URL}/api/devices/${deviceId}/mapping`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(mapping),
  });
  return await response.json();
}

export async function fetchAlerts() {
  const response = await fetch(`${BASE_URL}/api/alerts`);
  return await response.json();
}

export async function createAlert(alert) {
  const response = await fetch(`${BASE_URL}/api/alerts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(alert),
  });
  return await response.json();
}

export async function updateAlert(alertId, alert) {
  const response = await fetch(`${BASE_URL}/api/alerts/${alertId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(alert),
  });
  return await response.json();
}

export async function deleteAlert(alertId) {
  const response = await fetch(`${BASE_URL}/api/alerts/${alertId}`, {
    method: 'DELETE',
  });
  return await response.json();
}

export async function fetchMappings() {
  const response = await fetch(`${BASE_URL}/api/mappings`);
  return await response.json();
}

export async function createMapping(mapping) {
  const response = await fetch(`${BASE_URL}/api/mappings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(mapping),
  });
  return await response.json();
}

export async function updateMapping(mappingId, mapping) {
  const response = await fetch(`${BASE_URL}/api/mappings/${mappingId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(mapping),
  });
  return await response.json();
}

export async function deleteMapping(mappingId) {
  const response = await fetch(`${BASE_URL}/api/mappings/${mappingId}`, {
    method: 'DELETE',
  });
  return await response.json();
}

export async function fetchSettings() {
  const response = await fetch(`${BASE_URL}/api/settings`);
  return await response.json();
}

export async function updateSettings(settings) {
  const response = await fetch(`${BASE_URL}/api/settings`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(settings),
  });
  return await response.json();
}

// Add more API functions as needed
