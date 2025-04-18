'use strict';

import logger from './config/winston.js';
import configureContainer from './container.js';
import dotenv from 'dotenv';
dotenv.config();

const PORT = process.env.PORT || 3000;

// async IIFE to handle application startup and initialization
(async () => {
    let container;
    let ethereumService;
    let sequelize;
    let server;
    let runningServer;

    try {
        container = await configureContainer();

        const providerFactory = container.resolve('providerFactory');
        await providerFactory.createProvider();

        ethereumService = container.resolve('ethereumService');
        sequelize = container.resolve('sequelize');
        server = container.resolve('server');

        await ethereumService.initialize();

        runningServer = server.listen(PORT, () => {
            logger.debug(`API Server listening on port ${PORT}`);
        });

        logger.debug('Ethereum Monitor application backend started successfully.');
    } catch (error) {
        logger.error(`Application failed to start: ${error.message}\n${error.stack || ''}`);
        if (runningServer) {
            runningServer.close();
        }
        process.exit(1);
    }

    process.on('SIGINT', async () => {
        logger.debug('\nShutting down gracefully...');
        try {
            await ethereumService.shutdown();
            logger.debug('Ethereum Service closed.');

            if (runningServer) {
                await runningServer.close();
                logger.debug('API Server closed.');
            }
            if (sequelize) {
                await sequelize.close();
                logger.debug('Database connection closed');
            }
        } catch (error) {
            logger.error(`Error during shutdown: ${error.message}\n${error.stack || ''}`);
        } finally {
            logger.debug('Exiting');
            process.exit(0);
        }
    });

})();
