// Test script for multiple records parsing
// Using the actual packet data from the mobile application log

const fs = require('fs');

// Copy the tagDefinitions from termux-enhanced-backend.js
const tagDefinitions = {
    '0x01': { type: 'uint8', description: 'Number Archive Records' },
    '0x02': { type: 'uint8', description: 'Number Event Records' },
    '0x03': { type: 'string', length: 15, description: 'IMEI' },
    '0x04': { type: 'uint8', description: 'Number Service Records' },
    '0x10': { type: 'uint16', description: 'Number Archive Records' },
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
    '0x44': { type: 'uint32', description: 'Acceleration' },
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

// Simplified parseExtendedTags function
async function parseExtendedTags(buffer, offset) {
    const result = {};
    let currentOffset = offset;
    
    if (currentOffset + 2 > buffer.length) {
        return [result, currentOffset];
    }
    
    const length = buffer.readUInt16LE(currentOffset);
    currentOffset += 2;
    
    const endOffset = currentOffset + length;
    
    if (endOffset > buffer.length) {
        return [result, currentOffset];
    }
    
    while (currentOffset < endOffset) {
        if (currentOffset + 2 > endOffset) {
            break;
        }
        
        const tag = buffer.readUInt16LE(currentOffset);
        currentOffset += 2;
        
        const tagHex = `0x${tag.toString(16).padStart(4, '0')}`;
        const definition = tagDefinitions[tagHex];

        if (!definition) {
            if (currentOffset + 4 <= endOffset) {
                currentOffset += 4;
            } else {
                break;
            }
            continue;
        }

        let value;
        switch (definition.type) {
            case 'uint32_modbus':
                value = buffer.readUInt32LE(currentOffset)/100;
                currentOffset += 4;
                break;
            default:
                currentOffset += 4;
                value = null;
        }

        if (value !== null) {
            result[tagHex] = {
                value: value,
                type: definition.type,
                description: definition.description
            };
        }
    }
    
    return [result, currentOffset];
}

// Test the multiple records parsing logic
async function testMultipleRecordsParsing() {
    // The actual packet data from the log
    const packetHex = "01d0081045b92033905f68211300300ef470a0ff6bd05e063300000000343200350640080a410a2f42200e450f00460000500000510000520000530000540000550000e200000000e300000000e400000000fe0c000100000000000200000000001044b92031905f68211300300ff470a0ff6bd05e063300000000343200350640080a41f22e42200e450f00460000500000510000520000530000540000550000e200000000e300000000e400000000fe0c000100000000000200000000001043b9202f905f68211100330ff470a0ff6bd05e063300000000343200350640080a41c42e42200e450f00460000500000510000520000530000540000550000e200000000e300000000e400000000fe0c000100000000000200000000001042b9202d905f68211000330ff470a0ff6bd05e063300000000343200350640080a41fa2e42200e450f00460000500000510000520000530000540000550000e200000000e300000000e400000000fe0c000100000000000200000000001041b9202b905f68211100330ff470a0ff6bd05e063300000000343200350640080a41ee2e42200e450f00460000500000510000520000530000540000550000e200000000e300000000e400000000fe0c000100000000000200000000001040b92029905f68210f00300ef470a0ff6bd05e063300000000343200350640080a41f72e42200e450f00460000500000510000520000530000540000550000e200000000e300000000e400000000fe0c00010000000000020000000000103fb92027905f68210a00300cf470a0ff6bd05e063300000000343200350740080a41e72e42200e450f00460000500000510000520000530000540000550000e200000000e300000000e400000000fe0c00010000000000020000000000103eb92025905f68210a00330ff470a0ff6bd05e063300000000343200350640080a41f42e42200e450f00460000500000510000520000530000540000550000e200000000e300000000e400000000fe0c00010000000000020000000000103db92023905f68210800330ff470a0ff6bd05e063300000000343200350640080a41fa2e42200e450f00460000500000510000520000530000540000550000e200000000e300000000e400000000fe0c00010000000000020000000000103cb92021905f68210400330ff470a0ff6bd05e063300000000343200350640080a41132f42200e450f00460000500000510000520000530000540000550000e200000000e300000000e400000000fe0c00010000000000020000000000103bb9201f905f68210300300cf470a0ff6bd05e063300000000343200350740080a410e2f42200e450f00460000500000510000520000530000540000550000e200000000e300000000e400000000fe0c00010000000000020000000000103ab9201d905f68210100330df470a0ff6bd05e063300000000343200350640080a410a2f42200e450f00460000500000510000520000530000540000550000e200000000e300000000e400000000fe0c000100000000000200000000001039b9201b905f68210200330ff470a0ff6bd05e063300000000343200350640080a41d32e42200e450f00460000500000510000520000530000540000550000e200000000e300000000e400000000fe0c000100000000000200000000001038b92019905f68210000330ff470a0ff6bd05e063300000000343200350640080a41ea2e42200e450f00460000500000510000520000530000540000550000e200000000e300000000e400000000fe0c000100000000000200000000001037b92017905f68211800330ff470a0ff6bd05e063300000000343200350640080a41f22e42210e450f00460000500000510000520000530000540000550000e200000000e300000000e400000000fe0c000100000000000200000000001036b92015905f68211800300ef470a0ff6bd05e063300000000343200350640080a41ea2e42210e450f00460000500000510000520000530000540000550000e200000000e300000000e400000000fe0c000100000000000200000000001035b92013905f68211300300ef470a0ff6bd05e063300000000343200350640080a41f12e42210e450f00460000500000510000520000530000540000550000e200000000e300000000e400000000fe0c000100000000000200000000001034b92011905f68211200300ef470a0ff6bd05e063300000000343200350640080a41fc2e42210e450f00460000500000510000520000530000540000550000e200000000e300000000e400000000fe0c000100000000000200000000001033b9200f905f68211100300ef470a0ff6bd05e063300000000343200350640080a41f32e42210e450f00460000500000510000520000530000540000550000e200000000e300000000e400000000fe0c000100000000000200000000001032b9200d905f68210f00300ef470a0ff6bd05e063300000000343200350640080a41e02e42210e450f00460000500000510000520000530000540000550000e200000000e300000000e400000000fe0c000100000000000200000000001031b9200b905f68210c00300df470a0ff6bd05e063300000000343200350640080a41f72e42210e450f00460000500000510000520000530000540000550000e200000000e300000000e400000000fe0c000100000000000200000000001030b92009905f68210f00330ff470a0ff6bd05e063300000000343200350640080a41012f42210e450f00460000500000510000520000530000540000550000e200000000e300000000e400000000fe0c00010000000000020000000000102fb92007905f68210d00330bf470a0ff6bd05e063300000000343200350740080a41ed2e42210e450f00460000500000510000520000530000540000550000e200000000e300000000e400000000fe0c00010000000000020000000000102eb92005905f68210000330ef470a0ff6bd05e063300000000343200350640080a41ff2e42210e450f00460000500000510000520000530000540000550000e200000000e300000000e400000000fe0c00010000000000020000000000338a";
    
    const buffer = Buffer.from(packetHex, 'hex');
    
    console.log('🧪 TESTING MULTIPLE RECORDS PARSING');
    console.log('=====================================');
    console.log(`Packet length: ${buffer.length} bytes`);
    console.log(`Packet hex: ${packetHex}`);
    console.log('');
    
    // Extract header and length
    const header = buffer.readUInt8(0);
    const rawLength = buffer.readUInt16LE(1);
    const hasUnsentData = (rawLength & 0x8000) !== 0;
    const actualLength = rawLength & 0x7FFF;
    
    console.log(`Header: 0x${header.toString(16)}`);
    console.log(`Raw length: ${rawLength}`);
    console.log(`Has unsent data: ${hasUnsentData}`);
    console.log(`Actual length: ${actualLength}`);
    console.log('');
    
    // Count 0x10 tags (record starts)
    let recordStartCount = 0;
    let recordStartPositions = [];
    for (let i = 3; i < 3 + actualLength - 2; i++) {
        if (buffer.readUInt8(i) === 0x10) {
            recordStartCount++;
            recordStartPositions.push(i);
        }
    }
    console.log(`🔍 Found ${recordStartCount} record start tags (0x10) in packet data`);
    console.log(`🔍 Record start positions: ${recordStartPositions.join(', ')}`);
    console.log('');
    
    // Test the parsing logic
    const result = {
        header: header,
        length: actualLength,
        rawLength: actualLength,
        records: []
    };

    let currentOffset = 3;
    const endOffset = 3 + actualLength;

    console.log('Processing multiple records packet with CORRECTED parser');
    
    let dataOffset = currentOffset;
    let recordIndex = 0;
    
    while (dataOffset < endOffset - 2) {
        // Look for next record start (0x10 tag)
        let recordStart = -1;
        for (let i = dataOffset; i < endOffset - 2; i++) {
            if (buffer.readUInt8(i) === 0x10) {
                recordStart = i;
                break;
            }
        }
        
        if (recordStart === -1) {
            console.log('No more record starts found');
            break;
        }
        
        console.log(`Parsing record ${recordIndex + 1} starting at position ${recordStart}`);
        
        // Parse this record completely
        const record = { tags: {} };
        let recordOffset = recordStart;
        
        while (recordOffset < endOffset - 2) {
            const tag = buffer.readUInt8(recordOffset);
            recordOffset++;
            
            // Check for end of record - look for next 0x10 tag or 0x00
            if (tag === 0x00) {
                console.log(`Record ${recordIndex + 1} ended at position ${recordOffset} (found 0x00)`);
                break;
            }
            
            // Check if we've reached the next record start (0x10 tag)
            if (tag === 0x10 && recordOffset > recordStart + 1) {
                console.log(`Record ${recordIndex + 1} ended at position ${recordOffset - 1} (found next 0x10)`);
                recordOffset--; // Go back one position so the next iteration can process this 0x10
                break;
            }
            
            if (tag === 0xFE) {
                const [extendedTags, newOffset] = await parseExtendedTags(buffer, recordOffset);
                Object.assign(record.tags, extendedTags);
                recordOffset = newOffset;
                continue;
            }
            
            const tagHex = `0x${tag.toString(16).padStart(2, '0')}`;
            const definition = tagDefinitions[tagHex];
            
            console.log(`🔍 Record ${recordIndex + 1}: Processing tag ${tagHex} at position ${recordOffset - 1}`);
            
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
                    for (let i = 0; i < 16; i++) {
                        value.states[`output${i}`] = outputsBinary[15 - i] === '1';
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
                    for (let i = 0; i < 16; i++) {
                        value.states[`input${i}`] = inputsBinary[15 - i] === '1';
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

            if (value !== null) {
                record.tags[tagHex] = {
                    value: value,
                    type: definition.type,
                    description: definition.description
                };
            }
        }

        if (Object.keys(record.tags).length > 0) {
            result.records.push(record);
            console.log(`Record ${recordIndex + 1} parsed with ${Object.keys(record.tags).length} tags`);
        }
        
        // FIXED: Properly advance to next record start position
        dataOffset = recordOffset;
        recordIndex++;
        
        console.log(`Advanced dataOffset to position ${dataOffset} for next record search`);
    }
    
    console.log(`📊 MULTIPLE RECORDS SUMMARY: Expected ${recordStartCount} records, processed ${result.records.length} records`);
    console.log('');
    console.log('✅ TEST COMPLETED');
    
    return result;
}

// Run the test
testMultipleRecordsParsing().then(result => {
    console.log('Final result:', JSON.stringify(result, null, 2));
}).catch(error => {
    console.error('Test failed:', error);
}); 