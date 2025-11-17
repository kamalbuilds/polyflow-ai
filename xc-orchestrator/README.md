# XCM Orchestrator

A comprehensive cross-chain orchestrator for seamless XCM (Cross-Consensus Messaging) routing and execution across the Polkadot and Kusama ecosystems.

## 🌟 Features

### Core Functionality
- **Cross-Chain Asset Transfers**: Automated XCM message building and execution
- **Route Optimization**: Intelligent route discovery with multi-hop support
- **Fee Estimation**: Real-time fee estimation with optimization
- **Transaction Monitoring**: Comprehensive status tracking with retry logic
- **Event Listening**: Cross-chain event monitoring and notifications
- **Multi-Parachain Support**: Asset Hub, Hydration, Moonbeam, Astar, and more

### Advanced Features
- **Real-Time Monitoring**: WebSocket-based live updates
- **RESTful API**: Complete HTTP API for integration
- **Notification System**: Discord, Slack, Telegram, and webhook notifications
- **Rate Limiting**: Built-in protection against abuse
- **Caching**: Intelligent caching for performance optimization
- **Health Monitoring**: Comprehensive system health checks

### Supported Networks
- **Polkadot**: Relay chain and parachains
- **Kusama**: Relay chain and parachains
- **Asset Hub**: Both Polkadot and Kusama versions
- **Hydration**: DeFi-focused parachain
- **Moonbeam**: EVM-compatible parachain
- **Astar**: Smart contract platform

## 🚀 Quick Start

### Installation

```bash
# Clone the repository
git clone https://github.com/your-org/xcm-orchestrator.git
cd xcm-orchestrator

# Install dependencies
npm install

# Copy environment configuration
cp .env.example .env

# Edit configuration
nano .env
```

### Configuration

Edit `.env` file with your settings:

```bash
# Server Configuration
NODE_ENV=development
PORT=3000
HOST=localhost

# WebSocket Endpoints
POLKADOT_WS_ENDPOINT=wss://rpc.polkadot.io
KUSAMA_WS_ENDPOINT=wss://kusama-rpc.polkadot.io
ASSETHUB_POLKADOT_WS_ENDPOINT=wss://polkadot-asset-hub-rpc.polkadot.io
HYDRATION_WS_ENDPOINT=wss://rpc.hydradx.cloud

# Security
API_KEY=your-secure-api-key-here
JWT_SECRET=your-jwt-secret

# Notifications (optional)
DISCORD_WEBHOOK=https://discord.com/api/webhooks/...
SLACK_WEBHOOK=https://hooks.slack.com/services/...
WEBHOOK_URL=https://your-app.com/webhook

# Rate Limiting
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### Running the Service

```bash
# Development mode
npm run dev

# Production build and start
npm run build
npm start

# Using Docker
docker build -t xcm-orchestrator .
docker run -p 3000:3000 --env-file .env xcm-orchestrator
```

### Health Check

```bash
curl http://localhost:3000/health
```

## 📖 API Documentation

### Authentication

All API endpoints require authentication via API key:

```bash
curl -H "X-API-Key: your-api-key" http://localhost:3000/api/transfers
```

### Core Endpoints

#### Execute XCM Transfer

```bash
POST /api/transfers
Content-Type: application/json
X-API-Key: your-api-key

{
  "sourceChain": "polkadot",
  "destinationChain": "assetHub",
  "asset": {
    "symbol": "DOT",
    "decimals": 10,
    "isNative": true
  },
  "amount": "5000000000000",
  "sender": "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
  "recipient": "0xfedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321",
  "priority": "normal"
}
```

#### Get Transaction Status

```bash
GET /api/transfers/{transactionId}
X-API-Key: your-api-key
```

#### Estimate Fees

```bash
POST /api/transfers/estimate-fees
Content-Type: application/json
X-API-Key: your-api-key

{
  "sourceChain": "polkadot",
  "destinationChain": "assetHub",
  "asset": {
    "symbol": "DOT",
    "decimals": 10
  },
  "amount": "1000000000000"
}
```

#### Find Optimal Routes

```bash
POST /api/routes/analyze
Content-Type: application/json
X-API-Key: your-api-key

{
  "sourceChain": "polkadot",
  "destinationChain": "hydration",
  "asset": {
    "symbol": "DOT",
    "decimals": 10
  }
}
```

### Monitoring Endpoints

#### Get System Metrics

```bash
GET /api/monitoring/metrics
X-API-Key: your-api-key
```

#### Get Analytics Data

```bash
GET /api/analytics/overview
X-API-Key: your-api-key
```

## 🔌 WebSocket API

### Connection

```javascript
const socket = io('ws://localhost:3000');

socket.on('connected', (data) => {
  console.log('Connected:', data);
});
```

### Subscribe to Events

```javascript
// Subscribe to all XCM events
socket.emit('subscribe:events', { chains: ['polkadot', 'assetHub'] });

// Subscribe to transaction updates
socket.emit('subscribe:transactions', { transactionIds: ['tx-123'] });

// Subscribe to system metrics
socket.emit('subscribe:metrics');
```

### Event Handling

```javascript
// Transaction events
socket.on('transaction:created', (data) => {
  console.log('New transaction:', data.transaction);
});

socket.on('transaction:completed', (data) => {
  console.log('Transaction completed:', data.transaction);
});

// XCM events
socket.on('xcm:success', (data) => {
  console.log('XCM success:', data.event);
});

