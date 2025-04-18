import logger from '../config/winston.js';
import { WebSocketProvider } from 'ethers';

class EthereumProviderFactory {
    constructor({ ethereumWssUrl, maxWSSRetries }) {
        this.providerUrl = ethereumWssUrl;
        this.maxWSSRetries = maxWSSRetries;
        this.provider = null;
        this.retryCount = 0;
        this.isShuttingDown = false;
    }

    async createProvider() {
        try {
            this.provider = new WebSocketProvider(this.providerUrl);
        } catch (error) {
            logger.error(`Error creating provider: ${error.message}\n${error.stack || ''}`);
            throw error;
        }

        this.provider.on('error', async (error) => {
            logger.error(`WebSocket Provider Error: ${error.message}\n${error.stack || ''}`);

            if (this.isShuttingDown) return; // don't reconnect if shutting down

            logger.debug('Attempting to reconnect...');

            retryCount++;

            logger.warn(`Retrying connection (attempt ${retryCount}/${this.maxWSSRetries})`);

            await new Promise(resolve => setTimeout(resolve, 100 * Math.pow(2, retryCount)));

            if (retryCount >= this.maxWSSRetries) {
                logger.error('Failed to reconnect after maximum attempts. Exiting...');
                await this.shutdown();
                process.exit(1);
            }

            await this.createProvider();
        });
    }
    
    getProvider() {
        return this.provider;
    }

    /**
     * Shuts down the Ethereum provider
     * @return {Promise<void>}
     */
    async shutdown() {
        logger.debug('Disconnecting from Ethereum Provider...');
        this.isShuttingDown = true;
        
        if (this.provider) {
            this.provider.removeAllListeners();
            await this.provider.destroy();
            this.provider = null;
        }
    }
}

export default EthereumProviderFactory;
