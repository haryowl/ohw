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
        type: 'speedDirection',
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
        name: 'Inside Temperature',
        type: 'int8',
        length: 1,
        description: 'Internal temperature in °C'
    },
    '0x44': {
        name: 'Acceleration',
        type: 'uint32',
        length: 4,
        description: 'Acceleration'
    },
    '0x45': {
        name: 'Status of outputs',
        type: 'outputs',
        length: 2,
        description: 'Status of outputs (each bit represents an output state)'
    },
    '0x46': {
        name: 'Status of inputs',
        type: 'inputs',
        length: 2,
        description: 'Status of inputs (each bit represents an input state)'
    },
    '0x47': {
        name: 'ECO and driving style',
        type: 'uint32',
        length: 4,
        description: 'ECO and driving style'
    },
    '0x48': {
        name: 'Expanded status of the device',
        type: 'uint16',
        length: 2,
        description: 'Expanded status of the device'
    },
    '0x49': {
        name: 'Transmission channel',
        type: 'uint8',
        length: 1,
        description: 'Transmission channel'
    },
    '0x50': {
        name: 'Input voltage 0',
        type: 'uint16',
        length: 2,
        description: 'Input voltage 0'
    },
    '0x51': {
        name: 'Input voltage 1',
        type: 'uint16',
        length: 2,
        description: 'Input voltage 1'
    },
    '0x52': {
        name: 'Input voltage 2',
        type: 'uint16',
        length: 2,
        description: 'Input voltage 2'
    },
    '0x53': {
        name: 'Input voltage 3',
        type: 'uint16',
        length: 2,
        description: 'Input voltage 3'
    },
    '0x54': {
        name: 'Input 4 Values',
        type: 'uint16',
        length: 2,
        description: 'Input 4 Values'
    },
    '0x55': {
        name: 'Input 5 Values',
        type: 'uint16',
        length: 2,
        description: 'Input 5 Values'
    },
    '0x56': {
        name: 'Input 6 Values',
        type: 'uint16',
        length: 2,
        description: 'Input 6 Values'
    },
    '0x57': {
        name: 'Input 7 Values',
        type: 'uint16',
        length: 2,
        description: 'Input 7 Values'
    },
    '0x58': {
        name: 'RS232 0',
        type: 'uint16',
        length: 2,
        description: 'RS232 0'
    },
    '0x59': {
        name: 'RS232 1',
        type: 'uint16',
        length: 2,
        description: 'RS232 1'
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
        length: 2,
        description: 'Accelerometer readings (X, Y, Z) in m/s²'
    },
    '0x78': {
        name: 'Input 8 Value',
        type: 'int16',
        length: 2,
        description: 'Input 8 Value'
    },
    '0x79': {
        name: 'Input 9 Value',
        type: 'int16',
        length: 2,
        description: 'Input 9 Value'
    },
    '0x7a': {
        name: 'Input 10 Value',
        type: 'uint16',
        length: 2,
        description: 'Input 10 Value'
    },
    '0x7b': {
        name: 'Input 11 Value',
        type: 'uint16',
        length: 2,
        description: 'Input 11 Value'
    },
    '0x7c': {
        name: 'Input 12 Value',
        type: 'uint16',
        length: 2,
        description: 'Input 12 Value'
    },
    '0x7d': {
        name: 'Input 13 Value',
        type: 'uint16',
        length: 2,
        description: 'Input 13 Value'
    },
    '0x7e': {
        name: 'Input 14 Value',
        type: 'uint16',
        length: 2,
        description: 'Input 14 Value'
    },
    '0x7f': {
        name: 'Input 15 Value',
        type: 'uint16',
        length: 2,
        description: 'Input 15 Value'
    },
    '0xe2': {
        name: 'User data 0',
        type: 'uint32',
        length: 4,
        description: 'User data 0'
    },
    '0xe3': {
        name: 'User data 1',
        type: 'uint32',
        length: 4,
        description: 'User data 1'
    },
    '0xe4': {
        name: 'User data 2',
        type: 'uint32',
        length: 4,
        description: 'User data 2'
    },
    '0xe5': {
        name: 'User data 3',
        type: 'uint32',
        length: 4,
        description: 'User data 3'
    },
    '0xe6': {
        name: 'User data 4',
        type: 'uint32',
        length: 4,
        description: 'User data 4'
    },
    '0xe7': {
        name: 'User data 5',
        type: 'uint32',
        length: 4,
        description: 'User data 5'
    },
    '0xe8': {
        name: 'User data 6',
        type: 'uint32',
        length: 4,
        description: 'User data 6'
    },
    '0xe9': {
        name: 'User data 7',
        type: 'uint32',
        length: 4,
        description: 'User data 7'
    },
    '0x0001': {
        name: 'Modbus 0',
        type: 'uint32_modbus',
        length: 4,
        description: 'Modbus 0'
    },
    '0x0002': {
        name: 'Modbus 1',
        type: 'uint32_modbus',
        length: 4,
        description: 'Modbus 1'
    },
    '0x0003': {
        name: 'Modbus 2',
        type: 'uint32_modbus',
        length: 4,
        description: 'Modbus 2'
    },
    '0x0004': {
        name: 'Modbus 3',
        type: 'uint32_modbus',
        length: 4,
        description: 'Modbus 3'
    },
    '0x0005': {
        name: 'Modbus 4',
        type: 'uint32_modbus',
        length: 4,
        description: 'Modbus 4'
    },
    '0x0006': {
        name: 'Modbus 5',
        type: 'uint32_modbus',
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
    '0x000a': {
        name: 'Modbus 10',
        type: 'uint32',
        length: 4,
        description: 'Modbus 10'
    },
    '0x000b': {
        name: 'Modbus 11',
        type: 'uint32',
        length: 4,
        description: 'Modbus 11'
    },
    '0x000c': {
        name: 'Modbus 12',
        type: 'uint32',
        length: 4,
        description: 'Modbus 12'
    },
    '0x000d': {
        name: 'Modbus 13',
        type: 'uint32',
        length: 4,
        description: 'Modbus 13'
    },
    '0x000e': {
        name: 'Modbus 14',
        type: 'uint32',
        length: 4,
        description: 'Modbus 14'
    },
    '0x000f': {
        name: 'Modbus 15',
        type: 'uint32',
        length: 4,
        description: 'Modbus 15'
    },
    '0xd4': {
        name: 'Total Milleage GPS',
        type: 'uint32',
        length: 4,
        description: 'Total Milleage GPS'
    }
};

module.exports = tagDefinitions;
