'use strict';

import logger from '../config/winston.js';

class BlockProcessorService {
    constructor({ transactionProcessor, configsService, blockLoopIntervalMs }) {
        if (!transactionProcessor || !configsService) {
            throw new Error('BlockProcessorService missing required dependencies.');
        }
        
        this.transactionProcessor = transactionProcessor;
        this.configsService = configsService;
        
        // Block processing queue
        this.blockQueue = [];
        this.isProcessingBlock = false;
        this.isShuttingDown = false;
        this.blockLoopIntervalMs = blockLoopIntervalMs;
        
        // Active configuration
        this.activeConfig = null;
        this.activeConfigNeedsUpdate = true;
    }

    /**
     * Initializes the block processor
     * @return {Promise<void>}
     */
    async initialize() {
        this.activeConfig = await this.configsService.getActiveConfig();
        if (!this.activeConfig) {
            logger.debug('BlockProcessorService initialized. No active configuration set.');
        } else {
            logger.debug(`BlockProcessorService initialized. Active configuration set to '${this.activeConfig.name}' (ID: ${this.activeConfig.id}).`);
        }
        this.activeConfigNeedsUpdate = false;
    }

    /**
     * Sets the provider for the block processor. Coming from EthereumMonitorService.
     * @param {Object} provider - The provider to set
     * @return {void}
     */
    setProvider(provider) {
        this.provider = provider;
    }

    /**
     * Starts monitoring for new blocks from the Ethereum provider
     * @return {Promise<void>}
     */
    async startMonitoring() {
        this.provider.on('block', (blockNumber) => this.blockQueue.push(blockNumber));
        logger.debug('Provider is ready and listening for blocks.');
    }

    /**
     * "Notifies" the service that the active configuration may have changed.
     * @return {void}
     */
    notifyActiveConfigChanged() {
        logger.debug('Active config UPDATED. Next block will use new config.');
        this.activeConfigNeedsUpdate = true;
    }

    /**
     * Starts the block processing loop using non-blocking intervals
     * @return {void}
     */
    startBlockLoop() {
        logger.debug('Starting block processing loop');
        this.blockLoopInterval = setInterval(async () => {
            if (this.blockQueue.length > 0 && !this.isProcessingBlock && !this.isShuttingDown) {
                await this.#processNextBlockInQueue();
            }
        }, this.blockLoopIntervalMs);
    }

    /**
     * Processes the next block in the queue if not already processing a block
     * @return {Promise<void>}
     */
    #processNextBlockInQueue = async () => {
        if (this.isProcessingBlock || this.blockQueue.length === 0 || this.isShuttingDown) {
            return;
        }

        this.isProcessingBlock = true;
        const blockNumber = this.blockQueue.shift();

        try {
            logger.debug(`Processing block ${blockNumber} from queue. Remaining in queue: ${this.blockQueue.length}`);
            await this.#processBlock(blockNumber);
        } catch (error) {
            logger.error(`Error processing block ${blockNumber} from queue: ${error.message}\n${error.stack || ''}`);
        } finally {
            // don't stop processing blocks
            this.isProcessingBlock = false;
            if (this.blockQueue.length > 0) {
                await this.#processNextBlockInQueue();
            }
        }
    }

    /**
     * Processes a single block and its transactions
     * @param {number} blockNumber - The number of the block to process
     * @return {Promise<void>}
     */
    async #processBlock(blockNumber) {
        try {
            if (this.isShuttingDown) {
                logger.warn(`Skipping processing of block ${blockNumber}. Service is shutting down.`);
                return;
            }
            
            if (this.activeConfigNeedsUpdate) {
                const newActiveConfig = await this.configsService.getActiveConfig();
                this.activeConfig = newActiveConfig;
                this.activeConfigNeedsUpdate = false;
                logger.debug(`Active config set to: ID(${newActiveConfig?.id}), Name (${newActiveConfig?.name}).`);
            }

            if (!this.activeConfig) {
                logger.debug('No active configuration set. Skipping block processing.');
                return;
            }

            // Process any pending transactions for this block
            await this.transactionProcessor.processPendingTransactions(blockNumber);

            const block = await this.provider.getBlock(blockNumber, true);
            if (!block || !block.transactions) {
                logger.warn(`Block ${blockNumber} not found or has no transactions.`);
                return;
            }

            const transactionHashes = block.transactions;
            logger.debug(`Block ${blockNumber} contains ${transactionHashes.length} transactions. ` +
                `Filtering with active config: ID (${this.activeConfig?.id}), Name (${this.activeConfig?.name})...`
            );

            let matchCount = 0;
            for (const txHash of transactionHashes) {
                const fullTx = await this.provider.getTransaction(txHash);
                
                if (fullTx && this.transactionProcessor.matchesActiveConfig(fullTx, this.activeConfig)) {
                    await this.transactionProcessor.bufferTransaction(fullTx, this.activeConfig);
                    matchCount++;

                    if (this.transactionProcessor.shouldFlushBuffer()) {
                        await this.transactionProcessor.flushTransactionBuffer();
                    }
                }
            }

            if (matchCount > 0) {
                logger.debug(`Found and buffered ${matchCount} matching transactions in block ${blockNumber}.`);
            }

            // Ensuring any remaining transactions from this block are flushed
            if (this.transactionProcessor.hasTransactionsInBuffer()) {
                await this.transactionProcessor.flushTransactionBuffer();
            }

        } catch (err) {
            logger.error(`Error processing block ${blockNumber}: ${err.message}\n${err.stack || ''}`);
        }
    }

    /**
     * Clears the block queue on shutdown
     * @return {void}
     */
    shutdown() {
        logger.debug('Shutting down BlockProcessorService...');
        this.isShuttingDown = true;
        this.blockQueue = []; // clear block queue to prevent further processing
        
        if (this.blockLoopInterval) {
            clearInterval(this.blockLoopInterval);
            this.blockLoopInterval = null;
        }
    }
}

export default BlockProcessorService; 