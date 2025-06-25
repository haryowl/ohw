// Test script to analyze the correct record structure parsing
const fs = require('fs');

// Sample packet data from the log
const rawPacketData = '0177011026232012255c6821040030101971a0ff52d05e063300000000342f0035e740080a41385e42480f450f00460200500000519e5e520000e22b71a0fffe0c000100000000000200000000001025232008255c6821090030101971a0ff52d05e063300000000342f0035e740080a41345e42480f450f0046020050000051995e520000e22b71a0fffe0c0001000000000002000000000010242320fe245c6821100030101971a0ff52d05e063300000000342f0035e740080a41365e42440f450f0046020050000051a05e520000e22b71a0fffe0c0001000000000002000000000010232320f4245c6821170030101971a0ff52d05e063300000000342f0035e740080a412e5e42440f450f00460200500000518f5e520000e22b71a0fffe0c0001000000000002000000000010222320ea245c6821050030101971a0ff52d05e063300000000342f0035e740080a41255e42440f450f0046020050000051905e520000e22b71a0fffe0c0001000000000002000000000022e0';

console.log('🔍 ANALYZING RECORD STRUCTURE');
console.log('================================');

// Convert hex string to buffer
const buffer = Buffer.from(rawPacketData, 'hex');

console.log('📦 Packet Structure:');
console.log(`Header: 0x${buffer.readUInt8(0).toString(16).padStart(2, '0')}`);
console.log(`Length: 0x${buffer.readUInt16LE(1).toString(16).padStart(4, '0')}`);

// Extract data portion (skip header and length)
const dataStart = 3;
const dataEnd = buffer.length - 2; // Exclude checksum
const dataBuffer = buffer.slice(dataStart, dataEnd);

console.log(`\n📊 Data portion length: ${dataBuffer.length} bytes`);
console.log(`Data: ${dataBuffer.toString('hex')}`);

// Find all 0x10 positions in data
const recordStarts = [];
for (let i = 0; i < dataBuffer.length; i++) {
    if (dataBuffer.readUInt8(i) === 0x10) {
        recordStarts.push(i);
    }
}

console.log(`\n🔍 Found ${recordStarts.length} positions with 0x10:`);
recordStarts.forEach((pos, index) => {
    console.log(`  Position ${index + 1}: ${pos} (0x${pos.toString(16)})`);
});

// Analyze first record structure
console.log('\n📋 ANALYZING FIRST RECORD STRUCTURE:');
const firstRecordStart = recordStarts[0];
const firstRecordData = dataBuffer.slice(firstRecordStart);

console.log(`First record starts at position: ${firstRecordStart}`);
console.log(`First record data: ${firstRecordData.toString('hex')}`);

// Parse first record manually to understand structure
let offset = 0;
const tags = [];

while (offset < firstRecordData.length) {
    const tag = firstRecordData.readUInt8(offset);
    offset++;
    
    console.log(`\nTag 0x${tag.toString(16).padStart(2, '0')} at position ${offset - 1}`);
    
    if (tag === 0x00) {
        console.log('  -> End of record marker');
        break;
    }
    
    if (tag === 0xFE) {
        console.log('  -> Extended tag');
        const length = firstRecordData.readUInt8(offset);
        offset++;
        console.log(`    Length: ${length}`);
        
        for (let i = 0; i < length; i++) {
            const extTag = firstRecordData.readUInt16LE(offset);
            offset += 2;
            console.log(`    Extended tag: 0x${extTag.toString(16).padStart(4, '0')}`);
            
            // Read extended tag value (assuming 4 bytes for modbus)
            const extValue = firstRecordData.readUInt32LE(offset);
            offset += 4;
            console.log(`    Value: 0x${extValue.toString(16).padStart(8, '0')}`);
        }
        continue;
    }
    
    // Determine value length based on tag
    let valueLength = 0;
    let valueType = '';
    
    switch (tag) {
        case 0x10: // Number of archive records
            valueLength = 2;
            valueType = 'uint16';
            break;
        case 0x20: // Date and Time
            valueLength = 4;
            valueType = 'uint32';
            break;
        case 0x21: // Milliseconds
            valueLength = 2;
            valueType = 'uint16';
            break;
        case 0x30: // Coordinates
            valueLength = 9;
            valueType = 'coordinates';
            break;
        case 0x33: // Speed and direction
            valueLength = 4;
            valueType = 'uint32';
            break;
        case 0x34: // Height
            valueLength = 2;
            valueType = 'uint16';
            break;
        case 0x35: // HDOP
            valueLength = 1;
            valueType = 'uint8';
            break;
        case 0x40: // Status
            valueLength = 2;
            valueType = 'uint16';
            break;
        case 0x41: // Supply voltage
            valueLength = 2;
            valueType = 'uint16';
            break;
        case 0x42: // Battery voltage
            valueLength = 2;
            valueType = 'uint16';
            break;
        case 0x45: // Status output
            valueLength = 2;
            valueType = 'uint16';
            break;
        case 0x46: // Status input
            valueLength = 2;
            valueType = 'uint16';
            break;
        case 0x50: // Input voltage 0
            valueLength = 2;
            valueType = 'uint16';
            break;
        case 0x51: // Input voltage 1
            valueLength = 2;
            valueType = 'uint16';
            break;
        case 0x52: // Input voltage 2
            valueLength = 2;
            valueType = 'uint16';
            break;
        case 0xe2: // User data 0
            valueLength = 4;
            valueType = 'uint32';
            break;
        default:
            console.log(`  -> Unknown tag, skipping`);
            offset++;
            continue;
    }
    
    if (offset + valueLength <= firstRecordData.length) {
        const valueBuffer = firstRecordData.slice(offset, offset + valueLength);
        let value;
        
        switch (valueType) {
            case 'uint8':
                value = valueBuffer.readUInt8(0);
                break;
            case 'uint16':
                value = valueBuffer.readUInt16LE(0);
                break;
            case 'uint32':
                value = valueBuffer.readUInt32LE(0);
                break;
            case 'coordinates':
                value = valueBuffer.toString('hex');
                break;
            default:
                value = valueBuffer.toString('hex');
        }
        
        console.log(`  Value (${valueType}): 0x${value.toString(16).padStart(valueLength * 2, '0')}`);
        offset += valueLength;
        
        tags.push({
            tag: `0x${tag.toString(16).padStart(2, '0')}`,
            value: value,
            type: valueType
        });
    } else {
        console.log(`  -> Not enough data for value`);
        break;
    }
}

console.log('\n📋 FIRST RECORD TAGS FOUND:');
tags.forEach((tag, index) => {
    console.log(`${index + 1}. ${tag.tag}: ${tag.value} (${tag.type})`);
});

console.log('\n🔍 CORRECT RECORD COUNT:');
console.log('Based on the analysis, there should be 5 records, not 11!');
console.log('The parser is incorrectly treating 0x10 bytes within data as new record starts.');

// Show where the next record should start
if (recordStarts.length > 1) {
    console.log('\n📍 NEXT RECORD START POSITIONS:');
    recordStarts.slice(1).forEach((pos, index) => {
        console.log(`Record ${index + 2} should start at position: ${pos}`);
    });
} 