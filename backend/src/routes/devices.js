// backend/src/routes/devices.js
const express = require('express');
const router = express.Router();
const deviceManager = require('../services/deviceManager');
const asyncHandler = require('../utils/asyncHandler'); // Import the asyncHandler middleware
const tagDefinitions = require('../services/tagDefinitions');
const TagParser = require('../services/tagParser');
const { Record } = require('../models');
const { Op } = require('sequelize');

// Get all devices
router.get('/', asyncHandler(async (req, res) => {
    const devices = await deviceManager.getAllDevices();
    res.json(devices);
}));

// Get all devices with current location
router.get('/locations', asyncHandler(async (req, res) => {
    const devices = await deviceManager.getAllDevices();
    
    // Get the latest location for each device
    const devicesWithLocations = await Promise.all(
        devices.map(async (device) => {
            const latestRecord = await Record.findOne({
                where: {
                    deviceImei: device.imei,
                    latitude: { [Op.ne]: null },
                    longitude: { [Op.ne]: null }
                },
                order: [['timestamp', 'DESC']],
                attributes: ['latitude', 'longitude', 'timestamp', 'speed', 'direction']
            });
            
            return {
                ...device.toJSON(),
                location: latestRecord ? {
                    latitude: latestRecord.latitude,
                    longitude: latestRecord.longitude,
                    timestamp: latestRecord.timestamp,
                    speed: latestRecord.speed,
                    direction: latestRecord.direction
                } : null
            };
        })
    );
    
    res.json(devicesWithLocations);
}));

// Get device by ID
router.get('/:id', asyncHandler(async (req, res) => {
    const device = await deviceManager.getDeviceById(req.params.id);
    if (!device) {
        return res.status(404).json({ message: 'Device not found' });
    }
    res.json(device);
}));

// Update device
router.put('/:id', asyncHandler(async (req, res) => {
    const { id } = req.params;
    const updates = req.body;

    const device = await deviceManager.getDeviceById(id);
    if (!device) {
        return res.status(404).json({ message: 'Device not found' });
    }

    await device.update(updates);
    res.json({ message: 'Device updated successfully' });
}));

// Delete device
router.delete('/:id', asyncHandler(async (req, res) => {
    const { id } = req.params;
    const device = await deviceManager.getDeviceById(id);
    if (!device) {
        return res.status(404).json({ message: 'Device not found' });
    }

    await device.destroy();
    res.json({ message: 'Device deleted successfully' });
}));

module.exports = router;

