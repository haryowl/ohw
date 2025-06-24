const fs = require('fs');

// Import the parser functions from termux-enhanced-backend.js
// We'll copy the essential parts for testing

// Tag definitions
const tagDefinitions = {
    '0x01': { type: 'uint8', description: 'Number Archive Records' },
    '0x02': { type: 'uint8', description: 'Number Event Records' },
    '0x03': { type: 'string', length: 15, description: 'IMEI' },
    '0x04': { type: 'uint8', description: 'Number Service Records' },
    '0x10': { type: 'uint8', description: 'Number Archive Records' },
    '0x20': { type: 'datetime', description: 'Date and Time' },
    '0x21': { type: 'uint16', description: 'Milliseconds' },
    '0x30': { type: 'coordinates', description: 'Coordinates' },
    '0x33': { type: 'speedDirection', description: 'Speed and Direction' },
    '0x34': { type: 'uint16', description: 'Height' },
    '0x35': { type: 'uint8', description: 'HDOP' },
    '0x40': { type: 'status', description: 'Status' },
    '0x41': { type: 'uint16', description: 'Supply Voltage' },
    '0x42': { type: 'uint16', description: 'Battery Voltage' },
    '0x43': { type: 'int8', description: 'Temperature' },
    '0x44': { type: 'uint16', description: 'Acceleration' },
    '0x45': { type: 'outputs', description: 'Outputs' },
    '0x46': { type: 'inputs', description: 'Inputs' },
    '0x47': { type: 'uint8', description: 'Eco Driving' },
    '0x48': { type: 'uint16', description: 'Expanded Status' },
    '0x49': { type: 'uint8', description: 'Transmission Channel' },
    '0x50': { type: 'uint16', description: 'Input Voltage 0' },
    '0x51': { type: 'uint16', description: 'Input Voltage 1' },
    '0x52': { type: 'uint16', description: 'Input Voltage 2' },
    '0x53': { type: 'uint16', description: 'Input Voltage 3' },
    '0x54': { type: 'uint16', description: 'Input Voltage 4' },
    '0x55': { type: 'uint16', description: 'Input Voltage 5' },
    '0x56': { type: 'uint16', description: 'Input Voltage 6' },
    '0xe2': { type: 'uint32', description: 'User Data 0' },
    '0xe3': { type: 'uint32', description: 'User Data 1' },
    '0xe4': { type: 'uint32', description: 'User Data 2' },
    '0xe5': { type: 'uint32', description: 'User Data 3' },
    '0xe6': { type: 'uint32', description: 'User Data 4' },
    '0xe7': { type: 'uint32', description: 'User Data 5' },
    '0xe8': { type: 'uint32', description: 'User Data 6' },
    '0xe9': { type: 'uint32', description: 'User Data 7' },
    '0x0001': { type: 'uint32_modbus', description: 'Modbus 0' },
    '0x0002': { type: 'uint32_modbus', description: 'Modbus 1' },
    '0x0003': { type: 'uint32_modbus', description: 'Modbus 2' },
    '0x0004': { type: 'uint32_modbus', description: 'Modbus 3' },
    '0x0005': { type: 'uint32_modbus', description: 'Modbus 4' },
    '0x0006': { type: 'uint32_modbus', description: 'Modbus 5' },
    '0x0007': { type: 'uint32_modbus', description: 'Modbus 6' },
    '0x0008': { type: 'uint32_modbus', description: 'Modbus 7' },
    '0x0009': { type: 'uint32_modbus', description: 'Modbus 8' },
    '0x000a': { type: 'uint32_modbus', description: 'Modbus 9' },
    '0x000b': { type: 'uint32_modbus', description: 'Modbus 10' },
    '0x000c': { type: 'uint32_modbus', description: 'Modbus 11' },
    '0x000d': { type: 'uint32_modbus', description: 'Modbus 12' },
    '0x000e': { type: 'uint32_modbus', description: 'Modbus 13' },
    '0x000f': { type: 'uint32_modbus', description: 'Modbus 14' },
    '0x0010': { type: 'uint32_modbus', description: 'Modbus 15' }
};