// System metrics
socket.on('metrics:update', (data) => {
  console.log('Metrics update:', data.metrics);
});
```

## 🏗️ Architecture

### Core Components

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  API Server     │    │ XCM Orchestrator│    │ Connection Mgr  │
│                 │────│                 │────│                 │
│ • REST API      │    │ • Coordination  │    │ • Chain Conns   │
│ • WebSocket     │    │ • Orchestration │    │ • Health Check  │
│ • Rate Limiting │    │ • Event Routing │    │ • Reconnection  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ Message Builder │    │ Route Optimizer │    │ Fee Estimator   │
│                 │    │                 │    │                 │
│ • XCM Messages  │    │ • Route Finding │    │ • Cost Analysis │
│ • Validation    │    │ • Multi-hop     │    │ • Optimization  │
│ • Formatting    │    │ • Optimization  │    │ • Price Feeds   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ Tx Monitor      │    │ Event Listener  │    │ Notifications   │
│                 │    │                 │    │                 │
│ • Status Track  │    │ • Chain Events  │    │ • Discord       │
│ • Retry Logic   │    │ • XCM Events    │    │ • Slack         │
│ • Correlation   │    │ • Filtering     │    │ • Webhooks      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Data Flow

1. **Request**: API receives transfer request
2. **Validation**: Parameters validated and sanitized
3. **Route Discovery**: Optimal route calculated
4. **Fee Estimation**: Transfer costs estimated
5. **Message Building**: XCM message constructed
6. **Execution**: Transaction submitted to source chain
7. **Monitoring**: Status tracked across chains
8. **Notification**: Updates sent to subscribers

## 🧪 Development

### Project Structure

```
src/
├── api/                 # REST API and WebSocket
│   ├── routes/         # API route handlers
│   ├── middleware/     # Express middleware
│   ├── server.ts       # Express server setup
│   └── websocket.ts    # WebSocket handling
├── core/               # Core orchestration logic
│   ├── ConnectionManager.ts    # Chain connections
│   ├── XCMMessageBuilder.ts   # Message construction
│   ├── TransactionMonitor.ts  # Status tracking
│   ├── FeeEstimator.ts       # Fee calculation
│   ├── RouteOptimizer.ts     # Route optimization
│   ├── EventListener.ts      # Event monitoring
│   ├── NotificationService.ts # Notifications
│   └── XCMOrchestrator.ts    # Main orchestrator
├── types/              # TypeScript type definitions
├── config/             # Configuration files
├── utils/              # Utility functions
└── index.ts           # Application entry point
```

### Scripts

```bash
# Development
npm run dev          # Start with hot reload
npm run build        # Build TypeScript
npm run start        # Start production build

# Testing
npm test            # Run tests
npm run test:watch  # Run tests in watch mode
npm run test:coverage # Generate coverage report

# Code Quality
npm run lint        # Run ESLint
npm run lint:fix    # Fix linting issues
npm run typecheck   # Run TypeScript checks
```

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `development` |
| `PORT` | Server port | `3000` |
| `HOST` | Server host | `localhost` |
| `API_KEY` | API authentication key | Required |
| `LOG_LEVEL` | Logging level | `info` |
| `RATE_LIMIT_WINDOW` | Rate limit window (ms) | `900000` |
| `RATE_LIMIT_MAX_REQUESTS` | Max requests per window | `100` |
| `MONITORING_INTERVAL` | Monitoring interval (ms) | `5000` |
| `ENABLE_AUTO_RETRY` | Enable automatic retries | `true` |

## 🔒 Security

### Authentication
- API key authentication required for all endpoints
- JWT token support for advanced authentication
- Request rate limiting with IP-based tracking

### Best Practices
- Input validation on all endpoints
- Parameterized queries for database operations
- CORS protection with configurable origins
- Security headers via Helmet.js
- Request logging for audit trails

### Recommendations
- Use strong API keys (minimum 32 characters)
- Enable HTTPS in production
- Configure proper CORS origins
- Monitor rate limit violations
- Regular security updates

## 📊 Monitoring

### Health Checks

```bash
GET /health
```

Returns system health including:
- Chain connection status
- Component availability
- Performance metrics
- Uptime information

### Metrics

- **Transaction Volume**: Total transfers processed
- **Success Rate**: Percentage of successful transfers
- **Average Processing Time**: Time from submission to completion
- **Chain Health**: Connection status for all chains
- **Fee Statistics**: Average and median fees

### Alerting

Configure notifications for:
- Chain disconnections
- Failed transactions
- High error rates
- System performance issues

## 🚀 Deployment

### Docker Deployment

```bash
# Build image
docker build -t xcm-orchestrator .

# Run container
docker run -d \
  --name xcm-orchestrator \
  -p 3000:3000 \
  --env-file .env \
  --restart unless-stopped \
  xcm-orchestrator
```

### Docker Compose

```yaml
version: '3.8'
services:
  xcm-orchestrator:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
    env_file:
      - .env
    restart: unless-stopped
    volumes:
      - ./logs:/app/logs
```

### Production Considerations

- Use process managers (PM2, systemd)
- Configure log rotation
- Set up monitoring (Prometheus, DataDog)
- Enable health check endpoints
- Configure load balancing
- Implement backup strategies

## 🤝 Contributing

### Development Setup

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

### Code Standards

- Follow TypeScript best practices
- Maintain test coverage >80%
- Use conventional commit messages
- Document public APIs
- Follow existing code style

### Testing

```bash
# Unit tests
npm run test

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e

# Coverage report
npm run test:coverage
```

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

### Documentation
- [API Reference](docs/api.md)
- [Architecture Guide](docs/architecture.md)
- [Deployment Guide](docs/deployment.md)

### Community
- [GitHub Issues](https://github.com/your-org/xcm-orchestrator/issues)
- [Discord Community](https://discord.gg/your-channel)
- [Telegram Group](https://t.me/your-group)

### Commercial Support
For commercial support and custom development, contact: support@your-domain.com

---

**Built with ❤️ by the PolyFlow AI Team**