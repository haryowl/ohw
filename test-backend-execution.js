// Test script to verify which backend is being executed
const { spawn } = require('child_process');
const path = require('path');

console.log('🔍 Testing Backend Execution');
console.log('============================');

// Test 1: Direct execution
console.log('\n📋 Test 1: Direct execution of termux-enhanced-backend.js');
console.log('Command: node termux-enhanced-backend.js');

const directProcess = spawn('node', ['termux-enhanced-backend.js'], {
    stdio: ['pipe', 'pipe', 'pipe'],
    cwd: __dirname
});

let directOutput = '';
let directError = '';

directProcess.stdout.on('data', (data) => {
    directOutput += data.toString();
});

directProcess.stderr.on('data', (data) => {
    directError += data.toString();
});

directProcess.on('close', (code) => {
    console.log('Direct execution output (first 500 chars):');
    console.log(directOutput.substring(0, 500));
    if (directError) {
        console.log('Direct execution errors:');
        console.log(directError);
    }
    console.log('Direct execution exit code:', code);
    
    // Test 2: Script execution
    console.log('\n📋 Test 2: Script execution via start-enhanced.sh');
    console.log('Command: bash start-enhanced.sh');
    
    const scriptProcess = spawn('bash', ['start-enhanced.sh'], {
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: __dirname
    });
    
    let scriptOutput = '';
    let scriptError = '';
    
    scriptProcess.stdout.on('data', (data) => {
        scriptOutput += data.toString();
    });
    
    scriptProcess.stderr.on('data', (data) => {
        scriptError += data.toString();
    });
    
    scriptProcess.on('close', (code) => {
        console.log('Script execution output (first 500 chars):');
        console.log(scriptOutput.substring(0, 500));
        if (scriptError) {
            console.log('Script execution errors:');
            console.log(scriptError);
        }
        console.log('Script execution exit code:', code);
        
        console.log('\n🎯 Analysis:');
        console.log('Direct execution contains "ENHANCED":', directOutput.includes('ENHANCED'));
        console.log('Script execution contains "ENHANCED":', scriptOutput.includes('ENHANCED'));
        console.log('Direct execution contains "SIMPLE":', directOutput.includes('SIMPLE'));
        console.log('Script execution contains "SIMPLE":', scriptOutput.includes('SIMPLE'));
        
        if (directOutput.includes('ENHANCED') && scriptOutput.includes('SIMPLE')) {
            console.log('❌ ISSUE FOUND: Script is running the wrong backend!');
        } else if (directOutput.includes('ENHANCED') && scriptOutput.includes('ENHANCED')) {
            console.log('✅ Both executions are using the enhanced backend');
        } else {
            console.log('⚠️  Unexpected result - need further investigation');
        }
    });
});

// Kill processes after 5 seconds
setTimeout(() => {
    directProcess.kill();
    console.log('\n⏰ Test timeout - killing processes');
}, 5000); 