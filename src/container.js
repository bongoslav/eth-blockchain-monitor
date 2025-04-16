'use strict';

import { createContainer, asClass, asFunction, asValue } from 'awilix';
import ConfigsService from './services/configsService.js';
import EthereumService from './services/ethereumService.js';
import createConfigsRepository from './repositories/configsRepository.js';
import dotenv from 'dotenv';
dotenv.config();

const ethereumWssUrl = process.env.ETH_SEPOLIA_WSS;

// TODO: load from db. `On restart the previous configuration should be used.`
const transactionFilterConfig = {
    // Placeholder for filter rules
};

const container = createContainer();

container.register({
    configsService: asClass(ConfigsService).singleton(),
    ethereumService: asClass(EthereumService).singleton(),

    ethereumWssUrl: asValue(ethereumWssUrl),
    transactionFilterConfig: asValue(transactionFilterConfig),
    configsRepository: asFunction(createConfigsRepository).singleton(),
});

export default container;
