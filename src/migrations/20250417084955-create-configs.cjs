'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
	async up(queryInterface, Sequelize) {
		await queryInterface.createTable('configs', {
			id: {
				type: Sequelize.INTEGER,
				primaryKey: true,
				autoIncrement: true,
			},
			name: {
				type: Sequelize.STRING,
				allowNull: true,
				unique: false,
			},
			hash: {
				type: Sequelize.STRING,
				allowNull: true,
			},
			fromAddress: {
				type: Sequelize.STRING,
				allowNull: true,
			},
			toAddress: {
				type: Sequelize.STRING,
				allowNull: true,
			},
			value: {
				type: Sequelize.STRING,
				allowNull: true,
			},
			blockNumber: {
				type: Sequelize.INTEGER,
				allowNull: true,
			},
			index: {
				type: Sequelize.INTEGER,
				allowNull: true,
			},
			type: {
				type: Sequelize.INTEGER,
				allowNull: true,
			},
			active: {
				type: Sequelize.BOOLEAN,
				allowNull: false,
				defaultValue: false,
			},
			createdAt: {
				type: Sequelize.DATE,
				allowNull: false,
			},
			updatedAt: {
				type: Sequelize.DATE,
				allowNull: false,
			},
		});
	},

	async down(queryInterface) {
		await queryInterface.dropTable('configs');
	}
};
