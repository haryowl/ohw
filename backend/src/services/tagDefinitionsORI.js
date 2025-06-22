// backend/src/services/tagDefinitions.js

const tagDefinitions = {
    // Basic Device Information
    '0x01': {
        name: 'Hardware Version',
        type: 'uint8',
        length: 1,
        description: 'Hardware version of the device'
    },
    '0x02': {
        name: 'Firmware Version',
        type: 'uint8',
        length: 1,
        description: 'Firmware version of the device'
    },
    '0x03': {
        name: 'IMEI',
        type: 'string',
        length: 15,
        description: 'IMEI number of the device'
    },
    '0x04': {
        name: 'Device Identifier',
        type: 'uint16',
        length: 2,
        description: 'Identifier of the device'
    },

    // Archive and Time Information
    '0x10': {
        name: 'Archive Record Number',
        type: 'uint16',
        length: 2,
        description: 'Sequential number of archive record'
    },
    '0x20': {
        name: 'Date Time',
        type: 'datetime',
        length: 4,
        description: 'Date and time in Unix timestamp format'
    },
    '0x21': {
        name: 'Milliseconds',
        type: 'uint16',
        length: 2,
        description: 'Milliseconds (0-999) to complete date and time value'
    },

    // Location and Navigation
    '0x30': {
        name: 'Coordinates',
        type: 'coordinates',
        length: 9,
        description: 'GPS/GLONASS coordinates and satellites info'
    },
    '0x33': {
        name: 'Speed and Direction',
        type: 'uint32',
        length: 4,
        description: 'Speed in km/h and direction in degrees'
    },
    '0x34': {
        name: 'Height',
        type: 'int16',
        length: 2,
        description: 'Height above sea level in meters'
    },
    '0x35': {
        name: 'HDOP',
        type: 'uint8',
        length: 1,
        description: 'HDOP or cellular location error in meters'
    },

    // Device Status
    '0x40': {
        name: 'Status',
        type: 'status',
        length: 2,
        description: 'Device status bits'
    },
    '0x41': {
        name: 'Supply Voltage',
        type: 'uint16',
        length: 2,
        description: 'Supply voltage in mV'
    },
    '0x42': {
        name: 'Battery Voltage',
        type: 'uint16',
        length: 2,
        description: 'Battery voltage in mV'
    },
    '0x43': {
        name: 'Temperature',
        type: 'int8',
        length: 1,
        description: 'Internal temperature in °C'
    },
    '0x44': {
        name: 'GSM Signal Level',
        type: 'uint8',
        length: 1,
        description: 'GSM signal level (0-31)'
    },
    '0x45': {
        name: 'GSM Cell ID',
        type: 'uint16',
        length: 2,
        description: 'GSM cell identifier'
    },
    '0x46': {
        name: 'GSM Area Code',
        type: 'uint16',
        length: 2,
        description: 'GSM area code'
    },
    '0x47': {
        name: 'GSM Operator Code',
        type: 'uint16',
        length: 2,
        description: 'GSM operator code'
    },
    '0x48': {
        name: 'GSM Base Station',
        type: 'uint16',
        length: 2,
        description: 'GSM base station identifier'
    },
    '0x49': {
        name: 'GSM Country Code',
        type: 'uint16',
        length: 2,
        description: 'GSM country code'
    },
    '0x4A': {
        name: 'GSM Network Code',
        type: 'uint16',
        length: 2,
        description: 'GSM network code'
    },
    '0x4B': {
        name: 'GSM Location Area Code',
        type: 'uint16',
        length: 2,
        description: 'GSM location area code'
    },
    '0x4C': {
        name: 'GSM Cell ID',
        type: 'uint32',
        length: 4,
        description: 'GSM cell identifier (extended)'
    },
    '0x4D': {
        name: 'GSM Area Code',
        type: 'uint32',
        length: 4,
        description: 'GSM area code (extended)'
    },
    '0x4E': {
        name: 'GSM Operator Code',
        type: 'uint32',
        length: 4,
        description: 'GSM operator code (extended)'
    },
    '0x4F': {
        name: 'GSM Base Station',
        type: 'uint32',
        length: 4,
        description: 'GSM base station identifier (extended)'
    },
    '0x50': {
        name: 'GSM Country Code',
        type: 'uint32',
        length: 4,
        description: 'GSM country code (extended)'
    },
    '0x51': {
        name: 'GSM Network Code',
        type: 'uint32',
        length: 4,
        description: 'GSM network code (extended)'
    },
    '0x52': {
        name: 'GSM Location Area Code',
        type: 'uint32',
        length: 4,
        description: 'GSM location area code (extended)'
    },
    '0x53': {
        name: 'GSM Signal Level',
        type: 'uint8',
        length: 1,
        description: 'GSM signal level (0-31)'
    },
    '0x54': {
        name: 'GSM Cell ID',
        type: 'uint16',
        length: 2,
        description: 'GSM cell identifier'
    },
    '0x55': {
        name: 'GSM Area Code',
        type: 'uint16',
        length: 2,
        description: 'GSM area code'
    },
    '0x56': {
        name: 'GSM Operator Code',
        type: 'uint16',
        length: 2,
        description: 'GSM operator code'
    },
    '0x57': {
        name: 'GSM Base Station',
        type: 'uint16',
        length: 2,
        description: 'GSM base station identifier'
    },
    '0x58': {
        name: 'GSM Country Code',
        type: 'uint16',
        length: 2,
        description: 'GSM country code'
    },
    '0x59': {
        name: 'GSM Network Code',
        type: 'uint16',
        length: 2,
        description: 'GSM network code'
    },
    '0x5A': {
        name: 'GSM Location Area Code',
        type: 'uint16',
        length: 2,
        description: 'GSM location area code'
    },
    '0x5B': {
        name: 'GSM Cell ID',
        type: 'uint32',
        length: 4,
        description: 'GSM cell identifier (extended)'
    },
    '0x5C': {
        name: 'GSM Area Code',
        type: 'uint32',
        length: 4,
        description: 'GSM area code (extended)'
    },
    '0x5D': {
        name: 'GSM Operator Code',
        type: 'uint32',
        length: 4,
        description: 'GSM operator code (extended)'
    },
    '0x5E': {
        name: 'GSM Base Station',
        type: 'uint32',
        length: 4,
        description: 'GSM base station identifier (extended)'
    },
    '0x5F': {
        name: 'GSM Country Code',
        type: 'uint32',
        length: 4,
        description: 'GSM country code (extended)'
    },
    '0x60': {
        name: 'GSM Network Code',
        type: 'uint32',
        length: 4,
        description: 'GSM network code (extended)'
    },
    '0x61': {
        name: 'GSM Location Area Code',
        type: 'uint32',
        length: 4,
        description: 'GSM location area code (extended)'
    },
    '0x62': {
        name: 'GSM Signal Level',
        type: 'uint8',
        length: 1,
        description: 'GSM signal level (0-31)'
    },
    '0x63': {
        name: 'GSM Cell ID',
        type: 'uint16',
        length: 2,
        description: 'GSM cell identifier'
    },
    '0x64': {
        name: 'GSM Area Code',
        type: 'uint16',
        length: 2,
        description: 'GSM area code'
    },
    '0x65': {
        name: 'GSM Operator Code',
        type: 'uint16',
        length: 2,
        description: 'GSM operator code'
    },
    '0x66': {
        name: 'GSM Base Station',
        type: 'uint16',
        length: 2,
        description: 'GSM base station identifier'
    },
    '0x67': {
        name: 'GSM Country Code',
        type: 'uint16',
        length: 2,
        description: 'GSM country code'
    },
    '0x68': {
        name: 'GSM Network Code',
        type: 'uint16',
        length: 2,
        description: 'GSM network code'
    },
    '0x69': {
        name: 'GSM Location Area Code',
        type: 'uint16',
        length: 2,
        description: 'GSM location area code'
    },
    '0x6A': {
        name: 'GSM Cell ID',
        type: 'uint32',
        length: 4,
        description: 'GSM cell identifier (extended)'
    },
    '0x6B': {
        name: 'GSM Area Code',
        type: 'uint32',
        length: 4,
        description: 'GSM area code (extended)'
    },
    '0x6C': {
        name: 'GSM Operator Code',
        type: 'uint32',
        length: 4,
        description: 'GSM operator code (extended)'
    },
    '0x6D': {
        name: 'GSM Base Station',
        type: 'uint32',
        length: 4,
        description: 'GSM base station identifier (extended)'
    },
    '0x6E': {
        name: 'GSM Country Code',
        type: 'uint32',
        length: 4,
        description: 'GSM country code (extended)'
    },
    '0x6F': {
        name: 'GSM Network Code',
        type: 'uint32',
        length: 4,
        description: 'GSM network code (extended)'
    },
    '0x70': {
        name: 'GSM Location Area Code',
        type: 'uint32',
        length: 4,
        description: 'GSM location area code (extended)'
    },
    '0x71': {
        name: 'GSM Signal Level',
        type: 'uint8',
        length: 1,
        description: 'GSM signal level (0-31)'
    },
    '0x72': {
        name: 'GSM Cell ID',
        type: 'uint16',
        length: 2,
        description: 'GSM cell identifier'
    },
    '0x73': {
        name: 'Temperature Sensor',
        type: 'int16',
        length: 2,
        description: 'Temperature sensor reading in °C'
    },
    '0x74': {
        name: 'Humidity Sensor',
        type: 'uint8',
        length: 1,
        description: 'Humidity sensor reading in %'
    },
    '0x75': {
        name: 'Pressure Sensor',
        type: 'uint16',
        length: 2,
        description: 'Pressure sensor reading in hPa'
    },
    '0x76': {
        name: 'Light Sensor',
        type: 'uint16',
        length: 2,
        description: 'Light sensor reading in lux'
    },
    '0x77': {
        name: 'Accelerometer',
        type: 'int16',
        length: 6,
        description: 'Accelerometer readings (X, Y, Z) in m/s²'
    },
    '0x78': {
        name: 'Gyroscope',
        type: 'int16',
        length: 6,
        description: 'Gyroscope readings (X, Y, Z) in deg/s'
    },
    '0x79': {
        name: 'Magnetometer',
        type: 'int16',
        length: 6,
        description: 'Magnetometer readings (X, Y, Z) in µT'
    },
    '0x7A': {
        name: 'Proximity Sensor',
        type: 'uint8',
        length: 1,
        description: 'Proximity sensor reading (0-255)'
    },
    '0x7B': {
        name: 'Sound Level',
        type: 'uint8',
        length: 1,
        description: 'Sound level sensor reading in dB'
    },
    '0x7C': {
        name: 'Gas Sensor',
        type: 'uint16',
        length: 2,
        description: 'Gas sensor reading in ppm'
    },
    '0x7D': {
        name: 'Vibration Sensor',
        type: 'uint16',
        length: 2,
        description: 'Vibration sensor reading in Hz'
    },
    '0x7E': {
        name: 'Tilt Sensor',
        type: 'uint8',
        length: 1,
        description: 'Tilt sensor reading in degrees'
    },
    '0x7F': {
        name: 'Impact Sensor',
        type: 'uint8',
        length: 1,
        description: 'Impact sensor reading (0-255)'
    },
    '0xE2': {
        name: 'User data 0',
        type: 'uint32',
        length: 4,
        description: 'User data 0'
    },
    '0xE3': {
        name: 'User data 1',
        type: 'uint32',
        length: 4,
        description: 'User data 1'
    },
    '0xE4': {
        name: 'User data 2',
        type: 'uint32',
        length: 4,
        description: 'User data 2'
    },
    '0xE5': {
        name: 'User data 3',
        type: 'uint32',
        length: 4,
        description: 'User data 3'
    },
    '0xE6': {
        name: 'User data 4',
        type: 'uint32',
        length: 4,
        description: 'User data 4'
    },
    '0xE7': {
        name: 'User data 5',
        type: 'uint32',
        length: 4,
        description: 'User data 5'
    },
    '0xE8': {
        name: 'User data 6',
        type: 'uint32',
        length: 4,
        description: 'User data 6'
    },
    '0xE9': {
        name: 'User data 7',
        type: 'uint32',
        length: 4,
        description: 'User data 7'
    },
    '0x0001': {
        name: 'Modbus 0',
        type: 'uint32',
        length: 4,
        description: 'Modbus 0'
    },
    '0x0002': {
        name: 'Modbus 1',
        type: 'uint32',
        length: 4,
        description: 'Modbus 1'
    },
    '0x0003': {
        name: 'Modbus 2',
        type: 'uint32',
        length: 4,
        description: 'Modbus 2'
    },
    '0x0004': {
        name: 'Modbus 3',
        type: 'uint32',
        length: 4,
        description: 'Modbus 3'
    },
    '0x0005': {
        name: 'Modbus 4',
        type: 'uint32',
        length: 4,
        description: 'Modbus 4'
    },
    '0x0006': {
        name: 'Modbus 5',
        type: 'uint32',
        length: 4,
        description: 'Modbus 5'
    },
    '0x0007': {
        name: 'Modbus 6',
        type: 'uint32',
        length: 4,
        description: 'Modbus 6'
    },
    '0x0008': {
        name: 'Modbus 7',
        type: 'uint32',
        length: 4,
        description: 'Modbus 7'
    },
    '0x0009': {
        name: 'Modbus 8',
        type: 'uint32',
        length: 4,
        description: 'Modbus 8'
    },
    '0x0010': {
        name: 'Modbus 9',
        type: 'uint32',
        length: 4,
        description: 'Modbus 9'
    },
    '0x000A': {
        name: 'Modbus 10',
        type: 'uint32',
        length: 4,
        description: 'Modbus 10'
    },
    '0x000B': {
        name: 'Modbus 11',
        type: 'uint32',
        length: 4,
        description: 'Modbus 11'
    },
    '0x000A': {
        name: 'Modbus 10',
        type: 'uint32',
        length: 4,
        description: 'Modbus 10'
    },
    '0x000B': {
        name: 'Modbus 11',
        type: 'uint32',
        length: 4,
        description: 'Modbus 11'
    },
    '0x000C': {
        name: 'Modbus 12',
        type: 'uint32',
        length: 4,
        description: 'Modbus 12'
    },
    '0x000D': {
        name: 'Modbus 13',
        type: 'uint32',
        length: 4,
        description: 'Modbus 13'
    },
    '0x000E': {
        name: 'Modbus 14',
        type: 'uint32',
        length: 4,
        description: 'Modbus 14'
    },
    '0x000F': {
        name: 'Modbus 15',
        type: 'uint32',
        length: 4,
        description: 'Modbus 15'
    }
};

module.exports = tagDefinitions;
