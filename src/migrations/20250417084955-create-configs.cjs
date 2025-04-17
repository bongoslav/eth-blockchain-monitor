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
				allowNull: false,
			},
			rules: {
				type: Sequelize.JSON,
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
		await queryInterface.dropTable('configs');
	}
};
