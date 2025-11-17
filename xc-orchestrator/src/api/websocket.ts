import { Server as SocketIOServer, Socket } from 'socket.io';
import { XCMOrchestrator } from '../core/XCMOrchestrator';
import { logger } from '../utils/logger';
import { XCMTransaction, ChainEvent, MonitoringMetrics } from '../types';

interface ClientSubscription {
  events: boolean;
  transactions: boolean;
  metrics: boolean;
  chains: string[];
  transactionIds: string[];
}

export class WebSocketHandler {
  private io: SocketIOServer;
  private orchestrator: XCMOrchestrator;
  private clients = new Map<string, ClientSubscription>();
  private metricsInterval: NodeJS.Timeout | null = null;

  constructor(io: SocketIOServer, orchestrator: XCMOrchestrator) {
    this.io = io;
    this.orchestrator = orchestrator;
  }

  /**
   * Initialize WebSocket handling
   */
  initialize(): void {
    this.io.on('connection', this.handleConnection.bind(this));
    this.setupOrchestratorListeners();
    this.startMetricsBroadcast();

    logger.info('WebSocket handler initialized');
  }

  /**
   * Handle new client connection
   */
  private handleConnection(socket: Socket): void {
    const clientId = socket.id;
    logger.info('Client connected', { clientId, address: socket.handshake.address });

    // Initialize client subscription
    this.clients.set(clientId, {
      events: false,
      transactions: false,
      metrics: false,
      chains: [],
      transactionIds: []
    });

    // Send initial connection confirmation
    socket.emit('connected', {
      clientId,
      timestamp: new Date(),
      serverVersion: process.env.npm_package_version || '1.0.0'
    });

    // Setup event handlers
    this.setupSocketHandlers(socket);

    // Handle disconnection
    socket.on('disconnect', () => {
      logger.info('Client disconnected', { clientId });
      this.clients.delete(clientId);
    });
  }

  /**
   * Setup socket event handlers
   */
  private setupSocketHandlers(socket: Socket): void {
    const clientId = socket.id;

    // Subscribe to events
    socket.on('subscribe:events', (data: { chains?: string[] }) => {
      const subscription = this.clients.get(clientId);
      if (subscription) {
        subscription.events = true;
        subscription.chains = data.chains || [];
        this.clients.set(clientId, subscription);

        socket.emit('subscription:confirmed', {
          type: 'events',
          chains: data.chains || 'all'
        });

        logger.debug('Client subscribed to events', {
          clientId,
          chains: data.chains || 'all'
        });
      }
    });

    // Subscribe to transactions
    socket.on('subscribe:transactions', (data: { transactionIds?: string[] }) => {
      const subscription = this.clients.get(clientId);
      if (subscription) {
        subscription.transactions = true;
        subscription.transactionIds = data.transactionIds || [];
        this.clients.set(clientId, subscription);

        socket.emit('subscription:confirmed', {
          type: 'transactions',
          transactionIds: data.transactionIds || 'all'
        });

        logger.debug('Client subscribed to transactions', {
          clientId,
          transactionIds: data.transactionIds || 'all'
        });
      }
    });

    // Subscribe to metrics
    socket.on('subscribe:metrics', () => {
      const subscription = this.clients.get(clientId);
      if (subscription) {
        subscription.metrics = true;
        this.clients.set(clientId, subscription);

        socket.emit('subscription:confirmed', {
          type: 'metrics'
        });

        // Send current metrics immediately
        const metrics = this.orchestrator.getMetrics();
        socket.emit('metrics:update', {
          metrics,
          timestamp: new Date()
        });

        logger.debug('Client subscribed to metrics', { clientId });
      }
    });

    // Unsubscribe from events
    socket.on('unsubscribe', (data: { type: string }) => {
      const subscription = this.clients.get(clientId);
      if (subscription) {
        switch (data.type) {
          case 'events':
            subscription.events = false;
            subscription.chains = [];
            break;
          case 'transactions':
            subscription.transactions = false;
            subscription.transactionIds = [];
            break;
          case 'metrics':
            subscription.metrics = false;
            break;
        }

        this.clients.set(clientId, subscription);
        socket.emit('unsubscription:confirmed', { type: data.type });

        logger.debug('Client unsubscribed', { clientId, type: data.type });
      }
    });

    // Get current status
    socket.on('get:status', () => {
      const health = this.orchestrator.getHealthStatus();
      const metrics = this.orchestrator.getMetrics();
      const activeTransactions = this.orchestrator.getActiveTransactions();

      socket.emit('status:response', {
        health,
        metrics,
        activeTransactions: activeTransactions.length,
        timestamp: new Date()
      });
    });

    // Get transaction details
    socket.on('get:transaction', (data: { transactionId: string }) => {
      const transaction = this.orchestrator.getTransactionStatus(data.transactionId);

      if (transaction) {
        socket.emit('transaction:details', {
          transaction: this.formatTransactionForClient(transaction),
          timestamp: new Date()
        });
      } else {
        socket.emit('error', {
          message: 'Transaction not found',
          transactionId: data.transactionId
        });
      }
    });

    // Get analytics data
    socket.on('get:analytics', () => {
      const analytics = this.orchestrator.getAnalytics();
      socket.emit('analytics:response', {
        analytics,
        timestamp: new Date()
      });
    });

    // Test notification
    socket.on('test:notification', async () => {
      try {
        const results = await this.orchestrator.testNotifications();
        socket.emit('test:notification:response', {
          success: true,
          results,
          timestamp: new Date()
        });
      } catch (error) {
        socket.emit('test:notification:response', {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date()
        });
      }
    });
  }

