// backend/src/routes/data.js
const express = require('express');
const router = express.Router();
const asyncHandler = require('../utils/asyncHandler'); // Import your async error handler
const dataAggregator = require('../services/dataAggregator'); // Import your data service
const { Record } = require('../models');
const { Op } = require('sequelize');

// Get device data
router.get('/:deviceId', asyncHandler(async (req, res) => {
    const { deviceId } = req.params;
    const data = await dataAggregator.getDeviceData(deviceId); // Call your data service
    res.json(data);
}));

// Get tracking data for a device
router.get('/:deviceId/tracking', asyncHandler(async (req, res) => {
    const { deviceId } = req.params;
    const { startDate, endDate } = req.query;
    
    const where = {
        deviceImei: deviceId,
        latitude: { [Op.ne]: null },
        longitude: { [Op.ne]: null }
    };
    
    if (startDate && endDate) {
        where.timestamp = {
            [Op.between]: [new Date(startDate), new Date(endDate)]
        };
    }
    
    const trackingData = await Record.findAll({
        where,
        attributes: ['timestamp', 'latitude', 'longitude', 'speed', 'direction', 'height', 'satellites'],
        order: [['timestamp', 'ASC']]
    });
    
    res.json(trackingData);
}));

// Get dashboard data
router.get('/dashboard', asyncHandler(async (req, res) => {
    const stats = await dataAggregator.getDashboardData();
    const realtimeData = await dataAggregator.getRealtimeData(); // Example
    res.json({ stats, realtimeData });
}));

module.exports = router;
