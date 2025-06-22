// backend/src/services/alertManager.js

const config = require('../config');
const logger = require('../utils/logger');
const { Alert, AlertRule } = require('../models');
const websocketHandler = require('./websocketHandler');

class AlertManager {
    constructor() {
        this.rules = new Map();
        this.loadRules();
    }

    async loadRules() {
        const rules = await AlertRule.findAll();
        rules.forEach(rule => {
            this.rules.set(rule.id, this.compileRule(rule));
        });
    }

    async loadRules() {
        try {
            const rules = await AlertRule.findAll({
                where: { enabled: true }
            });

            rules.forEach(rule => {
                this.rules.set(rule.id, this.compileRule(rule));
            });

            logger.info(`Loaded ${rules.length} alert rules`);
        } catch (error) {
            logger.error('Error loading alert rules:', error);
        }
    }

    async checkAlerts(deviceId, data) {
        const alerts = [];
        
        for (const [ruleId, evaluator] of this.rules) {
            try {
                if (evaluator(data)) {
                    const alert = await this.createAlert(deviceId, ruleId, data);
                    alerts.push(alert);
                }
            } catch (error) {
                logger.error(`Alert rule ${ruleId} evaluation error:`, error);
            }
        }

        if (alerts.length > 0) {
            await Alert.bulkCreate(alerts);
            websocketHandler.broadcastToDevice(deviceId, {
                type: 'alerts',
                alerts
            });
        }

        return alerts;
    }

    createAlert(deviceId, ruleId, data) {
        return {
            deviceId,
            ruleId,
            timestamp: new Date(),
            data: JSON.stringify(data)
        };
    }

    notifyAlerts(deviceId, alerts) {
        websocketHandler.broadcastDeviceData(deviceId, {
            type: 'alerts',
            alerts
        });
    }
}

module.exports = new AlertManager();
