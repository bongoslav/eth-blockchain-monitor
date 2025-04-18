'use strict';

import { WebSocketProvider } from 'ethers';
import logger from '../config/winston.js';

class EthereumService {
    constructor({
        ethereumWssUrl,
        configsService,
        Transaction,
        batchSize,
        flushIntervalMs,
        maxRetries,
        maxWSSRetries
    }) {
        if (!ethereumWssUrl || !configsService || !Transaction) {
            throw new Error('EthereumService requires ethereumWssUrl, configsService, and Transaction dependencies.');
        }
        this.providerUrl = ethereumWssUrl;
        this.configsService = configsService;
        this.Transaction = Transaction;
        this.activeConfig = null;
        this.activeConfigNeedsUpdate = true; // flag to signal config refresh needed. initially get current active config
        this.provider = null;

        // Transaction buffer configuration
        this.transactionBuffer = [];
        this.batchSize = batchSize;
        this.flushIntervalMs = flushIntervalMs;
        this.maxRetries = maxRetries;
        this.flushTimer = null;

        // WSS connection configuration
        this.maxWSSRetries = maxWSSRetries;
        this.isShuttingDown = false;
        
        // Block processing queue
        this.blockQueue = [];
        this.isProcessingBlock = false;
    }

    /**
     * Initializes the Ethereum service. Connects to WS url, gets active config, and starts periodic flush.
     * @return {Promise<void>}
     */
    async initialize() {
        if (this.provider) {
            this.provider.removeAllListeners();
            try {
                await this.provider.destroy();
            } catch (e) {
                logger.warn(`Error destroying old provider: ${e.message}`);
            }
        }

        let retryCount = 0;
        logger.debug('Initializing EthereumService...');
        this.provider = new WebSocketProvider(this.providerUrl);

        this.provider.on('error', async (error) => {
            logger.error(`WebSocket Provider Error: ${error.message}\n${error.stack || ''}`);

            if (this.isShuttingDown) return; // don't reconnect if shutting down

            logger.debug('Attempting to reconnect...');

            retryCount++;

            logger.warn(`Retrying connection (attempt ${retryCount}/${this.maxWSSRetries})`);

            await new Promise(resolve => setTimeout(resolve, 100 * Math.pow(2, retryCount)));

            if (retryCount >= this.maxWSSRetries) {
                await this.shutdown();
                logger.error('Failed to reconnect after maximum attempts. Exiting...');
                process.exit(1);
            }

            await this.initialize();
        });

        this.activeConfig = await this.configsService.getActiveConfig();
        if (!this.activeConfig) {
            logger.debug('EthereumService initialized. No active configuration set.');
        } else {
            logger.debug(`EthereumService initialized. Active configuration set to '${this.activeConfig.name}' (ID: ${this.activeConfig.id}).`);
        }
        this.activeConfigNeedsUpdate = false; // Initial config loaded

        this.#startPeriodicFlush();
    }

    /**
     * Starts monitoring for new blocks from the Ethereum provider
     * @return {Promise<void>}
     */
    async startMonitoring() {
        if (!this.provider) {
            logger.warn('Provider not initialized. Initializing...');
            await this.initialize();
        }

        logger.debug('Starting Ethereum block monitoring...');
        this.provider.on('block', this.#handleNewBlock);

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
     * Starts a timer that periodically flushes the transaction buffer
     * @return {Promise<void>}
     * @private
     */
    async #startPeriodicFlush() {
        if (this.flushTimer) {
            clearInterval(this.flushTimer);
        }

        this.flushTimer = setInterval(async () => {
            if (this.transactionBuffer.length > 0) {
                logger.debug(`Periodic flush: Processing ${this.transactionBuffer.length} buffered transactions...`);
                await this.#flushTransactionBuffer();
            }
        }, this.flushIntervalMs);
    }

    /**
     * Handles new blocks from the Ethereum provider. Adds to queue and processes sequentially.
     * @param {number} blockNumber - The number of the new block
     * @return {void}
     * @private
     */
    #handleNewBlock = (blockNumber) => {
        this.blockQueue.push(blockNumber);
        logger.debug(`New block received: ${blockNumber}. Added to queue. Queue size: ${this.blockQueue.length}`);
        this.#processNextBlockInQueue();
    }

