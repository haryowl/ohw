# Galileo Sky Parser - Tracking Features

## Overview
The tracking features allow you to visualize device locations and movement patterns on interactive maps. The system uses device latitude and longitude data to provide comprehensive tracking capabilities with **offline grid support** for environments without internet connectivity.

## Features

### 1. Device Tracking Page (`/tracking`)
- **Device Selection**: Choose from available devices
- **Time Period Selection**: Select start and end dates for tracking data
- **Interactive Map**: View device movement with OpenStreetMap integration
- **Offline Grid Support**: Automatic fallback to coordinate grid when internet is unavailable
- **Track Visualization**: 
  - Blue polyline showing the complete track
  - Start marker (green) and end marker (red)
  - Popup information with timestamp, speed, and direction
- **Track Information Panel**:
  - Track summary (number of points, duration)
  - Recent tracking points with coordinates
  - Speed and direction chips

### 2. Dashboard Integration
- **Device Locations Map**: Shows all devices with current locations
- **Real-time Status**: Displays device status and last known positions
- **Quick Access**: Easy navigation to detailed tracking
- **Offline Support**: Grid-based location display when offline

### 3. Offline Grid System
- **Automatic Detection**: Detects internet connectivity and map tile availability
- **Coordinate Grid**: Displays latitude/longitude grid lines with labels
- **Manual Toggle**: Button to switch between online map and offline grid
- **Responsive Spacing**: Grid spacing adjusts based on zoom level
- **Visual Indicators**: Clear indication when in offline mode

### 4. API Endpoints

#### Get Device Tracking Data
```
GET /api/data/:deviceId/tracking?startDate=2024-01-01T00:00:00Z&endDate=2024-01-02T00:00:00Z
```
Returns tracking data for a specific device within a time period.

#### Get All Devices with Locations
```
GET /api/devices/locations
```
Returns all devices with their current location data.

## Usage

### Accessing Tracking Features

1. **Main Tracking Page**: Navigate to `/tracking` from the sidebar menu
2. **Dashboard**: View all devices on the main dashboard map
3. **Device List**: Use the "View Tracking" button for quick access

### Using the Tracking Page

1. **Select Device**: Choose a device from the dropdown
2. **Set Time Period**: Use the date/time pickers to select the tracking period
3. **Load Track**: Click "Load Track" to fetch and display the data
4. **View Information**: Check the right panel for track details and recent points

### Map Features

- **Zoom and Pan**: Standard map navigation
- **Markers**: Click for detailed information
- **Track Line**: Blue line showing the complete route
- **Start/End Points**: Special markers for track boundaries
- **Offline Grid**: Coordinate grid with labels when internet is unavailable

### Offline Mode

#### Automatic Offline Detection
The system automatically detects when:
- Internet connection is lost
- Map tile servers are unreachable
- Network requests fail

#### Manual Offline Toggle
- Click the "📐 Grid" button on the top-left of any map
- Switch between online map tiles and offline coordinate grid
- Useful for testing or when you prefer grid view

#### Grid Features
- **Coordinate Lines**: Latitude and longitude grid lines
- **Labels**: Coordinate values displayed on grid lines
- **Responsive Spacing**: Grid density adjusts with zoom level
- **Device Markers**: All device markers remain visible in grid mode

## Technical Details

### Data Structure
Tracking data includes:
- `timestamp`: When the location was recorded
- `latitude`: Device latitude
- `longitude`: Device longitude
- `speed`: Speed in km/h (if available)
- `direction`: Direction in degrees (if available)
- `height`: Altitude in meters (if available)
- `satellites`: Number of GPS satellites (if available)

### Map Integration
- Uses **react-leaflet** for map functionality
- **OpenStreetMap** tiles for base maps
- **Custom Offline Grid Layer** for offline functionality
- **SmartMap Component** for automatic online/offline switching
- Responsive design for mobile and desktop
- Custom markers and popups

### Offline Grid Implementation
- **Canvas-based rendering** for smooth performance
- **Dynamic grid spacing** based on zoom level
- **Coordinate labels** with proper positioning
- **Event handling** for map interactions
- **Memory efficient** with proper cleanup

### Performance
- Efficient data loading with time-based filtering
- Pagination for large datasets
- Optimized map rendering
- Caching for better performance
- Lightweight offline grid rendering

## Dependencies

### Frontend
- `react-leaflet`: Map components
- `leaflet`: Map library
- `@mui/x-date-pickers`: Date/time selection
- `date-fns`: Date manipulation

### Backend
- `sequelize`: Database queries
- `express`: API endpoints

## Configuration

### Environment Variables
Make sure these are set in your `.env` file:
```
REACT_APP_API_URL=http://192.168.1.114:3001
```

### Database
The tracking features use the existing `Record` model with these key fields:
- `deviceImei`: Device identifier
- `timestamp`: Record timestamp
- `latitude`: GPS latitude
- `longitude`: GPS longitude
- `speed`: Movement speed
- `direction`: Movement direction

## Troubleshooting

### Common Issues

1. **No tracking data displayed**
   - Check if the device has location data
   - Verify the time period selection
   - Ensure the device has valid GPS coordinates

2. **Map not loading**
   - Check internet connection (required for map tiles)
   - Verify leaflet CSS is loaded
   - Check browser console for errors
   - **Offline mode will automatically activate if map tiles fail to load**

3. **API errors**
   - Verify backend is running
   - Check API endpoint URLs
   - Ensure database connection is working

4. **Offline grid not working**
   - Check browser console for JavaScript errors
   - Verify canvas support in browser
   - Ensure proper event handling

### Performance Tips

1. **Limit time periods** for large datasets
2. **Use appropriate zoom levels** for better performance
3. **Consider data aggregation** for long time periods
4. **Implement caching** for frequently accessed data
5. **Use offline mode** when internet is slow or unreliable

## Testing Offline Mode

### Method 1: Manual Toggle
1. Navigate to any map page (Tracking, Dashboard, Device Detail)
2. Click the "📐 Grid" button on the top-left of the map
3. The map will switch to offline grid mode

### Method 2: Disconnect Internet
1. Disconnect your internet connection
2. Refresh the page
3. The map will automatically switch to offline grid mode

### Method 3: Block Map Tiles
1. Open browser developer tools (F12)
2. Go to Network tab
3. Block requests to `tile.openstreetmap.org`
4. Refresh the page
5. The map will switch to offline grid mode

## Future Enhancements

- Real-time tracking updates
- Geofencing capabilities
- Route optimization
- Historical trend analysis
- Export tracking data
- Custom map styles
- Mobile app integration
- **Enhanced offline features**:
  - Cached map tiles for offline use
  - Local storage of recent tracking data
  - Offline-first architecture
  - Background sync when online 