  /**
   * Setup orchestrator event listeners
   */
  private setupOrchestratorListeners(): void {
    // Transaction events
    this.orchestrator.on('transferExecuted', (transaction: XCMTransaction) => {
      this.broadcastToSubscribers('transactions', 'transaction:created', {
        transaction: this.formatTransactionForClient(transaction),
        timestamp: new Date()
      }, (sub) => this.shouldReceiveTransaction(sub, transaction.id));
    });

    this.orchestrator.on('transactionCompleted', (transaction: XCMTransaction) => {
      this.broadcastToSubscribers('transactions', 'transaction:completed', {
        transaction: this.formatTransactionForClient(transaction),
        timestamp: new Date()
      }, (sub) => this.shouldReceiveTransaction(sub, transaction.id));
    });

    this.orchestrator.on('transactionFailed', (transaction: XCMTransaction) => {
      this.broadcastToSubscribers('transactions', 'transaction:failed', {
        transaction: this.formatTransactionForClient(transaction),
        timestamp: new Date()
      }, (sub) => this.shouldReceiveTransaction(sub, transaction.id));
    });

    // Setup event listener forwarding
    this.setupEventListenerForwarding();
  }

  /**
   * Setup event listener forwarding
   */
  private setupEventListenerForwarding(): void {
    // We need to access the event listener from the orchestrator
    // For now, we'll create a simple event relay
    this.orchestrator.on('chainEvent', (event: ChainEvent) => {
      this.broadcastToSubscribers('events', 'chain:event', {
        event,
        timestamp: new Date()
      }, (sub) => this.shouldReceiveEvent(sub, event.chainId));
    });

    this.orchestrator.on('xcmSuccess', (event: ChainEvent) => {
      this.broadcastToSubscribers('events', 'xcm:success', {
        event,
        timestamp: new Date()
      }, (sub) => this.shouldReceiveEvent(sub, event.chainId));
    });

    this.orchestrator.on('xcmFailure', (event: ChainEvent) => {
      this.broadcastToSubscribers('events', 'xcm:failure', {
        event,
        timestamp: new Date()
      }, (sub) => this.shouldReceiveEvent(sub, event.chainId));
    });
  }

  /**
   * Start metrics broadcast
   */
  private startMetricsBroadcast(): void {
    this.metricsInterval = setInterval(() => {
      const metrics = this.orchestrator.getMetrics();

      this.broadcastToSubscribers('metrics', 'metrics:update', {
        metrics,
        timestamp: new Date()
      }, (sub) => sub.metrics);
    }, 5000); // Broadcast every 5 seconds
  }

  /**
   * Stop metrics broadcast
   */
  private stopMetricsBroadcast(): void {
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
      this.metricsInterval = null;
    }
  }

  /**
   * Broadcast to subscribers with filtering
   */
  private broadcastToSubscribers(
    subscriptionType: keyof ClientSubscription,
    event: string,
    data: any,
    filter?: (subscription: ClientSubscription) => boolean
  ): void {
    for (const [clientId, subscription] of this.clients.entries()) {
      if (subscription[subscriptionType] && (!filter || filter(subscription))) {
        this.io.to(clientId).emit(event, data);
      }
    }
  }

  /**
   * Check if client should receive transaction update
   */
  private shouldReceiveTransaction(subscription: ClientSubscription, transactionId: string): boolean {
    return subscription.transactions && (
      subscription.transactionIds.length === 0 ||
      subscription.transactionIds.includes(transactionId)
    );
  }

  /**
   * Check if client should receive event
   */
  private shouldReceiveEvent(subscription: ClientSubscription, chainId: string): boolean {
    return subscription.events && (
      subscription.chains.length === 0 ||
      subscription.chains.includes(chainId)
    );
  }

  /**
   * Format transaction for client transmission
   */
  private formatTransactionForClient(transaction: XCMTransaction): any {
    return {
      id: transaction.id,
      status: transaction.status,
      params: {
        sourceChain: transaction.params.sourceChain,
        destinationChain: transaction.params.destinationChain,
        asset: transaction.params.asset,
        amount: transaction.params.amount.toString(),
        sender: transaction.params.sender,
        recipient: transaction.params.recipient,
        priority: transaction.params.priority
      },
      sourceBlockHash: transaction.sourceBlockHash,
      sourceBlockNumber: transaction.sourceBlockNumber,
      destinationBlockHash: transaction.destinationBlockHash,
      destinationBlockNumber: transaction.destinationBlockNumber,
      actualFee: transaction.actualFee?.toString(),
      error: transaction.error,
      retryCount: transaction.retryCount,
      createdAt: transaction.createdAt,
      updatedAt: transaction.updatedAt,
      completedAt: transaction.completedAt
    };
  }

  /**
   * Get connected clients count
   */
  getConnectedClientsCount(): number {
    return this.clients.size;
  }

  /**
   * Get subscription statistics
   */
  getSubscriptionStats(): {
    totalClients: number;
    eventsSubscribers: number;
    transactionSubscribers: number;
    metricsSubscribers: number;
  } {
    const stats = {
      totalClients: this.clients.size,
      eventsSubscribers: 0,
      transactionSubscribers: 0,
      metricsSubscribers: 0
    };

    for (const subscription of this.clients.values()) {
      if (subscription.events) stats.eventsSubscribers++;
      if (subscription.transactions) stats.transactionSubscribers++;
      if (subscription.metrics) stats.metricsSubscribers++;
    }

    return stats;
  }

  /**
   * Send notification to all clients
   */
  broadcastNotification(type: 'info' | 'warning' | 'error', title: string, message: string, data?: any): void {
    this.io.emit('notification', {
      type,
      title,
      message,
      data,
      timestamp: new Date()
    });
  }

  /**
   * Shutdown WebSocket handler
   */
  shutdown(): void {
    this.stopMetricsBroadcast();
    this.clients.clear();

    logger.info('WebSocket handler shutdown');
  }
}