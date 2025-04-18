'use strict';

import { Op } from 'sequelize';
import logger from '../config/winston.js';

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
		const sequelize = ConfigModel.sequelize;
		let updatedConfig = null;

		try {
			await sequelize.transaction(async (t) => {
				if (configData.active === true) {
					// deactivate previous config 
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
				}

				await ConfigModel.update(configData, {
					where: { id },
					transaction: t,
				});
			});

			updatedConfig = await findById(id);
		} catch (error) {
			logger.error(`Transaction failed in update: ${error.message}\n${error.stack || ''}`);
			throw error;
		}

		return updatedConfig;
	}

	async function deleteById(id) {
		return await ConfigModel.destroy({ where: { id } });
	}

	return {
		findById,
		findAll,
		create,
		update,
		deleteById,
		findActive,
		setActive,
	};
}

export default createConfigsRepository;
