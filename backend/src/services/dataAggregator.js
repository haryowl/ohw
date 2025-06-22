// backend/src/services/dataAggregator.js

const { DataPoint, Device } = require('../models');
const { Op } = require('sequelize');

class DataAggregator {
    async getDeviceStatistics(deviceId, timeRange) {
        try {
            const endDate = new Date();
            const startDate = new Date(endDate - timeRange);

            const data = await DataPoint.findAll({
                where: {
                    deviceId,
                    timestamp: {
                        [Op.between]: [startDate, endDate]
                    }
                },
                order: [['timestamp', 'ASC']]
            });

            return this.calculateStatistics(data);
        } catch (error) {
            logger.error('Error getting device statistics:', error);
            throw error;
        }
    }

    async getDashboardData() {
        try {
            const now = new Date();
            const dayAgo = new Date(now - 24 * 60 * 60 * 1000);

            const stats = {
                activeDevices: await Device.count({
                    where: {
                        status: 'active',
                        lastSeen: {
                            [Op.gt]: dayAgo
                        }
                    }
                }),
                totalMessages: await DataPoint.count({
                    where: {
                        timestamp: {
                            [Op.gt]: dayAgo
                        }
                    }
                }),
                // Add more statistics as needed
            };

            return stats;
        } catch (error) {
            logger.error('Error getting dashboard data:', error);
            throw error;
        }
    }

    calculateStatistics(data) {
        const stats = {
            totalPoints: data.length,
            averageSpeed: 0,
            maxSpeed: 0,
            distanceTraveled: 0,
            fuelConsumption: 0,
            engineHours: 0,
            alerts: 0
        };

        let prevPoint = null;
        data.forEach(point => {
            // Update statistics based on point data
            if (point.mappedData.speed) {
                stats.averageSpeed += point.mappedData.speed;
                stats.maxSpeed = Math.max(stats.maxSpeed, point.mappedData.speed);
            }

            if (prevPoint) {
                // Calculate distance between points
                const distance = this.calculateDistance(
                    prevPoint.mappedData.location,
                    point.mappedData.location
                );
                stats.distanceTraveled += distance;
            }

            prevPoint = point;
        });

        stats.averageSpeed /= data.length || 1;
        return stats;
    }

    calculateDistance(point1, point2) {
        if (!point1 || !point2) return 0;

        const R = 6371; // Earth's radius in km
        const dLat = this.toRad(point2.latitude - point1.latitude);
        const dLon = this.toRad(point2.longitude - point1.longitude);
        const lat1 = this.toRad(point1.latitude);
        const lat2 = this.toRad(point2.latitude);

        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.sin(dLon/2) * Math.sin(dLon/2) * 
                Math.cos(lat1) * Math.cos(lat2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }

    toRad(value) {
        return value * Math.PI / 180;
    }
}

module.exports = new DataAggregator();
