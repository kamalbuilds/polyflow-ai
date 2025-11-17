import { ApiPromise, WsProvider } from '@polkadot/api';
import { logger } from '../utils/logger';
import { ChainConfig, CHAIN_CONFIGS } from '../config/chains';
import { EventEmitter } from 'eventemitter3';

export class ConnectionManager extends EventEmitter {
  private connections: Map<string, ApiPromise> = new Map();
  private providers: Map<string, WsProvider> = new Map();
  private reconnectAttempts: Map<string, number> = new Map();
  private maxReconnectAttempts = 5;
  private reconnectDelay = 5000;

  constructor() {
    super();
  }

  /**
   * Initialize connections to all configured chains
   */
  async initializeConnections(): Promise<void> {
    logger.info('Initializing connections to all chains');

    const connectionPromises = Object.values(CHAIN_CONFIGS).map(
      async (config) => this.connectToChain(config)
    );

    try {
      await Promise.allSettled(connectionPromises);
      logger.info('All chain connections initialized');
    } catch (error) {
      logger.error('Failed to initialize some chain connections', { error });
    }
  }

  /**
   * Connect to a specific chain
   */
  async connectToChain(config: ChainConfig): Promise<ApiPromise> {
    const existingConnection = this.connections.get(config.id);
    if (existingConnection && existingConnection.isConnected) {
      return existingConnection;
    }

    logger.info(`Connecting to ${config.name}`, {
      endpoint: config.wsEndpoint,
      chainId: config.id
    });

    try {
      const provider = new WsProvider(config.wsEndpoint, 1000);
      this.providers.set(config.id, provider);

      // Set up provider event handlers
      provider.on('connected', () => {
        logger.info(`WebSocket connected to ${config.name}`);
        this.reconnectAttempts.set(config.id, 0);
        this.emit('chainConnected', config.id);
      });

      provider.on('disconnected', () => {
        logger.warn(`WebSocket disconnected from ${config.name}`);
        this.emit('chainDisconnected', config.id);
        this.handleReconnect(config);
      });

      provider.on('error', (error) => {
        logger.error(`WebSocket error for ${config.name}`, { error });
        this.emit('chainError', config.id, error);
      });

      const api = await ApiPromise.create({ provider });

      // Set up API event handlers
      api.on('ready', () => {
        logger.info(`API ready for ${config.name}`);
        this.emit('apiReady', config.id);
      });

      api.on('error', (error) => {
        logger.error(`API error for ${config.name}`, { error });
        this.emit('apiError', config.id, error);
      });

      this.connections.set(config.id, api);
      logger.info(`Successfully connected to ${config.name}`);

      return api;
    } catch (error) {
      logger.error(`Failed to connect to ${config.name}`, { error });
      throw error;
    }
  }

  /**
   * Get API connection for a specific chain
   */
  getConnection(chainId: string): ApiPromise | undefined {
    const connection = this.connections.get(chainId);
    if (!connection || !connection.isConnected) {
      logger.warn(`No active connection for chain: ${chainId}`);
      return undefined;
    }
    return connection;
  }

  /**
   * Check if a chain is connected
   */
  isConnected(chainId: string): boolean {
    const connection = this.connections.get(chainId);
    return !!connection && connection.isConnected;
  }

  /**
   * Get all connected chains
   */
  getConnectedChains(): string[] {
    return Array.from(this.connections.entries())
      .filter(([_, api]) => api.isConnected)
      .map(([chainId]) => chainId);
  }

  /**
   * Handle reconnection logic
   */
  private async handleReconnect(config: ChainConfig): Promise<void> {
    const currentAttempts = this.reconnectAttempts.get(config.id) || 0;

    if (currentAttempts >= this.maxReconnectAttempts) {
      logger.error(`Max reconnect attempts reached for ${config.name}`);
      this.emit('maxReconnectAttempts', config.id);
      return;
    }

    this.reconnectAttempts.set(config.id, currentAttempts + 1);

    logger.info(`Attempting to reconnect to ${config.name}`, {
      attempt: currentAttempts + 1,
      maxAttempts: this.maxReconnectAttempts
    });

    setTimeout(async () => {
      try {
        await this.connectToChain(config);
      } catch (error) {
        logger.error(`Reconnection failed for ${config.name}`, { error });
      }
    }, this.reconnectDelay * (currentAttempts + 1));
  }

  /**
   * Disconnect from a specific chain
   */
  async disconnectFromChain(chainId: string): Promise<void> {
    const connection = this.connections.get(chainId);
    const provider = this.providers.get(chainId);

    if (connection) {
      await connection.disconnect();
      this.connections.delete(chainId);
    }

    if (provider) {
      await provider.disconnect();
      this.providers.delete(chainId);
    }

    this.reconnectAttempts.delete(chainId);
    logger.info(`Disconnected from chain: ${chainId}`);
  }

  /**
   * Disconnect from all chains
   */
  async disconnectAll(): Promise<void> {
    logger.info('Disconnecting from all chains');

    const disconnectPromises = Array.from(this.connections.keys()).map(
      chainId => this.disconnectFromChain(chainId)
    );

    await Promise.allSettled(disconnectPromises);
    logger.info('All chains disconnected');
  }

  /**
   * Get connection health status
   */
  getHealthStatus(): Record<string, boolean> {
    const status: Record<string, boolean> = {};

    Object.keys(CHAIN_CONFIGS).forEach(chainId => {
      status[chainId] = this.isConnected(chainId);
    });

    return status;
  }

  /**
   * Restart connection for a specific chain
   */
  async restartConnection(chainId: string): Promise<void> {
    const config = CHAIN_CONFIGS[chainId];
    if (!config) {
      throw new Error(`Chain configuration not found: ${chainId}`);
    }

    await this.disconnectFromChain(chainId);
    await this.connectToChain(config);
  }
}