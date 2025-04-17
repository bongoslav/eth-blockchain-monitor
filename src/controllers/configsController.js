'use strict';

class ConfigsController {
    constructor({ configsService, ethereumService }) {
        if (!configsService || !ethereumService) {
            throw new Error('ConfigsController requires configsService and ethereumService');
        }
        this.configsService = configsService;
        this.ethereumService = ethereumService;
    }

    // GET /configs/:id
    async getConfiguration(req, res, next) {
        console.log('getConfiguration called');
        try {
            const id = parseInt(req.params.id, 10);
            if (isNaN(id)) {
                return res.status(400).json({ error: 'Invalid configuration ID' });
            }
            const config = await this.configsService.getConfiguration(id);
            if (!config) {
                return res.status(404).json({ error: 'Configuration not found' });
            }
            res.json(config);
        } catch (error) {
            next(error);
        }
    }

    // GET /configs
    async getConfigurations(req, res, next) {
        console.log('getConfigurations called');
        try {
            const configs = await this.configsService.getConfigurations();
            res.json(configs);
        } catch (error) {
            next(error);
        }
    }

    // POST /configs
    async createConfiguration(req, res, next) {
        console.log('createConfiguration called');
        try {
            // TODO: Add validation for req.body
            const newConfig = await this.configsService.createConfiguration(req.body);
            res.status(201).json(newConfig);
        } catch (error) {
            if (error.name === 'SequelizeUniqueConstraintError') {
                return res.status(409).json({ error: 'Configuration name already exists' });
            }
            next(error);
        }
    }

    // PUT /configs/:id
    async updateConfiguration(req, res, next) {
        console.log('updateConfiguration called');
        try {
            const id = parseInt(req.params.id, 10);
            if (isNaN(id)) {
                return res.status(400).json({ error: 'Invalid configuration ID' });
            }

            // TODO: validation !! (dont pass string to bool)

            const currentConfig = await this.configsService.getConfiguration(id);
            if (!currentConfig) {
                return res.status(404).json({ error: 'Configuration not found' });
            }

            const activeValidationError = this.configsService.validateActiveStatusChange(currentConfig, req.body);
            if (activeValidationError) {
                return res.status(activeValidationError.status).json({ error: activeValidationError.message });
            }

            const updatedConfig = await this.configsService.updateConfiguration(id, req.body);
            
            if (currentConfig.active === false && req.body.active === true) {
                this.ethereumService?.notifyActiveConfigChanged();
            }

            res.json(updatedConfig);
        } catch (error) {
            if (error.name === 'SequelizeUniqueConstraintError') {
                return res.status(409).json({ error: 'Configuration name already exists' });
            }
            next(error);
        }
    }

    // DELETE /configs/:id
    async deleteConfiguration(req, res, next) {
        console.log('deleteConfiguration called');
        try {
            const id = parseInt(req.params.id, 10);
            if (isNaN(id)) {
                return res.status(400).json({ error: 'Invalid configuration ID' });
            }
            
            const config = await this.configsService.getConfiguration(id);
            if (!config) {
                return res.status(404).json({ error: 'Configuration not found' });
            }

            if (config.active === true) {
                return res.status(409).json({ error: 'Cannot delete active configuration' });
            }
            
            const deleted = await this.configsService.deleteConfiguration(id);
            if (!deleted) {
                return res.status(500).json({ error: 'Failed to delete configuration' });
            }

            res.status(204).send();
        } catch (error) {
            next(error);
        }
    }
}

export default ConfigsController; 