// Test script to analyze mobile parsing issues
const fs = require('fs');

// Simulate the problematic packet data from the mobile log
// Based on the log showing tags like 0x68, 0xa1, 0x5a

function analyzePacketStructure() {
    console.log('🔍 Analyzing mobile packet structure...');
    
    // Create a test packet that simulates the problematic data
    // The issue seems to be that the parser is reading individual bytes as tags
    // instead of properly parsing the protocol structure
    
    const testPacket = Buffer.from([
        // Header
        0x01, // Packet type
        0x00, 0x20, // Length (32 bytes)
        
        // Record 1 - should start with 0x10
        0x10, 0x02, // Valid tags
        
        // Problematic data - these should NOT be treated as tags
        0x68, 0xa1, 0x5a, 0x68, // These are likely data bytes, not tags
        
        // More valid tags
        0x21, 0x30, 0x33, 0x34, 0x35, 0x40, 0x41, 0x42, 0x45, 0x46, 0x50, 0x51, 0x52, 0xe2,
        
        // Extended tags
        0xfe, 0x00, 0x04, // Extended tags block: length = 4 bytes
        0x00, 0x01, 0x00, 0x02 // Extended tags: 0x0001, 0x0002
    ]);
    
    console.log('📦 Test packet structure:');
    console.log('Header:', testPacket[0].toString(16).padStart(2, '0'));
    console.log('Length:', testPacket.readUInt16LE(1));
    console.log('Data length:', testPacket.length - 3);
    
    console.log('\n🔍 Analyzing byte-by-byte:');
    let offset = 3; // Skip header and length
    
    while (offset < testPacket.length) {
        const byte = testPacket[offset];
        const hexByte = byte.toString(16).padStart(2, '0');
        
        // Check if this could be a valid tag
        const isValidTag = [
            0x01, 0x02, 0x03, 0x04, 0x10, 0x20, 0x21, 0x30, 0x33, 0x34, 0x35,
            0x40, 0x41, 0x42, 0x43, 0x44, 0x45, 0x46, 0x47, 0x48, 0x49,
            0x50, 0x51, 0x52, 0x53, 0x54, 0x55, 0x56, 0xe2, 0xe3, 0xe4, 0xe5, 0xe6, 0xe7, 0xe8, 0xe9, 0xfe
        ].includes(byte);
        
        console.log(`Offset ${offset}: 0x${hexByte} ${isValidTag ? '✅ Valid tag' : '❌ Data byte'}`);
        offset++;
    }
    
    console.log('\n💡 Analysis:');
    console.log('- The parser is reading individual bytes as tags');
    console.log('- Bytes like 0x68, 0xa1, 0x5a are data, not tags');
    console.log('- This suggests the parser is not properly handling record boundaries');
    console.log('- The issue is likely in the record parsing logic');
}

function testRecordBoundaryDetection() {
    console.log('\n🔍 Testing record boundary detection...');
    
    // Create a packet with multiple records
    const multiRecordPacket = Buffer.from([
        // Header
        0x01, // Packet type
        0x00, 0x40, // Length (64 bytes)
        
        // Record 1
        0x10, 0x02, 0x21, 0x30, 0x33, 0x34, 0x35, 0x40, 0x41, 0x42, 0x45, 0x46, 0x50, 0x51, 0x52, 0xe2,
        
        // Some data bytes (should be ignored)
        0x68, 0xa1, 0x5a, 0x68,
        
        // Record 2
        0x10, 0x02, 0x21, 0x30, 0x33, 0x34, 0x35, 0x40, 0x41, 0x42, 0x45, 0x46, 0x50, 0x51, 0x52, 0xe2,
        
        // More data bytes
        0x5e, 0xa1, 0x5a, 0x68,
        
        // Record 3
        0x10, 0x02, 0x21, 0x30, 0x33, 0x34, 0x35, 0x40, 0x41, 0x42, 0x45, 0x46, 0x50, 0x51, 0x52, 0xe2
    ]);
    
    console.log('📦 Multi-record packet structure:');
    console.log('Total length:', multiRecordPacket.length);
    
    // Find all 0x10 tags (record starts)
    const recordStarts = [];
    for (let i = 3; i < multiRecordPacket.length - 1; i++) {
        if (multiRecordPacket[i] === 0x10) {
            recordStarts.push(i);
        }
    }
    
    console.log('📍 Record start positions:', recordStarts);
    console.log('📊 Number of records found:', recordStarts.length);
    
    // Analyze each record
    for (let i = 0; i < recordStarts.length; i++) {
        const start = recordStarts[i];
        const end = (i < recordStarts.length - 1) ? recordStarts[i + 1] : multiRecordPacket.length;
        
        console.log(`\n📝 Record ${i + 1} (${start}-${end}):`);
        let offset = start;
        const tags = [];
        
        while (offset < end && offset < multiRecordPacket.length - 1) {
            const tag = multiRecordPacket[offset];
            const hexTag = tag.toString(16).padStart(2, '0');
            
            // Check if it's a valid tag
            const isValidTag = [
                0x01, 0x02, 0x03, 0x04, 0x10, 0x20, 0x21, 0x30, 0x33, 0x34, 0x35,
                0x40, 0x41, 0x42, 0x43, 0x44, 0x45, 0x46, 0x47, 0x48, 0x49,
                0x50, 0x51, 0x52, 0x53, 0x54, 0x55, 0x56, 0xe2, 0xe3, 0xe4, 0xe5, 0xe6, 0xe7, 0xe8, 0xe9, 0xfe
            ].includes(tag);
            
            if (isValidTag) {
                tags.push(`0x${hexTag}`);
            } else {
                console.log(`  ⚠️  Data byte at ${offset}: 0x${hexTag} (not a tag)`);
            }
            
            offset++;
        }
        
        console.log(`  ✅ Valid tags: [${tags.join(', ')}]`);
    }
}

// Run the analysis
analyzePacketStructure();
testRecordBoundaryDetection();

console.log('\n🎯 Conclusion:');
console.log('The issue is that the parser is reading individual bytes as tags');
console.log('instead of properly parsing the protocol structure.');
console.log('The fix should ensure that only valid protocol tags are processed.');
console.log('Data bytes between records should be ignored or handled differently.'); 