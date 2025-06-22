class SpecialParsers {
    /**
     * Parse temperature sensor with ID
     */
    static parseTempId(buffer, offset) {
        const identifier = buffer.readUInt8(offset);
        const temperature = buffer.readInt8(offset + 1);
        
        // Check for disconnection (ID 127, temp -128)
        if (identifier === 127 && temperature === -128) {
            return [{
                sensorId: identifier,
                temperature: null,
                connected: false
            }, offset + 2];
        }

        return [{
            sensorId: identifier,
            temperature: temperature,
            connected: true
        }, offset + 2];
    }

    /**
     * Parse CAN fuel data
     */
    static parseCanFuel(buffer, offset) {
        const fuelLevel = buffer.readUInt8(offset) * 0.4;
        const coolantTemp = buffer.readInt8(offset + 1) - 40;
        const engineSpeed = (buffer.readUInt16LE(offset + 2) * 0.125);

        return [{
            fuelLevel,
            coolantTemp,
            engineSpeed
        }, offset + 4];
    }

    /**
     * Parse RS485 fuel sensor with temperature
     */
    static parseRs485Fuel(buffer, offset) {
        const fuelLevel = buffer.readUInt16LE(offset);
        const temperature = buffer.readInt8(offset + 2);

        return [{
            fuelLevel,
            temperature
        }, offset + 3];
    }

    /**
     * Parse refrigeration unit data
     */
    static parseRefUnit(buffer, offset) {
        const dataLength = buffer.readUInt8(offset);
        const data = {
            setPoint: buffer.readInt16LE(offset + 1) / 10,
            returnAirTemp: buffer.readInt16LE(offset + 3) / 10,
            supplyAirTemp: buffer.readInt16LE(offset + 5) / 10,
            engineHours: buffer.readUInt32LE(offset + 7),
            engineState: buffer.readUInt8(offset + 11),
            fuelLevel: buffer.readUInt8(offset + 12),
            alarms: []
        };

        // Parse alarms if present
        if (dataLength > 12) {
            const alarmCount = buffer.readUInt8(offset + 13);
            for (let i = 0; i < alarmCount; i++) {
                data.alarms.push(buffer.readUInt16LE(offset + 14 + (i * 2)));
            }
        }

        return [data, offset + dataLength + 1];
    }

    /**
     * Parse EcoDrive data
     */
    static parseEcoDrive(buffer, offset) {
        return [{
            acceleration: buffer.readUInt8(offset),
            braking: buffer.readUInt8(offset + 1),
            cornering: buffer.readUInt8(offset + 2),
            impact: buffer.readUInt8(offset + 3)
        }, offset + 4];
    }

    /**
     * Parse tire pressure monitoring system data
     */
    static parseTirePressure(buffer, offset) {
        const sensors = [];
        for (let i = 0; i < 34; i++) {
            const data = buffer.readUInt16LE(offset + (i * 2));
            const pressure = data & 0xFF;
            const status = (data >> 8) & 0xFF;

            sensors.push({
                sensorIndex: i,
                pressure: pressure, // PSI
                temperature: this.decodeTireTemp(status & 0x07),
                noConnection: !!(status & 0x08),
                lowBattery: !!(status & 0x10),
                alertType: (status >> 5) & 0x07
            });
        }

        return [sensors, offset + 68];
    }

    /**
     * Decode tire temperature from 3-bit value
     */
    static decodeTireTemp(value) {
        return -40 + (value * 20);
    }

    /**
     * Parse acceleration data
     */
    static parseAcceleration(buffer, offset) {
        const raw = buffer.readUInt32LE(offset);
        return [{
            x: this.decodeAccelAxis((raw & 0x3FF) - 512),
            y: this.decodeAccelAxis(((raw >> 10) & 0x3FF) - 512),
            z: this.decodeAccelAxis(((raw >> 20) & 0x3FF) - 512)
        }, offset + 4];
    }

    /**
     * Decode acceleration axis value
     */
    static decodeAccelAxis(value) {
        return value / 186; // Convert to g
    }

    /**
     * Parse extended tag data
     */
    static parseExtendedTag(buffer, offset) {
        const length = buffer.readUInt16LE(offset);
        const isUsingBitmask = !!(length & 0x8000);
        const actualLength = length & 0x7FFF;
        
        let currentOffset = offset + 2;
        const data = {};

        if (isUsingBitmask) {
            // Parse using bitmask
            const bitmask = buffer.slice(currentOffset, currentOffset + actualLength);
            currentOffset += actualLength;
            
            for (let byte = 0; byte < actualLength; byte++) {
                for (let bit = 0; bit < 8; bit++) {
                    if (bitmask[byte] & (1 << bit)) {
                        const tagId = byte * 8 + bit;
                        const [value, nextOffset] = this.parseExtendedTagValue(buffer, currentOffset, tagId);
                        data[tagId] = value;
                        currentOffset = nextOffset;
                    }
                }
            }
        } else {
            // Parse using tag list
            for (let i = 0; i < actualLength; i++) {
                const tagId = buffer.readUInt16LE(currentOffset);
                currentOffset += 2;
                const [value, nextOffset] = this.parseExtendedTagValue(buffer, currentOffset, tagId);
                data[tagId] = value;
                currentOffset = nextOffset;
            }
        }

        return [data, currentOffset];
    }

    /**
     * Parse extended tag value
     */
    static parseExtendedTagValue(buffer, offset, tagId) {
        // Implementation depends on extended tag definitions
        // This is a basic example
        return [buffer.readUInt32LE(offset), offset + 4];
    }
}