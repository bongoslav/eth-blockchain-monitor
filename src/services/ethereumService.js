'use strict';

import { WebSocketProvider } from 'ethers';

// TODO: improve error handling and logging, lint at the end.

class EthereumService {
    constructor({ ethereumWssUrl, transactionFilterConfig }) {
        this.providerUrl = ethereumWssUrl;
        this.filterConfig = transactionFilterConfig || {};
        this.provider = null;
    }

    async initialize() {
        if (!this.providerUrl) {
            throw new Error('Ethereum provider URL not configured. Inject ethereumWssUrl into the container.');
        }

        this.provider = new WebSocketProvider(this.providerUrl);

        this.provider.on('error', (error) => {
            console.error('WebSocket Provider Error:', error);
            this.#reconnect();
        });

        return this.provider;
    }

    async startMonitoring() {
        if (!this.provider) {
            await this.initialize();
        }

        console.log('Starting Ethereum block monitoring with filters:', this.filterConfig);
        this.provider.on('block', async (blockNumber) => {
            console.log(`\nNew block received: ${blockNumber}`);
            try {
                const block = await this.provider.getBlock(blockNumber, true);
                if (!block || !block.transactions) {
                    console.warn(`Block ${blockNumber} not found or has no transactions.`);
                    return;
                }

                const transactions = block.transactions;
                const fullTxs = await Promise.all(transactions.map(txHash => this.provider.getTransaction(txHash)));

                const filteredTxs = fullTxs.filter(tx => this.#shouldProcessTransaction(tx));

                console.log(`Found ${filteredTxs.length} matching transactions out of ${transactions.length} total in block ${blockNumber}`);

                const transactionPromises = filteredTxs.map(tx => this.#processTransaction(tx));
                await Promise.all(transactionPromises);

                console.log(`Finished processing filtered transactions for block ${blockNumber}.`);
            } catch (err) {
                console.error(`Error processing block ${blockNumber}:`, err);
            }
        });
    }

    async #reconnect() {
        // TODO: counter for attempts
        console.log('Attempting to reconnect to Ethereum node...');
        await new Promise(resolve => setTimeout(resolve, 5000));
        try {
            await this.initialize();
        } catch (error) {
            console.error('Failed to reconnect:', error);
        }
    }

    #shouldProcessTransaction(tx) {
        // no filters defined, process all transactions
        if (!this.filterConfig) {
            return true;
        }
        // TODO: Implement transaction filtering logic depending on config
    }

    async #processTransaction(tx) {
        try {
            console.log(`Processing transaction: ${tx.hash}`);

            // TODO: store in database

        } catch (error) {
            console.error(`Error processing transaction ${tx.hash}:`, error);
        }
    }
}

export default EthereumService;
