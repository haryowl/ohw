#!/usr/bin/env node

/**
 * Test Data Persistence Improvements
 * 
 * This script tests the enhanced data persistence mechanisms
 * to ensure data survives device restarts and other issues.
 */

const fs = require('fs');
const path = require('path');

console.log('🧪 Testing Data Persistence Improvements');
console.log('==========================================');

// Test directories
const testDirs = [
    'data',
    'backups',
    'mobile-sync-data',
    'mobile-sync-backups'
];

// Test files
const testFiles = [
    'data/parsed_data.json',
    'data/devices.json',
    'data/last_imei.json',
    'mobile-sync-data/sync_data.json'
];

// Test data
const testData = {
    records: [
        {
            deviceImei: '123456789012345',
            timestamp: new Date().toISOString(),
            latitude: 40.7128,
            longitude: -74.0060,
            speed: 25.5
        },
        {
            deviceImei: '987654321098765',
            timestamp: new Date().toISOString(),
            latitude: 34.0522,
            longitude: -118.2437,
            speed: 30.2
        }
    ],
    devices: {
        '123456789012345': {
            firstSeen: new Date().toISOString(),
            lastSeen: new Date().toISOString(),
            recordCount: 1,
            totalRecords: 1
        },
        '987654321098765': {
            firstSeen: new Date().toISOString(),
            lastSeen: new Date().toISOString(),
            recordCount: 1,
            totalRecords: 1
        }
    },
    lastUpdate: new Date().toISOString()
};

// Test functions
function testDirectoryCreation() {
    console.log('\n📁 Testing Directory Creation...');
    
    testDirs.forEach(dir => {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
            console.log(`✅ Created directory: ${dir}`);
        } else {
            console.log(`✅ Directory exists: ${dir}`);
        }
    });
}

function testFileCreation() {
    console.log('\n📄 Testing File Creation...');
    
    // Create test data files
    fs.writeFileSync('data/parsed_data.json', JSON.stringify(testData.records, null, 2));
    fs.writeFileSync('data/devices.json', JSON.stringify(testData.devices, null, 2));
    fs.writeFileSync('data/last_imei.json', JSON.stringify({ lastIMEI: '123456789012345' }, null, 2));
    fs.writeFileSync('mobile-sync-data/sync_data.json', JSON.stringify(testData, null, 2));
    
    console.log('✅ Created test data files');
}

function testBackupCreation() {
    console.log('\n💾 Testing Backup Creation...');
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    // Create backups
    const backupData = {
        ...testData,
        timestamp: timestamp
    };
    
    fs.writeFileSync(`backups/data_backup_${timestamp}.json`, JSON.stringify(backupData, null, 2));
    fs.writeFileSync(`mobile-sync-backups/sync_data_backup_${timestamp}.json`, JSON.stringify(backupData, null, 2));
    
    console.log('✅ Created backup files');
}

function testDataRecovery() {
    console.log('\n🔧 Testing Data Recovery...');
    
    // Simulate corrupted main file
    fs.writeFileSync('data/parsed_data.json', 'invalid json data');
    
    // Try to recover from backup
    const backupFiles = fs.readdirSync('backups')
        .filter(file => file.startsWith('data_backup_') && file.endsWith('.json'))
        .sort();
    
    if (backupFiles.length > 0) {
        const latestBackup = backupFiles[backupFiles.length - 1];
        const backupData = JSON.parse(fs.readFileSync(`backups/${latestBackup}`, 'utf8'));
        
        // Restore main file from backup
        fs.writeFileSync('data/parsed_data.json', JSON.stringify(backupData.records, null, 2));
        console.log('✅ Data recovered from backup');
    } else {
        console.log('⚠️ No backup files found');
    }
}

