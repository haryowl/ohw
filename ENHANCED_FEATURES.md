# 🚀 Enhanced Galileosky Parser Features

## Overview
The enhanced Galileosky parser now includes comprehensive parameter parsing based on the official Galileosky tag definitions, providing a complete IoT device monitoring solution.

## ✨ New Features

### 🔍 Complete Parameter Parsing
- **All Galileosky Tags**: Parses all known Galileosky packet tags (0x01 to 0xe9)
- **Proper Data Types**: Handles uint8, uint16, uint32, int8, int16, int32, string, coordinates, datetime, status, and more
- **Smart Formatting**: Automatically formats values with appropriate units (mV, °C, km/h, etc.)

### 📊 Enhanced Frontend
- **Real-time Parameter Display**: Shows all parsed parameters in a clean, organized grid
- **Device Status Panel**: Dedicated section for voltage, temperature, status, and device info
- **Live Statistics**: Packet count, device count, and last update time
- **Comprehensive Downloads**: JSON format with all parsed data and parameters

### 🗺️ Improved Mapping
- **OpenStreetMap Integration**: Uses OpenStreetMap for reliable mapping
- **Real-time Updates**: Map automatically updates with new coordinates
- **Device Tracking**: Tracks multiple devices with unique identifiers

## 📋 Supported Parameters

### Device Information
- **Hardware Version** (0x01): Device hardware version
- **Firmware Version** (0x02): Device firmware version
- **IMEI** (0x03): Device IMEI number
- **Device Identifier** (0x04): Device identifier

### Time & Archive
- **Archive Record Number** (0x10): Sequential archive record number
- **Date Time** (0x20): Unix timestamp
- **Milliseconds** (0x21): Milliseconds precision

### Location & Navigation
- **Coordinates** (0x30): GPS/GLONASS coordinates with satellite count
- **Speed and Direction** (0x33): Speed in km/h and direction in degrees
- **Height** (0x34): Height above sea level in meters
- **HDOP** (0x35): Horizontal dilution of precision

### Device Status
- **Status** (0x40): Device status bits
- **Supply Voltage** (0x41): Supply voltage in mV
- **Battery Voltage** (0x42): Battery voltage in mV
- **Inside Temperature** (0x43): Internal temperature in °C
- **Acceleration** (0x44): Device acceleration
- **Status of outputs** (0x45): Output states
- **Status of inputs** (0x46): Input states
- **ECO and driving style** (0x47): ECO and driving metrics
- **Expanded status** (0x48): Extended device status
- **Transmission channel** (0x49): Transmission channel info

### Input Voltages & Values
- **Input voltages 0-3** (0x50-0x53): Analog input voltages
- **Input values 4-7** (0x54-0x57): Digital input values
- **RS232 data** (0x58-0x59): RS232 communication data

### GSM Information
- **GSM Network Code** (0x60, 0x68): Network codes
- **GSM Location Area Code** (0x61, 0x69, 0x70): Location area codes
- **GSM Signal Level** (0x62, 0x71): Signal strength (0-31)
- **GSM Cell ID** (0x63, 0x72): Cell identifiers
- **GSM Area Code** (0x64): Area codes
- **GSM Operator Code** (0x65): Operator codes
- **GSM Base Station** (0x66): Base station info
- **GSM Country Code** (0x67): Country codes

### Sensors
- **Temperature Sensor** (0x73): External temperature in °C
- **Humidity Sensor** (0x74): Humidity percentage
- **Pressure Sensor** (0x75): Pressure in hPa
- **Light Sensor** (0x76): Light intensity in lux
- **Accelerometer** (0x77): 3-axis acceleration in m/s²

### User Data
- **User data 0-7** (0xe2-0xe9): Custom user data fields

## 🚀 Quick Start

### On Android (Termux)
```bash
# Start the enhanced backend
bash start-enhanced.sh

# Or run directly
node termux-enhanced-backend.js
```

### Access the Frontend
- Open your browser and go to: `http://[DEVICE_IP]:3001`
- The frontend will automatically connect and start displaying data

## 📥 Data Download

The enhanced parser provides comprehensive data downloads in JSON format including:
- All parsed parameters with proper formatting
- Device information and status
- Location and navigation data
- Raw packet data for analysis
- Timestamps and packet metadata

## 🔧 Technical Details

### Backend Enhancements
- **Tag Parser**: Implements the complete Galileosky tag parsing system
- **Error Handling**: Robust error handling for malformed packets
- **Memory Efficient**: Streams data without storing everything in memory
- **Real-time Processing**: Processes packets as they arrive

### Frontend Improvements
- **Responsive Design**: Works on mobile and desktop
- **Real-time Updates**: 2-second polling for live data
- **Parameter Grid**: Organized display of all parsed parameters
- **Status Indicators**: Visual connection and data status

## 🐛 Troubleshooting

### Common Issues
1. **No data showing**: Check if devices are sending data to the correct IP and port
2. **Frontend not loading**: Ensure the backend is running on port 3001
3. **Parameter parsing errors**: Check packet format and ensure it's valid Galileosky data

### Debug Mode
The backend includes detailed logging for troubleshooting:
- Packet validation errors
- Tag parsing issues
- Connection problems

## 📈 Performance

- **Packet Processing**: Handles multiple packets per second
- **Memory Usage**: Minimal memory footprint
- **Network Efficiency**: Efficient HTTP polling
- **Mobile Optimized**: Works well on Android devices

## 🔮 Future Enhancements

- Database storage for historical data
- WebSocket support for real-time updates
- Advanced filtering and search
- Export to various formats (CSV, Excel)
- Multi-device management dashboard 