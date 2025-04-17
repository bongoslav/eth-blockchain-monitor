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
			minValue: {
				type: Sequelize.STRING,
				allowNull: true,
			},
			maxValue: {
				type: Sequelize.STRING,
				allowNull: true,
			},
			minBlockNumber: {
				type: Sequelize.INTEGER,
				allowNull: true,
			},
			maxBlockNumber: {
				type: Sequelize.INTEGER,
				allowNull: true,
			},
			minIndex: {
				type: Sequelize.INTEGER,
				allowNull: true,
			},
			maxIndex: {
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
