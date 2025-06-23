// backend/src/routes/api.js
const express = require('express');
const router = express.Router();
const { Device, FieldMapping, DataPoint, Record } = require('../models');
const parser = require('../services/parser');
const deviceMapper = require('../services/deviceMapper');
const asyncHandler = require('../utils/asyncHandler');
const packetQueue = require('../services/packetQueue');

// Mount sub-routers
router.use('/devices', require('./devices'));
router.use('/mapping', require('./mapping'));
router.use('/alerts', require('./alerts'));
router.use('/settings', require('./settings'));

// Get all devices
router.get('/devices', asyncHandler(async (req, res) => {
    const devices = await Device.findAll({
        attributes: ['id', 'name', 'imei', 'status', 'lastSeen']
    });
    res.json(devices);
}));

// Get device by ID
router.get('/devices/:id', asyncHandler(async (req, res) => {
    const device = await Device.findByPk(req.params.id, {
        include: [FieldMapping]
    });
    
    if (!device) {
        res.status(404).json({ error: 'Device not found' });
        return;
    }
    
    res.json(device);
}));

// Get device data
router.get('/devices/:deviceId/data', asyncHandler(async (req, res) => {
    const data = await DataPoint.findAll({
        where: { deviceId: req.params.deviceId },
        order: [['timestamp', 'DESC']],
        limit: parseInt(req.query.limit) || 100
    });
    res.json(data);
}));

// Get packet queue statistics
router.get('/queue/stats', asyncHandler(async (req, res) => {
    const stats = packetQueue.getStats();
    res.json(stats);
}));

module.exports = router;
