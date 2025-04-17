'use strict';

import { WebSocketProvider, parseUnits, formatUnits } from 'ethers';

class EthereumService {
    constructor({ ethereumWssUrl, configsService }) {
        if (!ethereumWssUrl || !configsService) {
            throw new Error('EthereumService requires ethereumWssUrl and configsService dependencies.');
        }
        this.providerUrl = ethereumWssUrl;
        this.configsService = configsService;
        this.activeConfig = null;
        this.provider = null;
    }

    async initialize() {
        console.log('Initializing EthereumService...');
        this.provider = new WebSocketProvider(this.providerUrl);

        this.provider.on('error', async (error) => {
            console.error('WebSocket Provider Error:', error.message);
            await this.provider.destroy();
        });

        // Note: No configuration loaded here. Must be set via setActiveConfigById.
        console.log('EthereumService initialized. Waiting for active configuration to be set.');
    }

    async setActiveConfigById(configId) {
        if (configId === null) {
            this.activeConfig = null;
            console.log('Transaction filtering disabled. No active configuration.');
            return true;
        }

        console.log(`Attempting to set active configuration to ID: ${configId}...`);
        try {
            const config = await this.configsService.getConfiguration(configId);
            if (config) {
                this.activeConfig = config;
                console.log(`Successfully set active configuration to '${config.name}' (ID: ${config.id}). Rules:`, config.rules);
                return true;
            } else {
                console.warn(`Configuration with ID ${configId} not found. Active configuration unchanged.`);
                return false;
            }
        } catch (error) {
            console.error(`Failed to set active configuration ID ${configId}:`, error);
            return false;
        }
    }

    async startMonitoring() {
        if (!this.provider) {
            console.warn('Provider not initialized. Call initialize() first.');
            await this.initialize();
        }

        console.log('Starting Ethereum block monitoring...');
        this.provider.on('block', this.#handleBlock);

        console.log('Provider is ready and listening for blocks.');
    }

    #handleBlock = async (blockNumber) => {
        console.log(`\nNew block received: ${blockNumber}`);
        try {
            const block = await this.provider.getBlock(blockNumber, true); // Fetch block with transactions
            if (!block || !block.prefetchedTransactions) {
                console.warn(`Block ${blockNumber} not found or has no prefetched transactions.`);
                return;
            }

            if (!this.activeConfig) {
                return; // Don't process if no config is active
            }

            const transactions = block.prefetchedTransactions;
            console.log(`Block ${blockNumber} contains ${transactions.length} transactions. Filtering with config ID: ${this.activeConfig.id}`);

            const matchedTransactions = [];
            for (const tx of transactions) {
                if (this.#matchesActiveConfig(tx)) {
                    matchedTransactions.push(tx);
                }
            }

            if (matchedTransactions.length > 0) {
                console.log(`Found ${matchedTransactions.length} matching transactions in block ${blockNumber}.`);
                await Promise.all(matchedTransactions.map(tx => this.#processTransaction(tx, this.activeConfig)));
            }

        } catch (err) {
            console.error(`Error processing block ${blockNumber}:`, err.message);
        }
    }

    #matchesActiveConfig(tx) {
        // TODO
        // if no active config or tx is invalid, it's not a match
        if (!this.activeConfig || !this.activeConfig.rules || !tx) {
            return false;
        }

        const rules = this.activeConfig.rules; // { fromAddress: '..' , toAddress: '..' , valueGreaterThan: '...' }
        let match = true; // assume match until a rule fails

        // case-insensitive address comparison
        if (rules.fromAddress && (!tx.from || tx.from.toLowerCase() !== rules.fromAddress.toLowerCase())) {
            match = false;
        }
        if (match && rules.toAddress && (!tx.to || tx.to.toLowerCase() !== rules.toAddress.toLowerCase())) {
            match = false;
        }
        // value comparison (using pre-parsed value if available)
        if (match && rules.valueGreaterThan) {
            try {
                // const threshold = rules._valueThreshold || parseUnits(rules.valueGreaterThan, 'ether');
                const threshold = parseUnits(rules.valueGreaterThan, 'ether'); // Parse every time or pre-parse in setActiveConfigById
                if (tx.value < threshold) {
                    match = false;
                }
            } catch (e) {
                console.warn(`Config ID ${this.activeConfig.id}: Invalid value format in rule valueGreaterThan: '${rules.valueGreaterThan}'. Skipping value rule for this tx.`);
                // Decide if an invalid rule should cause the whole transaction not to match
                // match = false; 
            }
        }

        return match;
    }

    async #processTransaction(tx, activeConfig) {
        try {
            console.log(`Processing transaction ${tx.hash} matched by Config '${activeConfig.name}' (ID: ${activeConfig.id})`);
            console.log(`  From: ${tx.from}, To: ${tx.to}, Value: ${formatUnits(tx.value, 'ether')} ETH`);

            // TODO: Implement database storage logic here.
            // Store tx details and the ID of the activeConfig (activeConfig.id).

        } catch (error) {
            console.error(`Error processing transaction ${tx.hash}:`, error);
        }
    }
}

export default EthereumService;
