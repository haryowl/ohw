// backend/src/services/tagParser.js
const tagDefinitions = require('./tagDefinitions');
const logger = require('../utils/logger');

class TagParser {
    static parseTag(buffer, offset) {
        const tag = buffer.readUInt8(offset++);
        
        // Always treat 0x00 as a separator, never as a tag
        if (tag === 0) {
            return [null, offset];
        }

        try {
            // Get tag definition from tagDefinitions
            const tagDef = tagDefinitions[`0x${tag.toString(16).padStart(2, '0')}`];
            if (!tagDef) {
                logger.warn(`Unknown tag type: 0x${tag.toString(16)}`);
                return [null, offset];
            }

            let value;
            let bytesRead = 0;

            // Parse the tag value based on its definition
            switch (tagDef.type) {
                case 'uint8':
                    value = buffer.readUInt8(offset);
                    bytesRead = 1;
                    break;

                case 'uint16':
                    value = buffer.readUInt16LE(offset);
                    bytesRead = 2;
                    break;

                case 'uint32':
                    value = buffer.readUInt32LE(offset);
                    bytesRead = 4;
                    break;

                case 'int8':
                    value = buffer.readInt8(offset);
                    bytesRead = 1;
                    break;

                case 'int16':
                    value = buffer.readInt16LE(offset);
                    bytesRead = 2;
                    break;

                case 'int32':
                    value = buffer.readInt32LE(offset);
                    bytesRead = 4;
                    break;

                case 'string':
                    if (tagDef.length) {
                        // Fixed length string (like IMEI)
                        value = buffer.slice(offset, offset + tagDef.length).toString('ascii');
                        bytesRead = tagDef.length;
                    } else {
                        // Variable length string
                        const strLength = buffer.readUInt8(offset);
                        value = buffer.slice(offset + 1, offset + 1 + strLength).toString('ascii');
                        bytesRead = strLength + 1;
                    }
                    break;

                case 'coordinates':
                    const lat = buffer.readInt32LE(offset) / 10000000;
                    const lon = buffer.readInt32LE(offset + 4) / 10000000;
                    const satellites = buffer.readUInt8(offset + 8);
                    value = { latitude: lat, longitude: lon, satellites };
                    bytesRead = 9;
                    break;

                case 'datetime':
                    value = new Date(buffer.readUInt32LE(offset) * 1000);
                    bytesRead = 4;
                    break;

                case 'status':
                    value = buffer.readUInt16LE(offset);
                    bytesRead = 2;
                    break;

                case 'uint32_modbus':
                    value = buffer.readUInt32LE(offset) / 100;
                    bytesRead = 4;
                    break;

                default:
                    logger.warn(`Unsupported tag type: ${tagDef.type}`);
                    return [null, offset];
            }

            return [{
                type: tag,
                value: value,
                definition: tagDef
            }, offset + bytesRead];

        } catch (error) {
            logger.error(`Error parsing tag 0x${tag.toString(16)}:`, error);
            return [null, offset];
        }
    }
}

module.exports = TagParser; 