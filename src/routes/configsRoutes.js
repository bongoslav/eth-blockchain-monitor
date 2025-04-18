'use strict';

import { Router } from 'express';

function createConfigsRouter({ configsController }) {
	if (!configsController) {
		throw new Error('configsController is required to create configs router');
	}

	const router = Router();

	router.get('/configs/:id', (req, res, next) => configsController.getConfiguration(req, res, next));
	router.get('/configs', (req, res, next) => configsController.getConfigurations(req, res, next));
	router.post('/configs', (req, res, next) => configsController.createConfiguration(req, res, next));
	router.put('/configs/:id', (req, res, next) => configsController.updateConfiguration(req, res, next));
	router.delete('/configs/:id', (req, res, next) => configsController.deleteConfiguration(req, res, next));

	return router;
}

export default createConfigsRouter; 