async function parseExtendedTags(buffer, offset) {
    const result = {};
    let currentOffset = offset;
    
    // Check if we have enough bytes for the length field
    if (currentOffset + 2 > buffer.length) {
        console.warn('Not enough bytes for extended tags length');
        return [result, currentOffset];
    }
    
    // Read the length of extended tags block (2 bytes)
    const length = buffer.readUInt16LE(currentOffset);
    currentOffset += 2;
    
    const endOffset = currentOffset + length;
    
    // Check if the calculated end offset is within bounds
    if (endOffset > buffer.length) {
        console.warn(`Extended tags length ${length} would exceed buffer bounds. Available: ${buffer.length - currentOffset}`);
        return [result, currentOffset];
    }
    
    while (currentOffset < endOffset) {
        // Check if we have enough bytes for the tag
        if (currentOffset + 2 > endOffset) {
            console.warn('Not enough bytes for extended tag');
            break;
        }
        
        // Extended tags are 2 bytes each
        const tag = buffer.readUInt16LE(currentOffset);
        currentOffset += 2;
        
        // Look up extended tag definition
        const tagHex = `0x${tag.toString(16).padStart(4, '0')}`;
        const definition = tagDefinitions[tagHex];

        if (!definition) {
            console.warn(`Unknown extended tag: ${tagHex}`);
            // Skip 4 bytes for unknown extended tags, but check bounds
            if (currentOffset + 4 <= endOffset) {
                currentOffset += 4;
            } else {
                console.warn('Not enough bytes for unknown extended tag value');
                break;
            }
            continue;
        }

        let value;
        switch (definition.type) {
            case 'uint8':
                if (currentOffset + 1 <= endOffset) {
                    value = buffer.readUInt8(currentOffset);
                    currentOffset += 1;
                } else {
                    console.warn('Not enough bytes for uint8 value');
                    break;
                }
                break;
            case 'uint16':
                if (currentOffset + 2 <= endOffset) {
                    value = buffer.readUInt16LE(currentOffset);
                    currentOffset += 2;
                } else {
                    console.warn('Not enough bytes for uint16 value');
                    break;
                }
                break;
            case 'uint32':
                if (currentOffset + 4 <= endOffset) {
                    value = buffer.readUInt32LE(currentOffset);
                    currentOffset += 4;
                } else {
                    console.warn('Not enough bytes for uint32 value');
                    break;
                }
                break;
            case 'uint32_modbus':
                if (currentOffset + 4 <= endOffset) {
                    value = buffer.readUInt32LE(currentOffset)/100;
                    currentOffset += 4;
                } else {
                    console.warn('Not enough bytes for uint32_modbus value');
                    break;
                }
                break;
            case 'int8':
                if (currentOffset + 1 <= endOffset) {
                    value = buffer.readInt8(currentOffset);
                    currentOffset += 1;
                } else {
                    console.warn('Not enough bytes for int8 value');
                    break;
                }
                break;
            case 'int16':
                if (currentOffset + 2 <= endOffset) {
                    value = buffer.readInt16LE(currentOffset);
                    currentOffset += 2;
                } else {
                    console.warn('Not enough bytes for int16 value');
                    break;
                }
                break;
            case 'int32':
                if (currentOffset + 4 <= endOffset) {
                    value = buffer.readInt32LE(currentOffset);
                    currentOffset += 4;
                } else {
                    console.warn('Not enough bytes for int32 value');
                    break;
                }
                break;
            default:
                console.warn(`Unsupported extended tag type: ${definition.type}`);
                if (currentOffset + 4 <= endOffset) {
                    currentOffset += 4; // Default to 4 bytes
                } else {
                    console.warn('Not enough bytes for default extended tag value');
                    break;
                }
                value = null;
        }

        result[tagHex] = {
            value: value,
            type: definition.type,
            description: definition.description
        };
    }

    return [result, currentOffset];
}

