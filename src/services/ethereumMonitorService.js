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
        await this.blockProcessor.startMonitoring();
        this.blockProcessor.startBlockLoop();

        this.transactionProcessor.startPeriodicFlush();


        logger.debug('EthereumMonitorService initialized successfully.');
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