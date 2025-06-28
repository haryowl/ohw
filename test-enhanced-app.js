console.log('Testing enhanced app import...');

try {
    const { app, tcpServer } = require('./backend/src/app');
    console.log('✅ Enhanced app imported successfully');
    
    // Check if app has routes
    if (app._router && app._router.stack) {
        console.log('📋 Available routes:');
        app._router.stack.forEach((middleware) => {
            if (middleware.route) {
                const methods = Object.keys(middleware.route.methods);
                console.log(`  ${methods.join(',').toUpperCase()} ${middleware.route.path}`);
            } else if (middleware.name === 'router') {
                console.log(`  Router: ${middleware.regexp}`);
            }
        });
    } else {
        console.log('❌ No routes found in app');
    }
    
    console.log('✅ TCP server imported:', typeof tcpServer);
    
} catch (error) {
    console.error('❌ Error importing enhanced app:', error.message);
    console.error('Stack trace:', error.stack);
} 