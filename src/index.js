'use strict';

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

        ethereumService = container.resolve('ethereumService');
        sequelize = container.resolve('sequelize');
        server = container.resolve('server');

        // await ethereumService.initialize();
        // await ethereumService.startMonitoring();

        runningServer = server.listen(PORT, () => {
             console.log(`API Server listening on port ${PORT}`);
        });

        console.log('Ethereum Monitor application backend started successfully.');
        console.log('Use API endpoints to manage configurations and activate monitoring.');

    } catch (error) {
        console.error('Application failed to start:', error);
        if (runningServer) {
            runningServer.close();
        }
        process.exit(1);
    }

    process.on('SIGINT', async () => {
        console.log('\nShutting down gracefully...');
        try {
            if (runningServer) {
                 await new Promise(resolve => runningServer.close(resolve));
                 console.log('API Server closed.');
            }
            if (sequelize) {
                await sequelize.close();
                console.log('Database connection closed');
            }
        } catch (error) {
            console.error('Error during shutdown:', error);
        } finally {
            console.log('Exiting');
            process.exit(0);
        }
    });

})();
