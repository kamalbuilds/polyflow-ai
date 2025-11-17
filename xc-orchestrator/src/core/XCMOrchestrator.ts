import { EventEmitter } from 'eventemitter3';
import { ConnectionManager } from './ConnectionManager';
import { XCMMessageBuilder } from './XCMMessageBuilder';
import { TransactionMonitor } from './TransactionMonitor';
import { FeeEstimator } from './FeeEstimator';
import { RouteOptimizer } from './RouteOptimizer';
import { EventListener } from './EventListener';
import { NotificationService } from './NotificationService';
import {
  XCMTransferParams,
  XCMTransaction,
  XCMRoute,
  RouteAnalysis,
  FeeEstimation,
  OrchestrationConfig,
  MonitoringMetrics,
  AnalyticsData,
  NotificationConfig,
  TransactionStatus
} from '../types';
import { logger, performanceLogger, xcmLogger, auditLogger } from '../utils/logger';
import { BN } from '@polkadot/util';
import cron from 'node-cron';

export class XCMOrchestrator extends EventEmitter {
  private connectionManager: ConnectionManager;
  private messageBuilder: XCMMessageBuilder;
  private transactionMonitor: TransactionMonitor;
  private feeEstimator: FeeEstimator;
  private routeOptimizer: RouteOptimizer;
  private eventListener: EventListener;
  private notificationService: NotificationService;

  private config: OrchestrationConfig;
  private isInitialized = false;
  private isRunning = false;
  private maintenanceJobs: Map<string, any> = new Map();

  // Statistics
  private stats = {
    totalTransactions: 0,
    successfulTransactions: 0,
    failedTransactions: 0,
    totalVolume: new BN(0),
    startTime: new Date(),
    uniqueUsers: new Set<string>()
  };

  constructor(config?: Partial<OrchestrationConfig>) {
    super();

    this.config = {
      maxConcurrentTransactions: 10,
      enableAutoRetry: true,
      enableFeeOptimization: true,
      enableRouteOptimization: true,
      monitoringInterval: 5000,
      cacheTimeout: 300000, // 5 minutes
      notifications: {},
      ...config
    };

    // Initialize core components
    this.connectionManager = new ConnectionManager();
    this.messageBuilder = new XCMMessageBuilder(this.connectionManager);
    this.transactionMonitor = new TransactionMonitor(this.connectionManager);
    this.feeEstimator = new FeeEstimator(this.connectionManager);
    this.routeOptimizer = new RouteOptimizer(this.connectionManager, this.feeEstimator);
    this.eventListener = new EventListener(this.connectionManager, this.config.notifications);
    this.notificationService = new NotificationService(this.config.notifications);

    this.setupEventHandlers();
  }

  /**
   * Initialize the XCM Orchestrator
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      logger.warn('XCM Orchestrator already initialized');
      return;
    }

    logger.info('Initializing XCM Orchestrator', { config: this.config });

    try {
      await performanceLogger.measureAsync('orchestrator-init', async () => {
        // Initialize all components
        await this.connectionManager.initializeConnections();
        await this.messageBuilder.initialize();

        // Start monitoring and event listening
        this.transactionMonitor.startMonitoring(this.config.monitoringInterval);
        await this.eventListener.startListening();

        // Update price feeds
        await this.feeEstimator.updatePriceFeeds();

        // Setup maintenance jobs
        this.setupMaintenanceJobs();

        this.isInitialized = true;
        this.isRunning = true;

        auditLogger.systemEvent('orchestrator-initialized', {
          config: this.config
        });
      });

      logger.info('XCM Orchestrator initialized successfully');
      this.emit('initialized');
    } catch (error) {
      logger.error('Failed to initialize XCM Orchestrator', { error });
      throw error;
    }
  }

  /**
   * Shutdown the XCM Orchestrator
   */
  async shutdown(): Promise<void> {
    if (!this.isInitialized) {
      return;
    }

    logger.info('Shutting down XCM Orchestrator');

    try {
      this.isRunning = false;

      // Stop monitoring and event listening
      this.transactionMonitor.stopMonitoring();
      await this.eventListener.stopListening();

      // Stop maintenance jobs
      this.stopMaintenanceJobs();

      // Disconnect from all chains
      await this.connectionManager.disconnectAll();

      this.isInitialized = false;

      auditLogger.systemEvent('orchestrator-shutdown');
      logger.info('XCM Orchestrator shutdown complete');
      this.emit('shutdown');
    } catch (error) {
      logger.error('Error during shutdown', { error });
      throw error;
    }
  }

