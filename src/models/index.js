'use strict';

import Config from './Config.js';
import Transaction from './Transaction.js';

function initModels(sequelize) {
	const models = {
		Config: Config.init(sequelize),
		Transaction: Transaction.init(sequelize),
	};

	// call associate methods if they exist
	Object.values(models)
		.filter(model => typeof model.associate === 'function')
		.forEach(model => model.associate(models));

	return models;
}

export { initModels, Config, Transaction };
