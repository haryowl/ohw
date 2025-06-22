const express = require('express');
const router = express.Router();
const { Record } = require('../models');
const { Op } = require('sequelize');
const { Parser: Json2csvParser } = require('json2csv');
const ExcelJS = require('exceljs');

// Get records with optional date filtering
router.get('/', async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const where = {};
        if (startDate && endDate) {
            where.timestamp = {
                [Op.between]: [new Date(startDate), new Date(endDate)]
            };
        }
        const records = await Record.findAll({
            where,
            order: [['timestamp', 'DESC']],
            limit: 1000 // Increase limit for export preview
        });
        res.json(records);
    } catch (error) {
        console.error('Error fetching records:', error);
        res.status(500).json({ error: 'Failed to fetch records' });
    }
});

// Export records
router.post('/export', async (req, res) => {
    try {
        const { startDate, endDate, format, fields } = req.body;
        const where = {};
        if (startDate && endDate) {
            where.timestamp = {
                [Op.between]: [new Date(startDate), new Date(endDate)]
            };
        }
        const records = await Record.findAll({
            where,
            order: [['timestamp', 'DESC']]
        });
        const data = records.map(r => r.toJSON());
        const selectedData = data.map(row => {
            const filtered = {};
            fields.forEach(f => filtered[f] = row[f]);
            return filtered;
        });
        if (format === 'csv') {
            const parser = new Json2csvParser({ fields });
            const csv = parser.parse(selectedData);
            res.header('Content-Type', 'text/csv');
            res.attachment('data-export.csv');
            return res.send(csv);
        } else if (format === 'json') {
            res.header('Content-Type', 'application/json');
            res.attachment('data-export.json');
            return res.send(JSON.stringify(selectedData, null, 2));
        } else if (format === 'xlsx') {
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Export');
            worksheet.columns = fields.map(f => ({ header: f, key: f }));
            worksheet.addRows(selectedData);
            res.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.attachment('data-export.xlsx');
            await workbook.xlsx.write(res);
            return res.end();
        } else {
            return res.status(400).json({ error: 'Invalid export format' });
        }
    } catch (error) {
        console.error('Error exporting records:', error);
        res.status(500).json({ error: 'Failed to export records' });
    }
});

module.exports = router; 