  /**
   * Execute XCM transfer
   */
  async executeTransfer(params: XCMTransferParams): Promise<string> {
    if (!this.isInitialized) {
      throw new Error('Orchestrator not initialized');
    }

    logger.info('Executing XCM transfer', {
      sourceChain: params.sourceChain,
      destinationChain: params.destinationChain,
      asset: params.asset.symbol,
      amount: params.amount.toString()
    });

    try {
      return await performanceLogger.measureAsync('xcm-transfer', async () => {
        // Validate parameters
        const validation = this.messageBuilder.validateTransferParams(params);
        if (!validation.isValid) {
          throw new Error(`Invalid transfer parameters: ${validation.errors.join(', ')}`);
        }

        // Find optimal route if not provided
        if (!params.route && this.config.enableRouteOptimization) {
          const routeAnalysis = await this.routeOptimizer.findOptimalRoutes(params);
          params.route = routeAnalysis.bestRoute;
        }

        // Estimate fees if not provided
        if (!params.maxFee && this.config.enableFeeOptimization) {
          const feeEstimation = await this.feeEstimator.estimateFees(params);
          params.maxFee = feeEstimation.totalFee.muln(120).divn(100); // 20% buffer
        }

        // Build XCM message
        const transaction = await this.messageBuilder.buildTransferMessage(params);

        // Add to monitoring
        this.transactionMonitor.addTransaction(transaction);

        // Update statistics
        this.updateStats(params);

        // Log audit trail
        auditLogger.userAction(params.sender, 'xcm-transfer-initiated', {
          transactionId: transaction.id,
          sourceChain: params.sourceChain,
          destinationChain: params.destinationChain,
          asset: params.asset.symbol,
          amount: params.amount.toString()
        });

        xcmLogger.transaction(transaction.id, 'created', {
          route: params.route?.path,
          estimatedFee: params.maxFee?.toString()
        });

        // Send notification
        await this.notificationService.notifyTransaction(
          transaction,
          'XCM transfer initiated and being monitored'
        );

        this.emit('transferExecuted', transaction);

        return transaction.id;
      });
    } catch (error) {
      logger.error('Failed to execute XCM transfer', { error, params });
      throw error;
    }
  }

  /**
   * Get transaction status
   */
  getTransactionStatus(transactionId: string): XCMTransaction | undefined {
    return this.transactionMonitor.getTransactionStatus(transactionId);
  }

  /**
   * Get all active transactions
   */
  getActiveTransactions(): XCMTransaction[] {
    return this.transactionMonitor.getActiveTransactions();
  }

  /**
   * Estimate fees for a transfer
   */
  async estimateFees(params: XCMTransferParams): Promise<FeeEstimation> {
    return this.feeEstimator.estimateFees(params);
  }

  /**
   * Find optimal routes
   */
  async findOptimalRoutes(params: XCMTransferParams): Promise<RouteAnalysis> {
    return this.routeOptimizer.findOptimalRoutes(params);
  }

  /**
   * Get route recommendations
   */
  async getRouteRecommendations(
    asset: any,
    sourceChain: string,
    destinationChain: string
  ) {
    return this.routeOptimizer.getRouteRecommendations(asset, sourceChain, destinationChain);
  }

  /**
   * Check route availability
   */
  async checkRouteAvailability(sourceChain: string, destinationChain: string) {
    return this.routeOptimizer.checkRouteAvailability(sourceChain, destinationChain);
  }

