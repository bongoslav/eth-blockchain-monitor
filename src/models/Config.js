'use strict';

import { DataTypes, Model } from 'sequelize';

class Config extends Model {
	static initialize(sequelize) {
		Config.init({
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
		}, {
			sequelize,
			modelName: 'Config',
			tableName: 'configs',
			timestamps: true,
		});
		return Config;
	}
}

export default Config;