    /**
     * Processes the next block in the queue if not already processing a block
     * @return {Promise<void>}
     * @private
     */
    #processNextBlockInQueue = async () => {
        if (this.isProcessingBlock || this.blockQueue.length === 0) {
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
     * @private
     */
    async #processBlock(blockNumber) {
        try {
            if (this.activeConfigNeedsUpdate) {
                const newActiveConfig = await this.configsService.getActiveConfig();

                this.activeConfig = newActiveConfig;
                this.activeConfigNeedsUpdate = false;

                logger.debug(`Active config set to ${newActiveConfig.id}.`);
            }

            if (!this.activeConfig) {
                logger.debug('No active configuration set. Skipping block processing.');
                return;
            }

            const block = await this.provider.getBlock(blockNumber, true);
            if (!block || !block.transactions) {
                logger.warn(`Block ${blockNumber} not found or has no transactions.`);
                return;
            }

            const transactionHashes = block.transactions;
            logger.debug(`Block ${blockNumber} contains ${transactionHashes.length} transaction hashes. Filtering with active config ID: ${this.activeConfig.id}`);

            let matchCount = 0;
            for (const txHash of transactionHashes) {
                const fullTx = await this.provider.getTransaction(txHash);

                if (fullTx && this.#matchesActiveConfig(fullTx, this.activeConfig)) {
                    await this.#bufferTransaction(fullTx, this.activeConfig);
                    matchCount++;

                    if (this.transactionBuffer.length >= this.batchSize) {
                        await this.#flushTransactionBuffer();
                    }
                }
            }

            if (matchCount > 0) {
                logger.debug(`Found and buffered ${matchCount} matching transactions in block ${blockNumber}.`);
            }

            // ensuring any remaining transactions from this block are flushed
            if (this.transactionBuffer.length > 0) {
                await this.#flushTransactionBuffer();
            }

        } catch (err) {
            logger.error(`Error processing block ${blockNumber}: ${err.message}\n${err.stack || ''}`);
        }
    }

    /**
     * Checks if a transaction matches the active configuration
     * @param {Object} tx - The transaction object
     * @param {Object} activeConfig - The active configuration object
     * @return {boolean}
     * @private
     */
    #matchesActiveConfig(tx, activeConfig) {
        if (!activeConfig || !tx) {
            logger.debug('Match fail: No active config or tx provided.');
            return false;
        }

        const validationRules = this.#createValidationRules(tx, activeConfig);

        for (const rule of validationRules) {
            if (rule.condition()) {
                return false;
            }
        }

