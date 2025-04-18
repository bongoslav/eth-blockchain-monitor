'use strict';

import { Sequelize } from 'sequelize';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from './winston.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const storagePath = path.resolve(__dirname, '../../data/database.sqlite');

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: storagePath,
  logging: false,
});

const initializeDatabase = async () => {
  try {
    await sequelize.authenticate();
    logger.debug('Database connection has been established successfully.');
  } catch (error) {
    logger.error(`Unable to connect to the database: ${error.message}\n${error.stack || ''}`);
    throw error;
  }
};

export { sequelize, initializeDatabase };
