import React, { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';

const OfflineMapLayer = () => {
  const map = useMap();
  const gridLayerRef = useRef(null);

  useEffect(() => {
    // Create a custom layer for the offline grid
    const OfflineGridLayer = L.Layer.extend({
      onAdd: function(map) {
        this._map = map;
        this._container = L.DomUtil.create('div', 'offline-grid-layer');
        this._container.style.position = 'absolute';
        this._container.style.top = '0';
        this._container.style.left = '0';
        this._container.style.width = '100%';
        this._container.style.height = '100%';
        this._container.style.pointerEvents = 'none';
        this._container.style.zIndex = '1';
        
        // Add to overlay pane so it's below markers
        map.getPanes().overlayPane.appendChild(this._container);
        this._redraw();
        
        map.on('viewreset', this._redraw, this);
        map.on('zoom', this._redraw, this);
        map.on('move', this._redraw, this);
      },

      onRemove: function(map) {
        if (this._container && this._container.parentNode) {
          this._container.parentNode.removeChild(this._container);
        }
        map.off('viewreset', this._redraw, this);
        map.off('zoom', this._redraw, this);
        map.off('move', this._redraw, this);
      },

      _redraw: function() {
        if (!this._container) return;

        this._container.innerHTML = '';
        const bounds = this._map.getBounds();
        const zoom = this._map.getZoom();
        
        // Create grid lines
        this._drawGrid(bounds, zoom);
        
        // Create coordinate labels
        this._drawCoordinates(bounds, zoom);
      },

      _drawGrid: function(bounds, zoom) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const size = this._map.getSize();
        
        canvas.width = size.x;
        canvas.height = size.y;
        canvas.style.position = 'absolute';
        canvas.style.top = '0';
        canvas.style.left = '0';
        canvas.style.pointerEvents = 'none';
        canvas.style.zIndex = '1';
        
        this._container.appendChild(canvas);

        // Calculate grid spacing based on zoom level
        const gridSpacing = this._getGridSpacing(zoom);
        
        // Draw vertical lines (longitude)
        const startLng = Math.floor(bounds.getWest() / gridSpacing) * gridSpacing;
        const endLng = Math.ceil(bounds.getEast() / gridSpacing) * gridSpacing;
        
        for (let lng = startLng; lng <= endLng; lng += gridSpacing) {
          const startPoint = this._map.latLngToLayerPoint([bounds.getSouth(), lng]);
          const endPoint = this._map.latLngToLayerPoint([bounds.getNorth(), lng]);
          
          ctx.beginPath();
          ctx.strokeStyle = '#e0e0e0';
          ctx.lineWidth = 1;
          ctx.moveTo(startPoint.x, startPoint.y);
          ctx.lineTo(endPoint.x, endPoint.y);
          ctx.stroke();
        }

        // Draw horizontal lines (latitude)
        const startLat = Math.floor(bounds.getSouth() / gridSpacing) * gridSpacing;
        const endLat = Math.ceil(bounds.getNorth() / gridSpacing) * gridSpacing;
        
        for (let lat = startLat; lat <= endLat; lat += gridSpacing) {
          const startPoint = this._map.latLngToLayerPoint([lat, bounds.getWest()]);
          const endPoint = this._map.latLngToLayerPoint([lat, bounds.getEast()]);
          
          ctx.beginPath();
          ctx.strokeStyle = '#e0e0e0';
          ctx.lineWidth = 1;
          ctx.moveTo(startPoint.x, startPoint.y);
          ctx.lineTo(endPoint.x, endPoint.y);
          ctx.stroke();
        }
      },

      _drawCoordinates: function(bounds, zoom) {
        const gridSpacing = this._getGridSpacing(zoom);
        const fontSize = Math.max(10, Math.min(14, 12 + zoom - 10));
        
        // Draw longitude labels (vertical)
        const startLng = Math.floor(bounds.getWest() / gridSpacing) * gridSpacing;
        const endLng = Math.ceil(bounds.getEast() / gridSpacing) * gridSpacing;
        
        for (let lng = startLng; lng <= endLng; lng += gridSpacing) {
          const point = this._map.latLngToLayerPoint([bounds.getCenter().lat, lng]);
          const label = document.createElement('div');
          label.textContent = `${lng.toFixed(2)}°`;
          label.style.position = 'absolute';
          label.style.left = `${point.x + 5}px`;
          label.style.top = '10px';
          label.style.fontSize = `${fontSize}px`;
          label.style.color = '#666';
          label.style.fontWeight = 'bold';
          label.style.pointerEvents = 'none';
          label.style.backgroundColor = 'rgba(255, 255, 255, 0.8)';
          label.style.padding = '2px 4px';
          label.style.borderRadius = '2px';
          label.style.zIndex = '2';
          
          this._container.appendChild(label);
        }

        // Draw latitude labels (horizontal)
        const startLat = Math.floor(bounds.getSouth() / gridSpacing) * gridSpacing;
        const endLat = Math.ceil(bounds.getNorth() / gridSpacing) * gridSpacing;
        
        for (let lat = startLat; lat <= endLat; lat += gridSpacing) {
          const point = this._map.latLngToLayerPoint([lat, bounds.getCenter().lng]);
          const label = document.createElement('div');
          label.textContent = `${lat.toFixed(2)}°`;
          label.style.position = 'absolute';
          label.style.left = '10px';
          label.style.top = `${point.y + 5}px`;
          label.style.fontSize = `${fontSize}px`;
          label.style.color = '#666';
          label.style.fontWeight = 'bold';
          label.style.pointerEvents = 'none';
          label.style.backgroundColor = 'rgba(255, 255, 255, 0.8)';
          label.style.padding = '2px 4px';
          label.style.borderRadius = '2px';
          label.style.zIndex = '2';
          
          this._container.appendChild(label);
        }
      },

      _getGridSpacing: function(zoom) {
        // Adjust grid spacing based on zoom level
        if (zoom >= 15) return 0.01; // 0.01 degrees (roughly 1km)
        if (zoom >= 12) return 0.1;  // 0.1 degrees (roughly 10km)
        if (zoom >= 8) return 1;     // 1 degree (roughly 100km)
        if (zoom >= 4) return 5;     // 5 degrees
        return 10;                   // 10 degrees
      }
    });

    // Add the offline grid layer to the map
    gridLayerRef.current = new OfflineGridLayer();
    map.addLayer(gridLayerRef.current);

    return () => {
      if (gridLayerRef.current) {
        map.removeLayer(gridLayerRef.current);
      }
    };
  }, [map]);

  return null;
};

export default OfflineMapLayer; 