        return true;
    }

    /**
     * Adds a transaction to the buffer for batch processing
     * @param {Object} tx - The transaction object
     * @param {Object} activeConfig - The active configuration object
     * @return {Promise<void>}
     * @private
     */
    async #bufferTransaction(tx, activeConfig) {
        try {
            if (!tx.hash || !tx.from || tx.blockNumber === null || tx.value === null) {
                logger.warn(`Transaction ${tx.hash || 'UNKNOWN HASH'} missing essential data. Skipping.`);
                return;
            }

            const transactionData = {
                hash: tx.hash,
                fromAddress: tx.from,
                toAddress: tx.to,
                value: tx.value.toString(),
                blockNumber: tx.blockNumber,
                index: tx.index,
                type: tx.type,
                configId: activeConfig.id,
            };

            // Check if already in buffer (avoid duplicates)
            const isDuplicate = this.transactionBuffer.some(item => item.hash === tx.hash);
            if (!isDuplicate) {
                this.transactionBuffer.push(transactionData);
                logger.debug(`Added transaction ${tx.hash} to buffer. Buffer size: ${this.transactionBuffer.length}`);
            }
        } catch (error) {
            logger.error(`Error buffering transaction ${tx.hash}: ${error.message}\n${error.stack || ''}`);
        }
    }

    /**
     * Flushes the transaction buffer to the database with retry logic
     * @return {Promise<void>}
     * @private
     */
    async #flushTransactionBuffer() {
        if (this.transactionBuffer.length === 0) return;

        logger.debug(`Flushing transaction buffer with ${this.transactionBuffer.length} transactions`);
        const transactionsToSave = [...this.transactionBuffer];
        this.transactionBuffer = []; // clear buffer immediately to avoid double processing

        let savedCount = 0;
        let failedTransactions = [];

        for (const txData of transactionsToSave) {
            let retryCount = 0;
            let saved = false;

            while (!saved && retryCount < this.maxRetries) {
                try {
                    const existingTx = await this.Transaction.findByPk(txData.hash);
                    if (existingTx) {
                        logger.debug(`Transaction ${txData.hash} already exists in the database. Skipping.`);
                        saved = true;
                        continue;
                    }

                    const savedTx = await this.Transaction.create(txData);
                    logger.debug(`Saved transaction ${savedTx.hash} for Config ID ${savedTx.configId} to database.`);
                    saved = true;
                    savedCount++;
                } catch (error) {
                    retryCount++;
                    if (retryCount >= this.maxRetries) {
                        logger.error(`Failed to save transaction ${txData.hash} after ${this.maxRetries} attempts: ${error.message}\n${error.stack || ''}`);
                        failedTransactions.push(txData);
                    } else {
                        logger.warn(`Retry ${retryCount}/${this.maxRetries} for transaction ${txData.hash}`);
                        await new Promise(resolve => setTimeout(resolve, 100 * Math.pow(2, retryCount)));
                    }
                }
            }
        }

        if (failedTransactions.length > 0) {
            logger.warn(`${failedTransactions.length} transactions failed to save after ${this.maxRetries} retries.`);
            // failed txs can be re-added to buffer for next attempt if we want
            // this.transactionBuffer.push(...failedTransactions);
        }

        logger.debug(`Flush complete. Saved: ${savedCount}, Failed: ${failedTransactions.length}`);
    }

    /**
     * Factory method to create validation rules for a transaction against an active configuration
     * Currently I don't log the messages, because it's a lot of noise.
     * @param {Object} tx - The transaction object
     * @param {Object} activeConfig - The active configuration object
     * @return {Array<{condition: () => boolean, message: () => string}>}
     * @private
     */
    #createValidationRules(tx, activeConfig) {
        return [
            {
                condition: () => activeConfig.fromAddress && (!tx.from?.toLowerCase() || tx.from?.toLowerCase() !== activeConfig.fromAddress?.toLowerCase()),
                message: () => `Match fail: fromAddress mismatch (tx: ${tx.from?.toLowerCase()}, config: ${activeConfig.fromAddress?.toLowerCase()})`
            },
            {
                condition: () => activeConfig.toAddress && (!tx.to?.toLowerCase() || tx.to?.toLowerCase() !== activeConfig.toAddress?.toLowerCase()),
                message: () => `Match fail: toAddress mismatch (tx: ${tx.to?.toLowerCase()}, config: ${activeConfig.toAddress?.toLowerCase()})`
            },
            {
                condition: () => {
                    if (!(activeConfig.minValue || activeConfig.maxValue)) return false;

                    try {
                        const txValueBigInt = BigInt(tx.value);
                        const configMinBigInt = activeConfig.minValue ? BigInt(activeConfig.minValue) : null;
                        const configMaxBigInt = activeConfig.maxValue ? BigInt(activeConfig.maxValue) : null;

                        return (configMinBigInt !== null && txValueBigInt < configMinBigInt) ||
                            (configMaxBigInt !== null && txValueBigInt > configMaxBigInt);
                    } catch (e) {
                        logger.error(`Error comparing transaction value ${tx.value} with config range [${activeConfig.minValue}, ${activeConfig.maxValue}]: ${e.message}\n${e.stack || ''}`);
                        return true;
                    }
                },
                message: () => `Match fail: value mismatch (tx: ${tx.value}, config: ${activeConfig.minValue} - ${activeConfig.maxValue})`
            },
            {
                condition: () => activeConfig.hash && tx.hash !== activeConfig.hash,
                message: () => `Match fail: hash mismatch (tx: ${tx.hash}, config: ${activeConfig.hash})`
            },
            {
                condition: () => (activeConfig.minBlockNumber && tx.blockNumber < activeConfig.minBlockNumber) ||
                    (activeConfig.maxBlockNumber && tx.blockNumber > activeConfig.maxBlockNumber),
                message: () => `Match fail: blockNumber mismatch (tx: ${tx.blockNumber}, config: ${activeConfig.minBlockNumber} - ${activeConfig.maxBlockNumber})`
            },
            {
                condition: () => (activeConfig.minIndex && tx.index < activeConfig.minIndex) ||
                    (activeConfig.maxIndex && tx.index > activeConfig.maxIndex),
                message: () => `Match fail: index mismatch (tx: ${tx.index}, config: ${activeConfig.minIndex} - ${activeConfig.maxIndex})`
            },
            {
                condition: () => activeConfig.type && tx.type !== activeConfig.type,
                message: () => `Match fail: type mismatch (tx: ${tx.type}, config: ${activeConfig.type})`
            }
        ];
    }

    /**
     * Shuts down the Ethereum service. Closes the provider, flushes the transaction buffer, and disconnects.
     * @return {Promise<void>}
     */
    async shutdown() {
        logger.debug('Shutting down Ethereum Service...');
        this.isShuttingDown = true;

        if (this.flushTimer) {
            clearInterval(this.flushTimer);
            this.flushTimer = null;
        }

        if (this.transactionBuffer.length > 0) {
            logger.debug(`Flushing ${this.transactionBuffer.length} remaining transactions before shutdown.`);
            await this.#flushTransactionBuffer();
        }

        if (this.provider) {
            logger.debug('Disconnecting from Ethereum provider.');
            this.provider.removeAllListeners();
            await this.provider.destroy();
            this.provider = null;
        }

        logger.debug('EthereumService shutdown complete.');
    }
}

export default EthereumService;
