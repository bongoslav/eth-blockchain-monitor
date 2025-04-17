const path = require('path');

module.exports = {
  development: {
    dialect: 'sqlite',
    storage: path.resolve('data', 'database.sqlite'),
  },
};
