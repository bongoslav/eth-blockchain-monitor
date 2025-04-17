'use strict';

import { createContainer, asClass, asFunction, asValue, Lifetime } from 'awilix';
import { initializeDatabase, sequelize } from './config/db.js';
import { initModels } from './models/index.js';
import ConfigsService from './services/configsService.js';
import EthereumService from './services/ethereumService.js';
import createConfigsRepository from './repositories/configsRepository.js';
import dotenv from 'dotenv';
import createServer from './server.js';
import ConfigsController from './controllers/configsController.js';

dotenv.config();

const ethereumWssUrl = process.env.ETH_SEPOLIA_WSS;

// TODO: load from db. `On restart the previous configuration should be used.`

async function configureContainer() {
    try {
        await initializeDatabase();
        const models = initModels(sequelize);
        await Promise.all(Object.values(models).map(model => model.sync({ alter: true })));
        console.log('Models synchronized successfully.');

        const container = createContainer();

        container.register({
            // DB
            sequelize: asValue(sequelize), // for graceful shutdown
            models: asValue(models), // makes it extendable. we have access to all models in the container

            // Repositories
            // factory function that resolves the model. it depends on the model
            configsRepository: asFunction(({ models }) => createConfigsRepository({ ConfigModel: models.ConfigModel })).singleton(),

            // Services
            configsService: asClass(ConfigsService).singleton(),
            ethereumService: asClass(EthereumService).singleton(),

            // API Components
            configsController: asClass(ConfigsController).singleton(),
            server: asFunction(createServer).singleton(),

            // Configuration values
            ethereumWssUrl: asValue(ethereumWssUrl),
        });

        console.log('Container configured successfully.');
        return container;

    } catch (error) {
        console.error('Failed to configure dependency container:', error);
        throw error; // Re-throw to be caught by index.js
    }
}

export default configureContainer;
