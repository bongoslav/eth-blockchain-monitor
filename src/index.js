'use strict';

import { WebSocketProvider } from 'ethers';
import { config } from 'dotenv';
config();

const INFURA_WSS = process.env.INFURA_ETH_SEPOLIA_WSS;

const provider = new WebSocketProvider(INFURA_WSS);

provider.on('block', async (blockNumber) => {
    console.log(`\n New block: ${blockNumber}`);

    try {
        const block = await provider.getBlock(blockNumber, true); // true = include transactions

        for (const txHash of block.transactions) {
            const tx = await provider.getTransaction(txHash);

            console.log(tx);
            if (!tx) continue;
        }
    } catch (err) {
        console.error(`Error fetching block ${blockNumber}:`, err);
    }
});
