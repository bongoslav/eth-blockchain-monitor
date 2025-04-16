'use strict';

import container from './container.js';

// async IIFE to handle application startup and initialization
(async () => {
    let ethereumService;
    try {
        ethereumService = container.resolve('ethereumService');

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
            // TODO: graceful shutdown for db and ws connection
        } catch (error) {
            console.error('Error during shutdown:', error);
        } finally {
            console.log('Exiting.');
            process.exit(0);
        }
    });

})();