  /**
   * Get monitoring metrics
   */
  getMetrics(): MonitoringMetrics {
    const transactionMetrics = this.transactionMonitor.getMetrics();

    return {
      ...transactionMetrics,
      totalVolume: this.stats.totalVolume,
      uniqueUsers: this.stats.uniqueUsers.size,
      lastUpdated: new Date()
    };
  }

  /**
   * Get analytics data
   */
  getAnalytics(): AnalyticsData {
    const now = new Date();
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // This would typically query a database for historical data
    // For now, returning mock data structure
    return {
      transactionVolume: {
        daily: { [now.toISOString().split('T')[0]]: this.stats.totalTransactions },
        weekly: { [weekAgo.toISOString().split('T')[0]]: this.stats.totalTransactions },
        monthly: { [monthAgo.toISOString().split('T')[0]]: this.stats.totalTransactions }
      },
      popularRoutes: [
        {
          route: 'polkadot-assetHub',
          count: Math.floor(this.stats.totalTransactions * 0.4),
          volume: this.stats.totalVolume.muln(40).divn(100)
        }
      ],
      feeAnalysis: {
        average: new BN('5000000000'), // Mock average fee
        median: new BN('4500000000'), // Mock median fee
        trends: [
          {
            date: now.toISOString().split('T')[0],
            averageFee: new BN('5000000000')
          }
        ]
      },
      performanceMetrics: {
        averageExecutionTime: 45000, // 45 seconds average
        successRate: this.stats.totalTransactions > 0 ?
          this.stats.successfulTransactions / this.stats.totalTransactions : 0,
        errorRate: this.stats.totalTransactions > 0 ?
          this.stats.failedTransactions / this.stats.totalTransactions : 0
      }
    };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<OrchestrationConfig>): void {
    this.config = { ...this.config, ...newConfig };

    // Update notification configuration
    if (newConfig.notifications) {
      this.notificationService.updateConfig(newConfig.notifications);
    }

    auditLogger.systemEvent('config-updated', { config: this.config });
    logger.info('Configuration updated', { config: this.config });
  }

  /**
   * Get health status
   */
  getHealthStatus(): {
    overall: 'healthy' | 'degraded' | 'unhealthy';
    components: Record<string, boolean>;
    uptime: number;
    version: string;
  } {
    const chainHealth = this.connectionManager.getHealthStatus();
    const connectedChains = Object.values(chainHealth).filter(Boolean).length;
    const totalChains = Object.keys(chainHealth).length;

    let overall: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

    if (connectedChains === 0) {
      overall = 'unhealthy';
    } else if (connectedChains < totalChains * 0.8) {
      overall = 'degraded';
    }

    return {
      overall,
      components: {
        connectionManager: connectedChains > 0,
        transactionMonitor: this.transactionMonitor !== null,
        eventListener: this.eventListener !== null,
        feeEstimator: this.feeEstimator !== null,
        routeOptimizer: this.routeOptimizer !== null,
        ...chainHealth
      },
      uptime: Date.now() - this.stats.startTime.getTime(),
      version: process.env.npm_package_version || '1.0.0'
    };
  }

