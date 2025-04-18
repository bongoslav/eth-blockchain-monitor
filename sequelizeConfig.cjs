const path = require('path');

module.exports = {
  development: {
    dialect: process.env.DB_DIALECT || 'sqlite',
    storage: process.env.DB_STORAGE_PATH || './data/database.sqlite',
  },
};
