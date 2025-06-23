const EventEmitter = require('events');
const logger = require('../utils/logger');
const packetProcessor = require('./packetProcessor');

class PacketQueue extends EventEmitter {
    constructor(options = {}) {
        super();
        this.maxConcurrent = options.maxConcurrent || 5;
        this.maxQueueSize = options.maxQueueSize || 1000;
        this.processingTimeout = options.processingTimeout || 30000; // 30 seconds
        this.queue = [];
        this.processing = new Set();
        this.stats = {
            queued: 0,
            processed: 0,
            failed: 0,
            dropped: 0,
            avgProcessingTime: 0
        };
        
        // Start processing
        this.startProcessing();
    }

    /**
     * Add a packet to the processing queue
     */
    async enqueue(packet, socket, metadata = {}) {
        const queueItem = {
            id: Date.now() + Math.random(),
            packet,
            socket,
            metadata,
            timestamp: new Date(),
            retries: 0
        };

        // Check queue size limit
        if (this.queue.length >= this.maxQueueSize) {
            logger.warn('Packet queue full, dropping oldest packet', {
                queueSize: this.queue.length,
                maxSize: this.maxQueueSize,
                droppedPacketId: this.queue[0].id
            });
            this.queue.shift(); // Remove oldest packet
            this.stats.dropped++;
        }

        this.queue.push(queueItem);
        this.stats.queued++;

        logger.debug('Packet queued for processing', {
            packetId: queueItem.id,
            queueSize: this.queue.length,
            processingCount: this.processing.size,
            metadata
        });

        // Emit event for monitoring
        this.emit('queued', queueItem);
    }

    /**
     * Start the processing loop
     */
    startProcessing() {
        const processNext = async () => {
            // Check if we can process more packets
            if (this.processing.size >= this.maxConcurrent || this.queue.length === 0) {
                setTimeout(processNext, 10); // Check again in 10ms
                return;
            }

            const item = this.queue.shift();
            if (!item) {
                setTimeout(processNext, 10);
                return;
            }

            // Add to processing set
            this.processing.add(item.id);
            const startTime = Date.now();

            try {
                logger.debug('Starting packet processing', {
                    packetId: item.id,
                    queueSize: this.queue.length,
                    processingCount: this.processing.size
                });

                // Process the packet with timeout
                await this.processWithTimeout(item);

                const processingTime = Date.now() - startTime;
                this.stats.processed++;
                this.stats.avgProcessingTime = 
                    (this.stats.avgProcessingTime * (this.stats.processed - 1) + processingTime) / this.stats.processed;

                logger.debug('Packet processed successfully', {
                    packetId: item.id,
                    processingTime,
                    avgProcessingTime: this.stats.avgProcessingTime
                });

                this.emit('processed', item, processingTime);

            } catch (error) {
                const processingTime = Date.now() - startTime;
                this.stats.failed++;

                logger.error('Packet processing failed', {
                    packetId: item.id,
                    error: error.message,
                    processingTime,
                    retries: item.retries
                });

                // Retry logic
                if (item.retries < 3) {
                    item.retries++;
                    item.timestamp = new Date();
                    this.queue.unshift(item); // Add back to front of queue
                    logger.info('Retrying packet processing', {
                        packetId: item.id,
                        retries: item.retries
                    });
                } else {
                    logger.error('Packet processing failed after max retries', {
                        packetId: item.id,
                        maxRetries: 3
                    });
                    this.emit('failed', item, error);
                }
            } finally {
                // Remove from processing set
                this.processing.delete(item.id);
            }

            // Process next packet immediately
            setImmediate(processNext);
        };

        // Start the processing loop
        setImmediate(processNext);
    }

    /**
     * Process a packet with timeout
     */
    async processWithTimeout(item) {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Packet processing timeout'));
            }, this.processingTimeout);

            packetProcessor.processPacket(item.packet, item.socket)
                .then((result) => {
                    clearTimeout(timeout);
                    resolve(result);
                })
                .catch((error) => {
                    clearTimeout(timeout);
                    reject(error);
                });
        });
    }

    /**
     * Get queue statistics
     */
    getStats() {
        return {
            ...this.stats,
            queueSize: this.queue.length,
            processingCount: this.processing.size,
            maxConcurrent: this.maxConcurrent,
            maxQueueSize: this.maxQueueSize
        };
    }

    /**
     * Clear the queue (for shutdown)
     */
    async clear() {
        logger.info('Clearing packet queue', {
            queueSize: this.queue.length,
            processingCount: this.processing.size
        });

        // Wait for current processing to complete
        while (this.processing.size > 0) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        this.queue = [];
        this.processing.clear();
    }

    /**
     * Pause processing
     */
    pause() {
        this.paused = true;
        logger.info('Packet queue processing paused');
    }

    /**
     * Resume processing
     */
    resume() {
        this.paused = false;
        logger.info('Packet queue processing resumed');
    }
}

// Create singleton instance
const packetQueue = new PacketQueue({
    maxConcurrent: 10,        // Process up to 10 packets simultaneously
    maxQueueSize: 2000,       // Queue up to 2000 packets
    processingTimeout: 30000  // 30 second timeout per packet
});

module.exports = packetQueue; 