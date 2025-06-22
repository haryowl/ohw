import React from 'react';
import { TileLayer } from 'react-leaflet';

const OfflineGridLayer = () => {
  // Create a simple grid pattern using SVG
  const createGridPattern = () => {
    const gridSize = 100; // Size of each grid cell in pixels
    const strokeWidth = 1;
    const strokeColor = '#cccccc';
    
    const svg = `
      <svg width="${gridSize}" height="${gridSize}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="grid" width="${gridSize}" height="${gridSize}" patternUnits="userSpaceOnUse">
            <path d="M ${gridSize} 0 L 0 0 0 ${gridSize}" fill="none" stroke="${strokeColor}" stroke-width="${strokeWidth}"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>
    `;
    
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  };

  return (
    <TileLayer
      url={createGridPattern()}
      attribution="Offline Grid Layer"
      tileSize={100}
      noWrap={true}
    />
  );
};

export default OfflineGridLayer; 