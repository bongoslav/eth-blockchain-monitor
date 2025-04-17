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

	validateActiveStatusChange(currentConfig, newData) {
		if (newData.active === undefined || newData.active === currentConfig.active) {
			return null;
		}

		if (currentConfig.active === true && newData.active === false) {
			return {
				status: 409,
				message: 'Cannot set active config to inactive'
			};
		}

		return null;
	}

	async createConfiguration(configurationData) {
		return await this.configsRepository.create(configurationData);
	}

	async updateConfiguration(id, configurationData) {
		return await this.configsRepository.update(id, configurationData);
	}

	async deleteConfiguration(id) {
		const deletedCount = await this.configsRepository.deleteById(id);
		return deletedCount > 0;
	}
}

export default ConfigsService;
