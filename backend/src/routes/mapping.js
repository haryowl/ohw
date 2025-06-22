    // backend/src/routes/mapping.js
    const express = require('express');
    const router = express.Router();
    const { FieldMapping } = require('../models');
    const asyncHandler = require('../utils/asyncHandler');

    // Get all mappings
    router.get('/all', asyncHandler(async (req, res) => {
        const mappings = await FieldMapping.findAll({
            order: [['originalField', 'ASC']]
        });
        res.json(mappings);
    }));

    // Get mappings for a device
    router.get('/:deviceId', asyncHandler(async (req, res) => {
        const { deviceId } = req.params;
        const mappings = await FieldMapping.findAll({
            where: { deviceId },
            order: [['originalField', 'ASC']]
        });
        res.json(mappings);
    }));

    // Create a new mapping
    router.post('/', asyncHandler(async (req, res) => {
        const mapping = await FieldMapping.create(req.body);
        res.status(201).json(mapping);
    }));

    // Update a mapping
    router.put('/:id', asyncHandler(async (req, res) => {
        const { id } = req.params;
        const mapping = await FieldMapping.findByPk(id);
        if (!mapping) {
            return res.status(404).json({ message: 'Mapping not found' });
        }
        await mapping.update(req.body);
        res.json(mapping);
    }));

    // Delete a mapping
    router.delete('/:id', asyncHandler(async (req, res) => {
        const { id } = req.params;
        const mapping = await FieldMapping.findByPk(id);
        if (!mapping) {
            return res.status(404).json({ message: 'Mapping not found' });
        }
        await mapping.destroy();
        res.json({ message: 'Mapping deleted successfully' });
    }));

    // Get preview data
    router.get('/preview', asyncHandler(async (req, res) => {
        // Return some sample data for preview
        res.json([
            { originalField: '0x46', value: 'ON' },
            { originalField: '0x50', value: '24.5V' },
            { originalField: '0x51', value: '23.8V' }
        ]);
    }));

    // Export mappings
    router.get('/export/:format', asyncHandler(async (req, res) => {
        const { format } = req.params;
        const mappings = await FieldMapping.findAll({
            order: [['originalField', 'ASC']]
        });

        if (format === 'json') {
            res.json(mappings);
        } else if (format === 'csv') {
            // Convert to CSV
            const csv = mappings.map(m => 
                `${m.originalField},${m.customName},${m.dataType},${m.unit},${m.enabled}`
            ).join('\n');
            res.setHeader('Content-Type', 'text/csv');
            res.send(csv);
        } else {
            res.status(400).json({ message: 'Unsupported export format' });
        }
    }));

    module.exports = router;

