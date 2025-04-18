'use strict';

import { DataTypes, Model } from 'sequelize';

class Config extends Model {
	static init(sequelize) {
		super.init({
			id: {
				type: DataTypes.INTEGER,
				primaryKey: true,
				autoIncrement: true,
			},
			name: {
				type: DataTypes.STRING,
				allowNull: true,
				unique: false,
			},
			hash: {
				type: DataTypes.STRING,
				allowNull: true,
			},
			fromAddress: {
				type: DataTypes.STRING,
				allowNull: true,
			},
			toAddress: {
				type: DataTypes.STRING,
				allowNull: true,
			},
			minValue: {
				type: DataTypes.STRING,
				allowNull: true,
			},
			maxValue: {
				type: DataTypes.STRING,
				allowNull: true,
			},
			minBlockNumber: {
				type: DataTypes.INTEGER,
				allowNull: true,
			},
			maxBlockNumber: {
				type: DataTypes.INTEGER,
				allowNull: true,
			},
			minIndex: {
				type: DataTypes.INTEGER,
				allowNull: true,
			},
			maxIndex: {
				type: DataTypes.INTEGER,
				allowNull: true,
			},
			type: {
				type: DataTypes.INTEGER,
				allowNull: true,
			},
			active: {
				type: DataTypes.BOOLEAN,
				defaultValue: false,
				allowNull: false,
			},
			blockDelay: {
				type: DataTypes.INTEGER,
				allowNull: true,
				comment: 'Number of blocks to wait before processing matching transactions'
			},
		}, {
			sequelize,
			modelName: 'Config',
			tableName: 'configs',
			timestamps: true,
			indexes: [
				{
					fields: ['active'],
				}
			]
		});
		return this;
	}

	static associate(models) {
		this.hasMany(models.Transaction, { foreignKey: 'configId', as: 'transactions' });
	}
}

export default Config;
