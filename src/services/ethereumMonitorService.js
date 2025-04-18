'use strict';

import logger from '../config/winston.js';

class EthereumMonitorService {
    constructor({
        configsService,
        Transaction,
        providerFactory,
        transactionProcessor,
        blockProcessor
    }) {
        if (!configsService || !Transaction) {
            throw new Error('EthereumMonitorService missing required dependencies.');
        }
        this.providerFactory = providerFactory;
        this.configsService = configsService;
        this.transactionProcessor = transactionProcessor;
        this.blockProcessor = blockProcessor;
    }

    /**
     * Initializes all the services.
     * @return {Promise<void>}
     */
    async initialize() {
        this.provider = await this.providerFactory.getProvider();

        await this.blockProcessor.setProvider(this.provider);
        await this.blockProcessor.initialize();

        this.transactionProcessor.startPeriodicFlush();

        logger.debug('EthereumMonitorService initialized successfully.');
    }

    /**
     * Starts monitoring for new blocks from the Ethereum provider
     * @return {Promise<void>}
     */
    async startMonitoring() {
        if (!this.provider) {
            logger.error('Provider not initialized.');
            return;
        }

        logger.debug('Starting Ethereum block monitoring...');
        await this.blockProcessor.startMonitoring();
    }

    /**
     * "Notifies" the service that the active configuration may have changed.
     * @return {void}
     */
    notifyActiveConfigChanged() {
        this.blockProcessor.notifyActiveConfigChanged();
    }

    /**
     * Shuts down the Ethereum service and its components
     * @return {Promise<void>}
     */
    async shutdown() {
        logger.debug('Shutting down EthereumMonitorService...');

        if (this.blockProcessor) {
            this.blockProcessor.shutdown();
        }
        
        if (this.transactionProcessor) {
            await this.transactionProcessor.shutdown();
        }

        if (this.provider) {
            await this.providerFactory.shutdown();
        }
    }
}

export default EthereumMonitorService; 