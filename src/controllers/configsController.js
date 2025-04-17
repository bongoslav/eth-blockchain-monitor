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

            // TODO: Add validation for req.body

            const updatedConfig = await this.configsService.updateConfiguration(id, req.body);
            if (!updatedConfig) {
                return res.status(404).json({ error: 'Configuration not found' });
            }

            // check if the updated config IS NOW active and notify EthereumService
            if (updatedConfig.active === true) {
                console.log(`Configuration (ID: ${updatedConfig.id}) is now active. Notifying EthereumService...`);
                if (this.ethereumService) {
                    // signal the service to update its config on the next block
                    this.ethereumService.notifyActiveConfigChanged();
                } else {
                    console.warn('EthereumService not available in ConfigsController to notify active state change.');
                }
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
            const deletedCount = await this.configsService.deleteConfiguration(id);
            if (deletedCount === null) {
                return res.status(404).json({ error: 'Configuration not found' });
            }

            // Check if the deleted config was the active one and notify EthereumService
            if (this.ethereumService?.activeConfig?.id === id) {
                console.log(`Active configuration (ID: ${id}) was deleted. Notifying EthereumService...`);
                if (this.ethereumService) {
                    this.ethereumService.notifyActiveConfigChanged();
                } else {
                    console.warn('EthereumService not available in ConfigsController to notify active state change after deletion.');
                }
            }

            res.status(204).send();
        } catch (error) {
            next(error);
        }
    }
}

export default ConfigsController; 