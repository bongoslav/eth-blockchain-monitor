'use strict';

import logger from '../config/winston.js';

class TransactionProcessorService {
    constructor({ Transaction, batchSize, flushIntervalMs, maxRetries }) {
        if (!Transaction || !batchSize || !flushIntervalMs || !maxRetries) {
            throw new Error('TransactionProcessorService missing required dependencies.');
        }
        
        this.Transaction = Transaction;
        
        // Transaction buffer configuration
        this.transactionBuffer = new Set();
        this.batchSize = batchSize;
        this.flushIntervalMs = flushIntervalMs;
        this.maxRetries = maxRetries;
        this.flushTimer = null;

        // Delayed transactions
        this.pendingBlockQueue = new Map();
    }

    /**
     * Start the periodic flush timer
     * @return {void}
     */
    startPeriodicFlush() {
        if (this.flushTimer) {
            clearInterval(this.flushTimer);
        }

        this.flushTimer = setInterval(async () => {
            if (this.transactionBuffer.size > 0) {
                logger.debug(`Periodic flush: Processing ${this.transactionBuffer.size} buffered transactions...`);
                await this.flushTransactionBuffer();
            }
        }, this.flushIntervalMs);
    }

    /**
     * Process pending transactions for a specific block
     * @param {number} blockNumber - The block number to process pending transactions for
     * @return {Promise<void>}
     */
    async processPendingTransactions(blockNumber) {
        if (this.pendingBlockQueue.has(blockNumber)) {
            const transactions = this.pendingBlockQueue.get(blockNumber);
            logger.debug(`Found ${transactions.length} delayed transactions for block ${blockNumber}. Adding to buffer.`);

            for (const tx of transactions) {
                this.transactionBuffer.add(tx.transactionData);
            }
            this.pendingBlockQueue.delete(blockNumber);
        }
    }

    /**
     * Checks if a transaction matches the active configuration
     * @param {Object} tx - The transaction object
     * @param {Object} activeConfig - The active configuration object
     * @return {boolean}
     */
    matchesActiveConfig(tx, activeConfig) {
        if (!activeConfig || !tx) {
            logger.debug('Match fail: No active config or tx provided.');
            return false;
        }

        const validationRules = this.#createValidationRules(tx, activeConfig);

        for (const rule of validationRules) {
            if (rule.condition()) {
                return false; // don't log the messages because it's too much noise
            }
        }

        return true;
    }

    /**
     * Check if the buffer should be flushed based on size
     * @return {boolean}
     */
    shouldFlushBuffer() {
        return this.transactionBuffer.size >= this.batchSize;
    }

    /**
     * Check if there are transactions in the buffer
     * @return {boolean}
     */
    hasTransactionsInBuffer() {
        return this.transactionBuffer.size > 0;
    }

    /**
     * Adds a transaction to the buffer for batch processing
     * @param {Object} tx - The transaction object
     * @param {Object} activeConfig - The active configuration object
     * @return {Promise<void>}
     */
    async bufferTransaction(tx, activeConfig) {
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

            if (activeConfig.blockDelay) {
                const targetBlock = tx.blockNumber + activeConfig.blockDelay;

                if (!this.pendingBlockQueue.has(targetBlock)) {
                    this.pendingBlockQueue.set(targetBlock, []);
                }

                this.pendingBlockQueue.get(targetBlock).push({
                    transactionData,
                    configId: activeConfig.id
                });
            } else {
                const isDuplicate = this.transactionBuffer.has(transactionData);
                if (!isDuplicate) {
                    this.transactionBuffer.add(transactionData);
                    logger.debug(`Added transaction ${tx.hash} to buffer. Buffer size: ${this.transactionBuffer.size}`);
                }
            }
        } catch (error) {
            logger.error(`Error buffering transaction ${tx.hash}: ${error.message}\n${error.stack || ''}`);
        }
    }

    /**
     * Flushes the transaction buffer to the database with retry logic
     * @return {Promise<void>}
     */
    async flushTransactionBuffer() {
        if (this.transactionBuffer.size === 0) return;

        logger.debug(`Flushing transaction buffer with ${this.transactionBuffer.size} transactions`);
        const transactionsToSave = [...this.transactionBuffer];
        this.transactionBuffer.clear(); // clear buffer immediately to avoid double processing

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
        }

        logger.debug(`Flush complete. Saved: ${savedCount}, Failed: ${failedTransactions.length}`);
    }

    /**
     * Factory method to create validation rules for a transaction against an active configuration
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
     * Clean up resources and flush remaining transactions
     * @return {Promise<void>}
     */
    async shutdown() {
        logger.debug('Shutting down TransactionProcessorService...');
        
        if (this.flushTimer) {
            clearInterval(this.flushTimer);
            this.flushTimer = null;
        }

        if (this.transactionBuffer.size > 0) {
            logger.debug(`Flushing ${this.transactionBuffer.size} remaining transactions before shutdown.`);
            await this.flushTransactionBuffer();
        }
    }
}

export default TransactionProcessorService; 
