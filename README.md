# Ethereum blockchain transactions monitor

Monitor ethereum transactions based on dynamic configurations.  
Used packages: express, awilix, ethers, sqlite3, sequelize, joi, nodemon.  
***Tested with _Infura_ WSS RPC URL on Ethereum Sepolia.***

## Getting Started

### Prerequisites

- Node.js
- npm
- WSS RPC URL

### Installation

Clone the repository and install dependencies:

```bash
git clone https://github.com/bongoslav/eth-blockchain-monitor.git
cd eth-blockchain-monitor
npm install
```
### Running the project

1. Copy the example file:
```bash
cp .env.example .env
```

2. Open `.env` and fill at least your provider's WSS RPC url. There are default values for the other fields.
```bash
ETH_WSS_URL=wss://sepolia.infura.io/ws/v3/123
```

3. Apply the migrations
```bash
npm run db:migrate
```

4. Run in development mode

```bash
npm run dev
```

### Other scripts
- Migration related
```bash
npm run db:migrate:undo
```
```bash
npm run db:migrate:undo:all
```

## Features
- asd
- asd
- asd

## Endpoints