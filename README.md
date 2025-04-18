# Ethereum blockchain transactions monitor

Monitor ethereum transactions based on dynamic configurations.  
Used packages: express, awilix, ethers, sqlite3, sequelize, joi, winston, nodemon.  
**_Tested with *Infura* WSS RPC URL on Ethereum Sepolia._**

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

## Endpoints for the Configurations

Local url: `http://localhost:3000`

| Method | Endpoint     | Description           | Request Body Example                                                     |
| ------ | ------------ | --------------------- | ------------------------------------------------------------------------ |
| GET    | /configs     | Get all configs       | –                                                                        |
| GET    | /configs/:id | Get a config by ID    | –                                                                        |
| POST   | /configs     | Create a new config   | `{ "name": "at least 0.01" "minValue": "10000000000000000", "type": 2 }` |
| PUT    | /configs/:id | Update a config by ID | `{ "active": true, "minBlockNumber": 8888888 }`                          |
| DELETE | /configs/:id | Delete config         | –                                                                        |

<details>
<summary>Request bodies</summary>
<br>

### Create Configuration

| Field          | Type    | Required | Notes          |
| -------------- | ------- | -------- | -------------- |
| name           | string  | yes      | –              |
| hash           | string  | no       | –              |
| fromAddress    | string  | no       | –              |
| toAddress      | string  | no       | –              |
| minValue       | string  | no       | –              |
| maxValue       | string  | no       | –              |
| minBlockNumber | number  | no       | min: 0         |
| maxBlockNumber | number  | no       | min: 0         |
| minIndex       | number  | no       | min: 0         |
| maxIndex       | number  | no       | min: 0         |
| type           | number  | no       | min: 0         |
| active         | boolean | no       | default: false |

### Update Configuration

| Field          | Type    | Required | Notes            |
| -------------- | ------- | -------- | ---------------- |
| name           | string  | no       | –                |
| hash           | string  | no       | –                |
| fromAddress    | string  | no       | –                |
| toAddress      | string  | no       | –                |
| minValue       | string  | no       | –                |
| maxValue       | string  | no       | –                |
| minBlockNumber | number  | no       | min: 0           |
| maxBlockNumber | number  | no       | min: 0           |
| minIndex       | number  | no       | min: 0           |
| maxIndex       | number  | no       | min: 0           |
| type           | number  | no       | min: 0           |
| active         | boolean | no       | strictly boolean |

</details>

## Database Schema

### Table: `configs`

| Column         | Type     | Constraints                 | Description                 |
| -------------- | -------- | --------------------------- | --------------------------- |
| id             | INTEGER  | Primary Key, Auto Increment | Unique identifier           |
| name           | STRING   | Nullable                    | Optional name               |
| hash           | STRING   | Nullable                    | Optional hash value         |
| fromAddress    | STRING   | Nullable                    | Filter: from address        |
| toAddress      | STRING   | Nullable                    | Filter: to address          |
| minValue       | STRING   | Nullable                    | Minimum value in Wei        |
| maxValue       | STRING   | Nullable                    | Maximum value in Wei        |
| minBlockNumber | INTEGER  | Nullable                    | Minimum block number        |
| maxBlockNumber | INTEGER  | Nullable                    | Maximum block number        |
| minIndex       | INTEGER  | Nullable                    | Minimum transaction index   |
| maxIndex       | INTEGER  | Nullable                    | Maximum transaction index   |
| type           | INTEGER  | Nullable                    | Transaction type filter     |
| active         | BOOLEAN  | Not Null, Default: `false`  | Is it current active config |
| createdAt      | DATETIME | Auto-generated              | Timestamp of creation       |
| updatedAt      | DATETIME | Auto-generated              | Timestamp of last update    |

**Associations**:

- `Config` has many `Transaction` (foreign key: `configId`)

---

### Table: `transactions`

| Column      | Type     | Constraints                          | Description                                               |
| ----------- | -------- | ------------------------------------ | --------------------------------------------------------- |
| hash        | STRING   | Primary Key, Unique, Not Null        | Unique transaction hash                                   |
| fromAddress | STRING   | Not Null                             | Sender address                                            |
| toAddress   | STRING   | Nullable                             | Receiver address. Null when contract creation transaction |
| value       | STRING   | Not Null                             | Transaction value in Wei                                  |
| blockNumber | INTEGER  | Not Null                             | Block number of the transaction                           |
| index       | INTEGER  | Not Null                             | Transaction index in the block                            |
| type        | INTEGER  | Not Null                             | Type of transaction                                       |
| configId    | INTEGER  | Not Null, Foreign Key → `configs.id` | Linked config                                             |
| createdAt   | DATETIME | Auto-generated                       | Timestamp of creation                                     |
| updatedAt   | DATETIME | Auto-generated                       | Timestamp of last update                                  |

**Associations**:

- `Transaction` belongs to `Config` (foreign key: `configId`)
