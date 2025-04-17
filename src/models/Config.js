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
			value: {
				type: DataTypes.STRING,
				allowNull: true,
			},
			blockNumber: {
				type: DataTypes.INTEGER,
				allowNull: true,
			},
			index: {
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
		}, {
			sequelize,
			modelName: 'Config',
			tableName: 'configs',
			timestamps: true,
		});
		return this;
	}

	static associate(models) {
		this.hasMany(models.Transaction, { foreignKey: 'configId', as: 'transactions' });
	}
}

export default Config;
