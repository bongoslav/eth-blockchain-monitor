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
				allowNull: false,
				unique: true,
			},
			rules: {
				type: DataTypes.JSON,
				allowNull: false,
				comment: 'JSON object containing the filtering rules for transactions.'
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
