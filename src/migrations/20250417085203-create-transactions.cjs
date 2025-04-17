'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
	async up(queryInterface, Sequelize) {
		await queryInterface.createTable('transactions', {
			hash: {
				type: Sequelize.STRING,
				primaryKey: true,
				allowNull: false,
				unique: true,
			},
			fromAddress: {
				type: Sequelize.STRING,
				allowNull: false,
			},
			toAddress: {
				type: Sequelize.STRING,
				allowNull: true,
			},
			value: {
				type: Sequelize.STRING,
				allowNull: false,
			},
			blockNumber: {
				type: Sequelize.INTEGER,
				allowNull: false,
			},
			index: {
				type: Sequelize.INTEGER,
				allowNull: false,
			},
			type: {
				type: Sequelize.INTEGER,
				allowNull: false,
			},
			configId: {
				type: Sequelize.INTEGER,
				allowNull: false,
				references: {
					model: 'configs',
					key: 'id',
				},
				onUpdate: 'CASCADE',
				onDelete: 'CASCADE',
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