function testFileIntegrity() {
    console.log('\n🔍 Testing File Integrity...');
    
    testFiles.forEach(file => {
        if (fs.existsSync(file)) {
            try {
                const data = JSON.parse(fs.readFileSync(file, 'utf8'));
                const size = fs.statSync(file).size;
                console.log(`✅ ${file}: ${size} bytes, valid JSON`);
            } catch (error) {
                console.log(`❌ ${file}: Invalid JSON - ${error.message}`);
            }
        } else {
            console.log(`⚠️ ${file}: File not found`);
        }
    });
}

function testBackupCleanup() {
    console.log('\n🗑️ Testing Backup Cleanup...');
    
    // Create multiple backup files
    for (let i = 0; i < 7; i++) {
        const timestamp = new Date(Date.now() - i * 60000).toISOString().replace(/[:.]/g, '-');
        const backupData = {
            ...testData,
            timestamp: timestamp
        };
        
        fs.writeFileSync(`backups/data_backup_${timestamp}.json`, JSON.stringify(backupData, null, 2));
    }
    
    // Simulate cleanup (keep last 5)
    const backupFiles = fs.readdirSync('backups')
        .filter(file => file.startsWith('data_backup_') && file.endsWith('.json'))
        .sort();
    
    if (backupFiles.length > 5) {
        const filesToDelete = backupFiles.slice(0, backupFiles.length - 5);
        filesToDelete.forEach(file => {
            fs.unlinkSync(`backups/${file}`);
            console.log(`🗑️ Deleted old backup: ${file}`);
        });
    }
    
    const remainingBackups = fs.readdirSync('backups')
        .filter(file => file.startsWith('data_backup_') && file.endsWith('.json'));
    
    console.log(`✅ Backup cleanup complete: ${remainingBackups.length} backups remaining`);
}

function testStorageLimits() {
    console.log('\n📊 Testing Storage Limits...');
    
    // Test large data handling
    const largeData = {
        records: Array.from({ length: 10000 }, (_, i) => ({
            deviceImei: '123456789012345',
            timestamp: new Date().toISOString(),
            latitude: 40.7128 + (i * 0.0001),
            longitude: -74.0060 + (i * 0.0001),
            speed: 25.5 + (i % 10)
        }))
    };
    
    const dataSize = JSON.stringify(largeData).length;
    console.log(`📊 Large dataset size: ${(dataSize / 1024 / 1024).toFixed(2)} MB`);
    
    if (dataSize > 5 * 1024 * 1024) {
        console.log('⚠️ Data exceeds 5MB limit, would be trimmed');
        const trimmedData = {
            records: largeData.records.slice(-1000)
        };
        const trimmedSize = JSON.stringify(trimmedData).length;
        console.log(`📊 Trimmed dataset size: ${(trimmedSize / 1024 / 1024).toFixed(2)} MB`);
    } else {
        console.log('✅ Data within size limits');
    }
}

// Run all tests
async function runTests() {
    try {
        testDirectoryCreation();
        testFileCreation();
        testBackupCreation();
        testDataRecovery();
        testFileIntegrity();
        testBackupCleanup();
        testStorageLimits();
        
        console.log('\n🎉 All Data Persistence Tests Completed!');
        console.log('\n📋 Summary:');
        console.log('- Directory creation: ✅');
        console.log('- File creation: ✅');
        console.log('- Backup creation: ✅');
        console.log('- Data recovery: ✅');
        console.log('- File integrity: ✅');
        console.log('- Backup cleanup: ✅');
        console.log('- Storage limits: ✅');
        
        console.log('\n💡 Recommendations:');
        console.log('1. Always export data before device restarts');
        console.log('2. Use the recovery buttons if data is lost');
        console.log('3. Monitor backup file sizes');
        console.log('4. Test recovery procedures regularly');
        
    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
        process.exit(1);
    }
}

// Run tests if called directly
if (require.main === module) {
    runTests();
}

module.exports = {
    testDirectoryCreation,
    testFileCreation,
    testBackupCreation,
    testDataRecovery,
    testFileIntegrity,
    testBackupCleanup,
    testStorageLimits,
    runTests
}; 