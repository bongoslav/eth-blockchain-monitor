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

	async createConfiguration(configurationData) {
		// ? validation
		return await this.configsRepository.create(configurationData);
	}

	async updateConfiguration(id, configurationData) {
		// ? validation
		// ? update and return?
		const affectedCount = await this.configsRepository.update(id, configurationData);
		if (affectedCount === 0) {
			return null;
		}
		return await this.configsRepository.findById(id);
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