  /**
   * Setup event handlers
   */
  private setupEventHandlers(): void {
    // Transaction monitor events
    this.transactionMonitor.on('transactionSuccess', (transaction: XCMTransaction) => {
      this.stats.successfulTransactions++;
      xcmLogger.transaction(transaction.id, 'success');
      this.notificationService.notifyTransaction(transaction, 'XCM transfer completed successfully');
      this.emit('transactionCompleted', transaction);
    });

    this.transactionMonitor.on('transactionFailed', (transaction: XCMTransaction) => {
      this.stats.failedTransactions++;
      xcmLogger.transaction(transaction.id, 'failed', { error: transaction.error });
      this.notificationService.notifyTransaction(transaction, 'XCM transfer failed');
      this.emit('transactionFailed', transaction);
    });

    // Connection manager events
    this.connectionManager.on('chainConnected', (chainId: string) => {
      logger.info(`Chain reconnected: ${chainId}`);
      this.notificationService.sendAlert(
        'Chain Connected',
        `Successfully reconnected to ${chainId}`,
        'medium'
      );
    });

    this.connectionManager.on('chainDisconnected', (chainId: string) => {
      logger.warn(`Chain disconnected: ${chainId}`);
      this.notificationService.sendAlert(
        'Chain Disconnected',
        `Lost connection to ${chainId}`,
        'high'
      );
    });

    // Event listener events
    this.eventListener.on('xcmFailure', (event) => {
      logger.warn('XCM failure detected', { event });
      this.notificationService.sendAlert(
        'XCM Failure Detected',
        `XCM operation failed on ${event.chainId}: ${event.method}`,
        'high',
        event
      );
    });

    this.eventListener.on('xcmAssetsTrapped', (event) => {
      logger.error('XCM assets trapped', { event });
      this.notificationService.sendAlert(
        'XCM Assets Trapped',
        `Assets trapped on ${event.chainId} - manual intervention may be required`,
        'critical',
        event
      );
    });
  }

  /**
   * Setup maintenance jobs
   */
  private setupMaintenanceJobs(): void {
    // Clear expired caches every 5 minutes
    const cacheCleanup = cron.schedule('*/5 * * * *', () => {
      this.feeEstimator.clearExpiredCache();
      this.routeOptimizer.clearExpiredCache();
      logger.debug('Cache cleanup completed');
    }, { scheduled: false });

    // Update price feeds every 15 minutes
    const priceUpdate = cron.schedule('*/15 * * * *', async () => {
      try {
        await this.feeEstimator.updatePriceFeeds();
        logger.debug('Price feeds updated');
      } catch (error) {
        logger.error('Failed to update price feeds', { error });
      }
    }, { scheduled: false });

    // Health check every minute
    const healthCheck = cron.schedule('* * * * *', () => {
      const health = this.getHealthStatus();
      if (health.overall === 'unhealthy') {
        this.notificationService.sendAlert(
          'System Health Alert',
          'XCM Orchestrator is in an unhealthy state',
          'critical',
          health
        );
      }
    }, { scheduled: false });

    // Start all jobs
    cacheCleanup.start();
    priceUpdate.start();
    healthCheck.start();

    this.maintenanceJobs.set('cacheCleanup', cacheCleanup);
    this.maintenanceJobs.set('priceUpdate', priceUpdate);
    this.maintenanceJobs.set('healthCheck', healthCheck);

    logger.info('Maintenance jobs started');
  }

  /**
   * Stop maintenance jobs
   */
  private stopMaintenanceJobs(): void {
    for (const [name, job] of this.maintenanceJobs.entries()) {
      try {
        job.stop();
        logger.debug(`Stopped maintenance job: ${name}`);
      } catch (error) {
        logger.error(`Failed to stop maintenance job: ${name}`, { error });
      }
    }

    this.maintenanceJobs.clear();
    logger.info('Maintenance jobs stopped');
  }

  /**
   * Update internal statistics
   */
  private updateStats(params: XCMTransferParams): void {
    this.stats.totalTransactions++;
    this.stats.totalVolume = this.stats.totalVolume.add(params.amount);
    this.stats.uniqueUsers.add(params.sender);
  }

  /**
   * Test all notification channels
   */
  async testNotifications(): Promise<Record<string, boolean>> {
    return this.notificationService.testNotifications();
  }

  /**
   * Force refresh of all connections
   */
  async refreshConnections(): Promise<void> {
    logger.info('Refreshing all chain connections');

    const connectedChains = this.connectionManager.getConnectedChains();

    for (const chainId of connectedChains) {
      try {
        await this.connectionManager.restartConnection(chainId);
        logger.info(`Connection refreshed: ${chainId}`);
      } catch (error) {
        logger.error(`Failed to refresh connection: ${chainId}`, { error });
      }
    }
  }
}