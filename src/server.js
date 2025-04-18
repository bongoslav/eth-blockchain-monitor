'use strict';

import express from 'express';
import createConfigsRouter from './routes/configsRoutes.js';
import logger from './config/winston.js';

function createServer({ configsController }) {
	if (!configsController) {
		throw new Error('configsController is required to create server');
	}

	const app = express();

	app.use(express.json());

	const configsRouter = createConfigsRouter({ configsController });
	app.use('/api/v1', configsRouter);

	// basic health check
	app.get('/', (req, res) => {
		res.status(200).json({ status: 'ok' });
	});

	app.use((req, res, next) => {
		res.status(404).json({ error: 'Not Found' });
	});

	app.use((err, req, res, next) => {
		logger.error(`[Unhandled API Error]: ${err.message}\n${err.stack || ''}`);
		const statusCode = err.statusCode || 500;
		const message = process.env.NODE_ENV === 'production' && statusCode === 500
			? 'Internal Server Error'
			: err.message;
		res.status(statusCode).json({ error: message || 'Internal Server Error' });
	});

	return app;
}

export default createServer; 
