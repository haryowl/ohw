const EventEmitter = require('events');
const logger = require('../utils/logger');
const packetProcessor = require('./packetProcessor');
const config = require('../config');

class PacketQueue extends EventEmitter {
    constructor(options = {}) {
        super();
        this.maxConcurrent = options.maxConcurrent || 5;
        this.maxQueueSize = options.maxQueueSize || 1000;
        this.processingTimeout = options.processingTimeout || 30000; // 30 seconds
        this.queue = [];
        this.processing = false;
        this.activeProcessors = 0;
        this.stats = {
            totalProcessed: 0,
            totalQueued: 0,
            totalDropped: 0,
            averageProcessingTime: 0,
            queueSize: 0
        };
        
        // Start processing
        this.startProcessing();
    }

    /**
     * Add a packet to the processing queue
     */
    async enqueue(packet, socket, processor) {
        try {
            // Check queue size limit
            if (this.queue.length >= this.maxQueueSize) {
                logger.warn(`Packet queue full, dropping packet. Queue size: ${this.queue.length}`);
                this.stats.totalDropped++;
                return false;
            }

            const queueItem = {
                packet,
                socket,
                processor,
                timestamp: Date.now(),
                id: Math.random().toString(36).substr(2, 9)
            };

            this.queue.push(queueItem);
            this.stats.totalQueued++;
            this.stats.queueSize = this.queue.length;

            logger.debug(`Packet queued. Queue size: ${this.queue.length}`);

            // Start processing if not already running
            if (!this.processing) {
                this.startProcessing();
            }

            return true;
        } catch (error) {
            logger.error('Error adding packet to queue:', error);
            return false;
        }
    }

    /**
     * Start the processing loop
     */
    async startProcessing() {
        if (this.processing) {
            return;
        }

        this.processing = true;
        logger.info('Starting packet queue processing');

        while (this.queue.length > 0 && this.activeProcessors < this.maxConcurrent) {
            const item = this.queue.shift();
            this.stats.queueSize = this.queue.length;

            if (item) {
                this.activeProcessors++;
                this.processPacketAsync(item);
            }
        }

        this.processing = false;
        
        // If there are still items in queue, continue processing
        if (this.queue.length > 0) {
            setTimeout(() => this.startProcessing(), 10);
        }
    }

    /**
     * Process a packet asynchronously
     */
    async processPacketAsync(queueItem) {
        const startTime = Date.now();
        
        try {
            logger.debug(`Processing packet ${queueItem.id}`);
            
            // Process the packet
            await queueItem.processor(queueItem.packet, queueItem.socket);
            
            // Update statistics
            const processingTime = Date.now() - startTime;
            this.updateStats(processingTime);
            
            logger.debug(`Packet ${queueItem.id} processed successfully in ${processingTime}ms`);
            
        } catch (error) {
            logger.error(`Error processing packet ${queueItem.id}:`, error);
        } finally {
            this.activeProcessors--;
            
            // Continue processing if there are more items
            if (this.queue.length > 0 && this.activeProcessors < this.maxConcurrent) {
                setTimeout(() => this.startProcessing(), 1);
            }
        }
    }

    /**
     * Update processing statistics
     */
    updateStats(processingTime) {
        this.stats.totalProcessed++;
        
        // Calculate rolling average
        const totalTime = this.stats.averageProcessingTime * (this.stats.totalProcessed - 1) + processingTime;
        this.stats.averageProcessingTime = totalTime / this.stats.totalProcessed;
    }

    /**
     * Get queue statistics
     */
    getStats() {
        return {
            ...this.stats,
            activeProcessors: this.activeProcessors,
            isProcessing: this.processing,
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Clear the queue (for shutdown)
     */
    async clear() {
        logger.info('Clearing packet queue', {
            queueSize: this.queue.length,
            processingCount: this.activeProcessors
        });

        // Wait for current processing to complete
        while (this.activeProcessors > 0) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        this.queue = [];
        this.processing = false;
    }

    /**
     * Pause processing
     */
    pause() {
        this.processing = false;
        logger.info('Packet queue processing paused');
    }

    /**
     * Resume processing
     */
    resume() {
        this.processing = true;
        logger.info('Packet queue processing resumed');
    }

    /**
     * Set queue size limit
     */
    setMaxQueueSize(size) {
        this.maxQueueSize = size;
        logger.info(`Packet queue size limit set to ${size}`);
    }

    /**
     * Set concurrent processing limit
     */
    setMaxConcurrentProcessing(limit) {
        this.maxConcurrent = limit;
        logger.info(`Concurrent processing limit set to ${limit}`);
    }
}

// Create singleton instance
const packetQueue = new PacketQueue({
    maxConcurrent: 10,        // Process up to 10 packets simultaneously
    maxQueueSize: 2000,       // Queue up to 2000 packets
    processingTimeout: 30000  // 30 second timeout per packet
});

module.exports = packetQueue; 