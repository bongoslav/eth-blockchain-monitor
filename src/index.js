'use strict';

import configureContainer from './container.js';

// async IIFE to handle application startup and initialization
(async () => {
    let container;
    let ethereumService;
    let sequelize;

    try {
        container = await configureContainer();

        ethereumService = container.resolve('ethereumService');
        sequelize = container.resolve('sequelize');

        await ethereumService.initialize();
        await ethereumService.startMonitoring();

        console.log('Ethereum Monitor application started successfully.');
    } catch (error) {
        console.error('Application failed to start:', error);
        process.exit(1);
    }

    process.on('SIGINT', async () => {
        console.log('\nShutting down gracefully...');
        try {
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
