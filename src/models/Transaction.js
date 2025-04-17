'use strict';

import { DataTypes, Model } from 'sequelize';

class Transaction extends Model {
	static init(sequelize) {
		super.init({
			hash: {
				type: DataTypes.STRING,
				allowNull: false,
				unique: true,
				primaryKey: true, // assuming hash is unique for 1 blockchain
			},
			fromAddress: {
				type: DataTypes.STRING,
				allowNull: false,
			},
			toAddress: {
				type: DataTypes.STRING,
				allowNull: true, // can be null for contract creation transactions
			},
			value: {
				type: DataTypes.STRING,
				allowNull: false,
			},
			blockNumber: {
				type: DataTypes.INTEGER,
				allowNull: false,
			},
			index: {
				type: DataTypes.INTEGER,
				allowNull: false,
			},
			type: {
				type: DataTypes.INTEGER,
				allowNull: false,
			},
			configId: {
				type: DataTypes.INTEGER,
				allowNull: false,
				references: {
					model: 'configs',
					key: 'id',
				},
				onUpdate: 'CASCADE',
				onDelete: 'CASCADE',
			},
		}, {
			sequelize,
			modelName: 'Transaction',
			tableName: 'transactions',
			timestamps: true,
		});
		return Transaction;
	}

	static associate(models) {
		this.belongsTo(models.Config, { foreignKey: 'configId', as: 'config' });
	}
}

export default Transaction;
