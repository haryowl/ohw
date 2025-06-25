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

// Get tracking data for a device (using device datetime for filtering)
router.get('/:deviceId/tracking', asyncHandler(async (req, res) => {
    const { deviceId } = req.params;
    const { startDate, endDate } = req.query;
    
    const where = {
        deviceImei: deviceId,
        latitude: { [Op.ne]: null },
        longitude: { [Op.ne]: null }
    };
    
    if (startDate && endDate) {
        // Use device datetime field for filtering instead of server timestamp
        where.datetime = {
            [Op.between]: [new Date(startDate), new Date(endDate)]
        };
    }
    
    const trackingData = await Record.findAll({
        where,
        attributes: ['timestamp', 'datetime', 'latitude', 'longitude', 'speed', 'direction', 'height', 'satellites'],
        order: [['datetime', 'ASC']] // Order by device datetime instead of server timestamp
    });
    
    res.json(trackingData);
}));

// Get export data for a device (using device datetime for filtering)
router.get('/:deviceId/export', asyncHandler(async (req, res) => {
    const { deviceId } = req.params;
    const { startDate, endDate } = req.query;
    
    const where = {
        deviceImei: deviceId
    };
    
    if (startDate && endDate) {
        // Use device datetime field for filtering instead of server timestamp
        where.datetime = {
            [Op.between]: [new Date(startDate), new Date(endDate)]
        };
    }
    
    const exportData = await Record.findAll({
        where,
        attributes: [
            'timestamp', 'datetime', 'latitude', 'longitude', 'speed', 'direction', 
            'height', 'satellites', 'status', 'supplyVoltage', 'batteryVoltage',
            'input0', 'input1', 'input2', 'input3',
            'inputVoltage0', 'inputVoltage1', 'inputVoltage2', 'inputVoltage3',
            'inputVoltage4', 'inputVoltage5', 'inputVoltage6',
            'userData0', 'userData1', 'userData2', 'userData3',
            'userData4', 'userData5', 'userData6', 'userData7',
            'modbus0', 'modbus1', 'modbus2', 'modbus3', 'modbus4', 'modbus5',
            'modbus6', 'modbus7', 'modbus8', 'modbus9', 'modbus10', 'modbus11',
            'modbus12', 'modbus13', 'modbus14', 'modbus15'
        ],
        order: [['datetime', 'ASC']] // Order by device datetime instead of server timestamp
    });
    
    res.json(exportData);
}));

// Get dashboard data
router.get('/dashboard', asyncHandler(async (req, res) => {
    const stats = await dataAggregator.getDashboardData();
    const realtimeData = await dataAggregator.getRealtimeData(); // Example
    res.json({ stats, realtimeData });
}));

module.exports = router;
