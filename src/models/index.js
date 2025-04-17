'use strict';

import ConfigModel from './Config.js';

export function initModels(sequelize) {
    return {
        ConfigModel: ConfigModel.initialize(sequelize),
    };
}