async function parseMainPacket(buffer, offset = 0, actualLength) {
    try {
        const result = {
            header: buffer.readUInt8(offset),
            length: actualLength,
            rawLength: actualLength,
            records: []
        };

        let currentOffset = offset + 3;
        const endOffset = offset + actualLength;

        if (actualLength < 32) {
            // Single record packet
            const record = { tags: {} };
            let recordOffset = currentOffset;

            while (recordOffset < endOffset - 2) {
                const tag = buffer.readUInt8(recordOffset);
                recordOffset++;

                console.log('Found tag:', `0x${tag.toString(16).padStart(2, '0')}`);

                if (tag === 0xFE) {
                    const [extendedTags, newOffset] = await parseExtendedTags(buffer, recordOffset);
                    Object.assign(record.tags, extendedTags);
                    recordOffset = newOffset;
                    continue;
                }

                const tagHex = `0x${tag.toString(16).padStart(2, '0')}`;
                const definition = tagDefinitions[tagHex];

                if (!definition) {
                    console.warn(`Unknown tag: ${tagHex}`);
                    continue;
                }

                let value;
                switch (definition.type) {
                    case 'uint8':
                        value = buffer.readUInt8(recordOffset);
                        recordOffset += 1;
                        break;
                    case 'uint16':
                        value = buffer.readUInt16LE(recordOffset);
                        recordOffset += 2;
                        break;
                    case 'uint32':
                        value = buffer.readUInt32LE(recordOffset);
                        recordOffset += 4;
                        break;
                    case 'uint32_modbus':
                        value = buffer.readUInt32LE(recordOffset)/100;
                        recordOffset += 4;
                        break;
                    case 'int8':
                        value = buffer.readInt8(recordOffset);
                        recordOffset += 1;
                        break;
                    case 'int16':
                        value = buffer.readInt16LE(recordOffset);
                        recordOffset += 2;
                        break;
                    case 'int32':
                        value = buffer.readInt32LE(recordOffset);
                        recordOffset += 4;
                        break;
                    case 'string':
                        value = buffer.toString('utf8', recordOffset, recordOffset + definition.length);
                        recordOffset += definition.length;
                        break;
                    case 'datetime':
                        value = new Date(buffer.readUInt32LE(recordOffset) * 1000);
                        recordOffset += 4;
                        break;
                    case 'coordinates':
                        const satellites = buffer.readUInt8(recordOffset) & 0x0F;
                        const correctness = (buffer.readUInt8(recordOffset) >> 4) & 0x0F;
                        recordOffset++;
                        const lat = buffer.readInt32LE(recordOffset) / 1000000;
                        recordOffset += 4;
                        const lon = buffer.readInt32LE(recordOffset) / 1000000;
                        recordOffset += 4;
                        value = { latitude: lat, longitude: lon, satellites, correctness };
                        break;
                    case 'status':
                        value = buffer.readUInt16LE(recordOffset);
                        recordOffset += 2;
                        break;
                    case 'outputs':
                        const outputsValue = buffer.readUInt16LE(recordOffset);
                        const outputsBinary = outputsValue.toString(2).padStart(16, '0');
                        value = {
                            raw: outputsValue,
                            binary: outputsBinary,
                            states: {}
                        };
                        for (let j = 0; j < 16; j++) {
                            value.states[`output${j}`] = outputsBinary[15 - j] === '1';
                        }
                        recordOffset += 2;
                        break;
                    case 'inputs':
                        const inputsValue = buffer.readUInt16LE(recordOffset);
                        const inputsBinary = inputsValue.toString(2).padStart(16, '0');
                        value = {
                            raw: inputsValue,
                            binary: inputsBinary,
                            states: {}
                        };
                        for (let j = 0; j < 16; j++) {
                            value.states[`input${j}`] = inputsBinary[15 - j] === '1';
                        }
                        recordOffset += 2;
                        break;
                    case 'speedDirection':
                        const speedValue = buffer.readUInt16LE(recordOffset);
                        const directionValue = buffer.readUInt16LE(recordOffset + 2);
                        value = {
                            speed: speedValue / 10,
                            direction: directionValue / 10
                        };
                        recordOffset += 4;
                        break;
                    default:
                        console.warn(`Unsupported tag type: ${definition.type}`);
                        recordOffset += definition.length || 1;
                        value = null;
                }

                record.tags[tagHex] = {
                    value: value,
                    type: definition.type,
                    description: definition.description
                };
            }

            if (Object.keys(record.tags).length > 0) {
                result.records.push(record);
                console.log('Record extracted tags:', Object.keys(record.tags));
            }
        } else {
            // Multiple records packet - find record boundaries using 0x10 tags
            console.log('Processing multiple records packet');
            
            // Find all record start positions (0x10 tags)
            const recordStarts = [];
            let searchOffset = currentOffset;
            
            while (searchOffset < endOffset - 2) {
                if (buffer.readUInt8(searchOffset) === 0x10) {
                    recordStarts.push(searchOffset);
                }
                searchOffset++;
            }
            
            console.log(`Found ${recordStarts.length} record start positions`);
            
            // Parse each record
            for (let i = 0; i < recordStarts.length; i++) {
                const recordStart = recordStarts[i];
                const recordEnd = (i < recordStarts.length - 1) ? recordStarts[i + 1] : endOffset;
                
                console.log(`Parsing record ${i + 1}/${recordStarts.length}, start: ${recordStart}, end: ${recordEnd}`);
                
                const record = { tags: {} };
                let recordOffset = recordStart;
                
                while (recordOffset < recordEnd && recordOffset < endOffset - 2) {
                    const tag = buffer.readUInt8(recordOffset);
                    recordOffset++;
                    
                    console.log('Found tag:', `0x${tag.toString(16).padStart(2, '0')}`);
                    
                    if (tag === 0xFE) {
                        const [extendedTags, newOffset] = await parseExtendedTags(buffer, recordOffset);
                        Object.assign(record.tags, extendedTags);
                        recordOffset = newOffset;
                        continue;
                    }
                    
                    const tagHex = `0x${tag.toString(16).padStart(2, '0')}`;
                    const definition = tagDefinitions[tagHex];
                    
                    if (!definition) {
                        console.warn(`Unknown tag: ${tagHex}`);
                        continue;
                    }
                    
                    let value;
                    switch (definition.type) {
                        case 'uint8':
                            value = buffer.readUInt8(recordOffset);
                            recordOffset += 1;
                            break;
                        case 'uint16':
                            value = buffer.readUInt16LE(recordOffset);
                            recordOffset += 2;
                            break;
                        case 'uint32':
                            value = buffer.readUInt32LE(recordOffset);
                            recordOffset += 4;
                            break;
                        case 'uint32_modbus':
                            value = buffer.readUInt32LE(recordOffset)/100;
                            recordOffset += 4;
                            break;
                        case 'int8':
                            value = buffer.readInt8(recordOffset);
                            recordOffset += 1;
                            break;
                        case 'int16':
                            value = buffer.readInt16LE(recordOffset);
                            recordOffset += 2;
                            break;
                        case 'int32':
                            value = buffer.readInt32LE(recordOffset);
                            recordOffset += 4;
                            break;
                        case 'string':
                            value = buffer.toString('utf8', recordOffset, recordOffset + definition.length);
                            recordOffset += definition.length;
                            break;
                        case 'datetime':
                            value = new Date(buffer.readUInt32LE(recordOffset) * 1000);
                            recordOffset += 4;
                            break;
                        case 'coordinates':
                            const satellites = buffer.readUInt8(recordOffset) & 0x0F;
                            const correctness = (buffer.readUInt8(recordOffset) >> 4) & 0x0F;
                            recordOffset++;
                            const lat = buffer.readInt32LE(recordOffset) / 1000000;
                            recordOffset += 4;
                            const lon = buffer.readInt32LE(recordOffset) / 1000000;
                            recordOffset += 4;
                            value = { latitude: lat, longitude: lon, satellites, correctness };
                            break;
                        case 'status':
                            value = buffer.readUInt16LE(recordOffset);
                            recordOffset += 2;
                            break;
                        case 'outputs':
                            const outputsValue = buffer.readUInt16LE(recordOffset);
                            const outputsBinary = outputsValue.toString(2).padStart(16, '0');
                            value = {
                                raw: outputsValue,
                                binary: outputsBinary,
                                states: {}
                            };
                            for (let j = 0; j < 16; j++) {
                                value.states[`output${j}`] = outputsBinary[15 - j] === '1';
                            }
                            recordOffset += 2;
                            break;
                        case 'inputs':
                            const inputsValue = buffer.readUInt16LE(recordOffset);
                            const inputsBinary = inputsValue.toString(2).padStart(16, '0');
                            value = {
                                raw: inputsValue,
                                binary: inputsBinary,
                                states: {}
                            };
                            for (let j = 0; j < 16; j++) {
                                value.states[`input${j}`] = inputsBinary[15 - j] === '1';
                            }
                            recordOffset += 2;
                            break;
                        case 'speedDirection':
                            const speedValue = buffer.readUInt16LE(recordOffset);
                            const directionValue = buffer.readUInt16LE(recordOffset + 2);
                            value = {
                                speed: speedValue / 10,
                                direction: directionValue / 10
                            };
                            recordOffset += 4;
                            break;
                        default:
                            console.warn(`Unsupported tag type: ${definition.type}`);
                            recordOffset += definition.length || 1;
                            value = null;
                    }
                    
                    record.tags[tagHex] = {
                        value: value,
                        type: definition.type,
                        description: definition.description
                    };
                }
                
                if (Object.keys(record.tags).length > 0) {
                    result.records.push(record);
                    console.log(`Record ${i + 1} extracted tags:`, Object.keys(record.tags));
                }
            }
        }

        return result;
    } catch (error) {
        console.error('Error parsing main packet:', error);
        throw error;
    }
}

// Test with a sample packet that would cause the out-of-bounds error
async function testParser() {
    console.log('Testing termux parser with bounds checking...');
    
    // Create a test packet that simulates the problematic data
    // This is a simplified version of what might cause the error
    const testData = Buffer.from([
        0x01, // Header
        0x00, 0x20, // Length (32 bytes)
        // Record 1
        0x10, 0x04, 0x21, 0x30, 0x33, 0x34, 0x35, 0x40, 0x41, 0x42, 0x45, 0x46, 0x50, 0x51, 0x52, 0xe2, 0x0001, 0x0002,
        // Record 2 (partial, would cause bounds error)
        0x10, 0x04, 0xfe, 0x00, 0x10, // Extended tags with length 16 but not enough data
        0x21, 0x68, 0x73, 0xc9, 0x06, 0x5e, 0x34, 0x00, 0x09, 0x40, 0x26, 0x42, 0x03, 0x46, 0x84, 0x51
    ]);
    
    try {
        const result = await parseMainPacket(testData, 0, 32);
        console.log('Parse result:', JSON.stringify(result, null, 2));
        console.log('✅ Test passed - no out-of-bounds error');
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

// Run the test
testParser(); 