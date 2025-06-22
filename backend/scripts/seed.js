// backend/scripts/seed.js

const { Device, FieldMapping } = require('../src/models');
const logger = require('../src/utils/logger');

async function seed() {
  try {
    // Create default device
    const device = await Device.create({
      name: 'Test Device',
      imei: '123456789012345',
      status: 'active'
    });

    // Create default mappings
    await FieldMapping.bulkCreate([
      {
        deviceId: device.id,
        originalField: '0x20',
        customName: 'timestamp',
        enabled: true
      },
      {
        deviceId: device.id,
        originalField: '0x30',
        customName: 'location',
        enabled: true
      },
      {
        deviceId: device.id,
        originalField: '0x33',
        customName: 'speed',
        enabled: true
      }
    ]);

    logger.info('Database seeding completed');
    process.exit(0);
  } catch (error) {
    logger.error('Seeding failed:', error);
    process.exit(1);
  }
}

seed();
