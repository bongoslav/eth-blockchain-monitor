'use strict';

import createConfigsRepository from '../repositories/configsRepository.js';

// TODO
class ConfigsService {
  constructor({ db }) {
    this.configsRepository = createConfigsRepository({ db });
  }

  async getConfiguration(id) {
    return await this.configsRepository.findById(id);
  }

  async createConfiguration(configuration) {
    return await this.configsRepository.create(configuration);
  }

  async updateConfiguration(id, configuration) {
    return await this.configsRepository.update(id, configuration);
  }

  async deleteConfiguration(id) {
    return await this.configsRepository.delete(id);
  }
}

export default ConfigsService;
