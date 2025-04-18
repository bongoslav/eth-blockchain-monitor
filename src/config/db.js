'use strict';

import { Sequelize } from 'sequelize';
import logger from './winston.js';

const sequelize = new Sequelize({
  dialect: process.env.DB_DIALECT || 'sqlite',
  storage: process.env.DB_STORAGE_PATH || './data/database.sqlite',
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
