'use strict';

import { Op } from 'sequelize';

function createConfigsRepository({ ConfigModel }) {
	if (!ConfigModel) {
		throw new Error('ConfigModel is required to create configs repository');
	}

	async function findById(id) {
		return await ConfigModel.findByPk(id);
	}

	async function findAll() {
		return await ConfigModel.findAll();
	}

	async function findActive() {
		return await ConfigModel.findOne({ where: { active: true } });
	}

	async function setActive(id) {
		// cannot update and return in 1 operation in sqlite3
		await ConfigModel.update({ active: true }, { where: { id } });
		return await ConfigModel.findByPk(id);
	}

	async function create(configData) {
		return await ConfigModel.create(configData);
	}

	async function update(id, configData) {
		await ConfigModel.update(configData, { where: { id } });
		return await ConfigModel.findByPk(id);
	}

	async function deleteById(id) {
		return await ConfigModel.destroy({ where: { id } });
	}

	async function updateAndEnsureSingleActive(id, configData) {
		const sequelize = ConfigModel.sequelize;
		let updatedConfig = null;

		try {
			await sequelize.transaction(async (t) => {
				// deactivate all other configurations
				await ConfigModel.update(
					{ active: false },
					{
						where: {
							id: { [Op.ne]: id },
							active: true
						},
						transaction: t
					}
				);

				// update the target configuration
				await ConfigModel.update(configData, {
					where: { id },
					transaction: t,
				});
			});

			updatedConfig = await findById(id);

		} catch (error) {
			console.error('Transaction failed in updateAndEnsureSingleActive:', error);
			throw error; // Re-throw the error to be handled by the service/controller
		}

		return updatedConfig;
	}

	async function updateIfActive(id, configData) {
		const activeConfigs = await ConfigModel.findOne({ where: { active: true } });

		if (activeConfigs.id === id) {
			return await ConfigModel.update(configData, { where: { id } });
		}
	}

	return {
		findById,
		findAll,
		create,
		update,
		deleteById,
		findActive,
		setActive,
		updateAndEnsureSingleActive,
		updateIfActive,
	};
}

export default createConfigsRepository;
