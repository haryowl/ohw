import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer } from 'react-leaflet';
import OfflineMapLayer from './OfflineMapLayer';

const SmartMap = ({ 
  center = [0, 0], 
  zoom = 2, 
  children, 
  height = '400px',
  width = '100%',
  style = {}
}) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [mapTilesLoaded, setMapTilesLoaded] = useState(false);
  const [showOfflineMode, setShowOfflineMode] = useState(false);

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowOfflineMode(false);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowOfflineMode(true);
    };

    // Check if map tiles can be loaded
    const checkMapTiles = () => {
      const testImage = new Image();
      testImage.onload = () => {
        setMapTilesLoaded(true);
        setShowOfflineMode(false);
      };
      testImage.onerror = () => {
        setMapTilesLoaded(false);
        setShowOfflineMode(true);
      };
      testImage.src = 'https://tile.openstreetmap.org/0/0/0.png';
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Check map tiles availability
    checkMapTiles();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Determine if we should show offline mode
  const shouldShowOffline = !isOnline || !mapTilesLoaded || showOfflineMode;

  return (
    <div style={{ position: 'relative', height, width, ...style }}>
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height: '100%', width: '100%' }}
      >
        {shouldShowOffline ? (
          <OfflineMapLayer />
        ) : (
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            eventHandlers={{
              load: () => setMapTilesLoaded(true),
              error: () => {
                setMapTilesLoaded(false);
                setShowOfflineMode(true);
              }
            }}
          />
        )}
        
        {/* Render children (markers, polylines, etc.) with higher z-index */}
        <div style={{ position: 'relative', zIndex: 1000 }}>
          {children}
        </div>
      </MapContainer>
      
      {/* Offline mode indicator */}
      {shouldShowOffline && (
        <div style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          backgroundColor: 'rgba(255, 193, 7, 0.9)',
          color: '#000',
          padding: '5px 10px',
          borderRadius: '4px',
          fontSize: '12px',
          fontWeight: 'bold',
          zIndex: 2000,
          pointerEvents: 'none'
        }}>
          📡 Offline Mode - Grid View
        </div>
      )}
      
      {/* Manual toggle button */}
      <button
        onClick={() => setShowOfflineMode(!showOfflineMode)}
        style={{
          position: 'absolute',
          top: '10px',
          left: '10px',
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          color: 'white',
          border: 'none',
          padding: '5px 10px',
          borderRadius: '4px',
          fontSize: '12px',
          cursor: 'pointer',
          zIndex: 2000
        }}
        title="Toggle between online map and offline grid"
      >
        {shouldShowOffline ? '🌐 Online' : '📐 Grid'}
      </button>
    </div>
  );
};

export default SmartMap; 