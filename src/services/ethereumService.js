'use strict';

import { WebSocketProvider } from 'ethers';

class EthereumService {
    constructor({
        ethereumWssUrl,
        configsService,
        Transaction,
        batchSize,
        flushIntervalMs,
        maxRetries
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
    }

    /**
     * Initializes the Ethereum service. Connects to WS url, gets active config, and starts periodic flush.
     * @return {Promise<void>}
     */
    async initialize() {
        console.log('Initializing EthereumService...');
        this.provider = new WebSocketProvider(this.providerUrl);

        this.provider.on('error', async (error) => {
            console.error('WebSocket Provider Error:', error.message);
            await this.provider.destroy();
            this.provider = null;
        });

        this.activeConfig = await this.configsService.getActiveConfig();
        if (!this.activeConfig) {
            console.log('EthereumService initialized. No active configuration set.');
        } else {
            console.log(`EthereumService initialized. Active configuration set to '${this.activeConfig.name}' (ID: ${this.activeConfig.id}).`);
        }
        this.activeConfigNeedsUpdate = false; // Initial config loaded

        this.#startPeriodicFlush();
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
                console.log(`Periodic flush: Processing ${this.transactionBuffer.length} buffered transactions...`);
                await this.#flushTransactionBuffer();
            }
        }, this.flushIntervalMs);
    }

    /**
     * Starts monitoring for new blocks from the Ethereum provider
     * @return {Promise<void>}
     */
    async startMonitoring() {
        if (!this.provider) {
            console.warn('Provider not initialized. Initializing...');
            await this.initialize();
        }

        console.log('Starting Ethereum block monitoring...');
        this.provider.on('block', this.#handleBlock);

        console.log('Provider is ready and listening for blocks.');
    }

    /**
     * "Notifies" the service that the active configuration may have changed.
     * @return {void}
     */
    notifyActiveConfigChanged() {
        console.log('Received notification: Active config may have changed. Flag set for next block.');
        this.activeConfigNeedsUpdate = true;
    }

    /**
     * Handles block processing from the Ethereum provider. Triggered on block event.
     * @param {number} blockNumber - The number of the new block
     * @return {Promise<void>}
     * @private
     */
    #handleBlock = async (blockNumber) => {
        console.log(`\nNew block received: ${blockNumber}`);
        try {
            if (this.activeConfigNeedsUpdate) {
                const newActiveConfig = await this.configsService.getActiveConfig();

                this.activeConfig = newActiveConfig;
                this.activeConfigNeedsUpdate = false;

                console.log(`Active config set to ${newActiveConfig.id}.`);
            }

            if (!this.activeConfig) {
                console.log('No active configuration set. Skipping block processing.');
                return;
            }

            const block = await this.provider.getBlock(blockNumber, true);
            if (!block || !block.transactions) {
                console.warn(`Block ${blockNumber} not found or has no transactions.`);
                return;
            }

            const transactionHashes = block.transactions;
            console.log(`Block ${blockNumber} contains ${transactionHashes.length} transaction hashes. Filtering with active config ID: ${this.activeConfig.id}`);

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
                console.log(`Found and buffered ${matchCount} matching transactions in block ${blockNumber}.`);
            }
            
            // ensuring any remaining transactions from this block are flushed
            if (this.transactionBuffer.length > 0) {
                await this.#flushTransactionBuffer();
            }

        } catch (err) {
            console.error(`Error processing block ${blockNumber}:`, err.message, err.stack);
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
            console.log('Match fail: No active config or tx provided.');
            return false;
        }

        const validationRules = this.#createValidationRules(tx, activeConfig);

        for (const rule of validationRules) {
            if (rule.condition()) {
                // console.log(rule.message());
                return false;
            }
        }

        // console.log(`Transaction ${tx.hash} MATCHED config ID ${activeConfig.id}`);
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
                console.warn(`Transaction ${tx.hash || 'UNKNOWN HASH'} missing essential data. Skipping.`);
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
                console.log(`Added transaction ${tx.hash} to buffer. Buffer size: ${this.transactionBuffer.length}`);
            }
        } catch (error) {
            console.error(`Error buffering transaction ${tx.hash}:`, error);
        }
    }

    /**
     * Flushes the transaction buffer to the database with retry logic
     * @return {Promise<void>}
     * @private
     */
    async #flushTransactionBuffer() {
        if (this.transactionBuffer.length === 0) return;

        console.log(`Flushing transaction buffer with ${this.transactionBuffer.length} transactions`);
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
                        console.log(`Transaction ${txData.hash} already exists in the database. Skipping.`);
                        saved = true;
                        continue;
                    }

                    const savedTx = await this.Transaction.create(txData);
                    console.log(`Saved transaction ${savedTx.hash} for Config ID ${savedTx.configId} to database.`);
                    saved = true;
                    savedCount++;
                } catch (error) {
                    retryCount++;
                    if (retryCount >= this.maxRetries) {
                        console.error(`Failed to save transaction ${txData.hash} after ${this.maxRetries} attempts:`, error);
                        failedTransactions.push(txData);
                    } else {
                        console.warn(`Retry ${retryCount}/${this.maxRetries} for transaction ${txData.hash}`);
                        // Exponential backoff
                        await new Promise(resolve => setTimeout(resolve, 100 * Math.pow(2, retryCount)));
                    }
                }
            }
        }

        if (failedTransactions.length > 0) {
            console.warn(`${failedTransactions.length} transactions failed to save after retries.`);
            // ? re-adding failed txs to buffer for next attempt ?
            // this.transactionBuffer.push(...failedTransactions);
        }

        console.log(`Flush complete. Saved: ${savedCount}, Failed: ${failedTransactions.length}`);
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
                        console.error(`Error comparing transaction value ${tx.value} with config range [${activeConfig.minValue}, ${activeConfig.maxValue}]:`, e);
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
        console.log('Shutting down Ethereum Service...');

        if (this.flushTimer) {
            clearInterval(this.flushTimer);
            this.flushTimer = null;
        }

        if (this.transactionBuffer.length > 0) {
            console.log(`Flushing ${this.transactionBuffer.length} remaining transactions before shutdown.`);
            await this.#flushTransactionBuffer();
        }

        if (this.provider) {
            console.log('Disconnecting from Ethereum provider.');
            this.provider.removeAllListeners();
            await this.provider.destroy();
            this.provider = null;
        }

        console.log('EthereumService shutdown complete.');
    }
}

export default EthereumService;
