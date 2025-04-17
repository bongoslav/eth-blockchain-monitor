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
        try {
            const configs = await this.configsService.getConfigurations();
            res.json(configs);
        } catch (error) {
            next(error);
        }
    }

    // POST /configs
    async createConfiguration(req, res, next) {
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

            // Check if the updated config is the currently active one
            if (this.ethereumService?.activeConfig?.id === id) {
                console.log(`Active configuration (ID: ${id}) was updated. Reloading in EthereumService...`);
                // Re-apply the updated config in the monitor
                await this.ethereumService.setActiveConfigById(id);
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
        try {
            const id = parseInt(req.params.id, 10);
            if (isNaN(id)) {
                return res.status(400).json({ error: 'Invalid configuration ID' });
            }
            const deletedCount = await this.configsService.deleteConfiguration(id);
            if (deletedCount === null) {
                return res.status(404).json({ error: 'Configuration not found' });
            }

            // Check if the deleted config was the active one and deactivate monitoring
            if (this.ethereumService?.activeConfig?.id === id) {
                console.log(`Active configuration (ID: ${id}) was deleted. Deactivating in EthereumService...`);
                await this.ethereumService.setActiveConfigById(null); // Deactivate
            }

            res.status(204).send(); // No Content
        } catch (error) {
            next(error);
        }
    }

    // POST /monitor/config/:id - Activate a specific config for monitoring
    async setActiveMonitoringConfig(req, res, next) {
        try {
            const id = parseInt(req.params.id, 10);
            if (isNaN(id)) {
                return res.status(400).json({ error: 'Invalid configuration ID' });
            }

            const success = await this.ethereumService.setActiveConfigById(id);

            if (!success) {
                // setActiveConfigById logs warnings/errors, but we should still indicate failure
                return res.status(404).json({ error: `Failed to activate configuration ${id}. It might not exist.` });
            }

            res.status(200).json({ message: `Monitoring activated for configuration ID: ${id}` });
        } catch (error) {
            next(error);
        }
    }

    // DELETE /monitor/config - Deactivate monitoring config
    async deactivateMonitoringConfig(req, res, next) {
        try {
            await this.ethereumService.setActiveConfigById(null);
            res.status(200).json({ message: 'Monitoring configuration deactivated.' });
        } catch (error) {
            next(error);
        }
    }
}

export default ConfigsController; 