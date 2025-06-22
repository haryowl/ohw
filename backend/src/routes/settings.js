    // backend/src/routes/settings.js
    const express = require('express');
    const router = express.Router();
    const asyncHandler = require('../utils/asyncHandler'); // Import your async error handler
    // Import your settings service or model

    // Get settings
    router.get('/', asyncHandler(async (req, res) => {
        const settings = {
            // Add your default settings here
            parser: {
                maxPacketSize: 1024,
                validateChecksum: true
            },
            tcp: {
                port: 5000,
                timeout: 30000
            }
        };
        res.json(settings);
    }));

    // Update settings
    router.put('/', asyncHandler(async (req, res) => {
        const newSettings = req.body;
        // Add your settings update logic here
        res.json({ message: 'Settings updated successfully' });
    }));

    module.exports = router;
