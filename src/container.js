'use strict';

import { createContainer, asClass, asFunction, asValue } from 'awilix';
import { initializeDatabase, sequelize } from './config/db.js';
import { initModels } from './models/index.js';
import ConfigsService from './services/configsService.js';
import EthereumMonitorService from './services/ethereumMonitorService.js';
import TransactionProcessorService from './services/transactionProcessorService.js';
import BlockProcessorService from './services/blockProcessorService.js';
import EthereumProviderFactory from './services/ethProviderFactory.js';
import createConfigsRepository from './repositories/configsRepository.js';
import dotenv from 'dotenv';
import createServer from './server.js';
import ConfigsController from './controllers/configsController.js';
import logger from './config/winston.js';

dotenv.config();

async function configureContainer() {
    try {
        await initializeDatabase();
        const models = initModels(sequelize);

        await models.Config.sync({ alter: false });
        await models.Transaction.sync({ alter: true });
        logger.debug('All models synced successfully.');

        const container = createContainer();

        container.register({
            // DB
            sequelize: asValue(sequelize),
            Config: asValue(models.Config),
            Transaction: asValue(models.Transaction),

            // Repositories
            configsRepository: asFunction(({ Config }) => createConfigsRepository({ ConfigModel: Config })).singleton(),

            // Services
            providerFactory: asClass(EthereumProviderFactory).singleton(),
            transactionProcessor: asClass(TransactionProcessorService).singleton(),
            blockProcessor: asClass(BlockProcessorService).singleton(),
            configsService: asClass(ConfigsService).singleton(),
            ethereumService: asClass(EthereumMonitorService).singleton(),

            // API Components
            configsController: asClass(ConfigsController).singleton(),
            server: asFunction(createServer).singleton(),

            ethereumWssUrl: asValue(process.env.ETH_WSS_URL),
            TXBatchSize: asValue(parseInt(process.env.BATCH_SIZE) || 100),
            flushTXIntervalMs: asValue(parseInt(process.env.FLUSH_INTERVAL_MS) || 5000),
            saveTxToDBMaxRetries: asValue(parseInt(process.env.SAVE_TX_TO_DB_MAX_RETRIES) || 3),
            blockLoopIntervalMs: asValue(parseInt(process.env.BLOCK_LOOP_INTERVAL_MS) || 1000),

            maxWSSRetries: asValue(parseInt(process.env.MAX_WSS_RETRIES) || 3),
        });

        logger.debug('Container configured successfully.');
        return container;

    } catch (error) {
        logger.error(`Failed to configure dependency container: ${error.message}\n${error.stack || ''}`);
        throw error; // Re-throw to be caught by index.js
    }
}

export default configureContainer;
