'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
	async up(queryInterface, Sequelize) {
		await queryInterface.createTable('transactions', {
			id: {
				type: Sequelize.INTEGER,
				primaryKey: true,
				autoIncrement: true,
			},
			hash: {
				type: Sequelize.STRING,
				allowNull: false,
			},
			blockchain: {
				type: Sequelize.STRING,
				allowNull: false,
			},
			network: {
				type: Sequelize.STRING,
				allowNull: false,
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
		await queryInterface.dropTable('transactions');
	}
};
