const logger = require('../utils/logger');

class PacketTypeHandler {
    static determinePacketType(packetType) {
        // Packet type determination based on first byte
        if (packetType === 0x01) {
            return 'Main Packet';
        } else if (packetType === 0x15) {
            return 'Ignorable Packet';
        } else {
            return 'Extension';
        }
    }

    static isMainPacket(packetType) {
        return packetType === 0x01;
    }

    static isIgnorablePacket(packetType) {
        return packetType === 0x15;
    }

    static isExtensionPacket(packetType) {
        return !this.isMainPacket(packetType) && !this.isIgnorablePacket(packetType);
    }
}

module.exports = PacketTypeHandler; 