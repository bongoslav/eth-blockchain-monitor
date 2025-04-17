'use strict';

class ConfigsService {
	constructor({ configsRepository }) {
		if (!configsRepository) {
			throw new Error('configsRepository dependency is required for ConfigsService');
		}
		this.configsRepository = configsRepository;
	}

	async getConfiguration(id) {
		return await this.configsRepository.findById(id);
	}

	async getConfigurations() {
		return await this.configsRepository.findAll();
	}

	async getActiveConfig() {
		return await this.configsRepository.findActive();
	}

	async setActiveConfig(id) {
		return await this.configsRepository.setActive(id);
	}

	async createConfiguration(configurationData) {
		return await this.configsRepository.create(configurationData);
	}

	async updateConfiguration(id, configurationData) {
		if (configurationData.active === true) {
			return await this.configsRepository.updateAndEnsureSingleActive(id, configurationData);
		} else if (configurationData.active === false) {
			return await this.configsRepository.updateIfActive(id, configurationData);
		}
		
		return await this.configsRepository.update(id, configurationData);
	}

	async deleteConfiguration(id) {
		const deletedCount = await this.configsRepository.deleteById(id);
		if (deletedCount === 0) {
			return null;
		}
		return deletedCount;
	}
}

export default ConfigsService;
