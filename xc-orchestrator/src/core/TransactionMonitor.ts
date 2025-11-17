import { ApiPromise } from '@polkadot/api';
import { EventEmitter } from 'eventemitter3';
import { ConnectionManager } from './ConnectionManager';
import {
  XCMTransaction,
  TransactionStatus,
  ChainEvent,
  MonitoringMetrics
} from '../types';
import { logger } from '../utils/logger';
import { BN } from '@polkadot/util';

export class TransactionMonitor extends EventEmitter {
  private connectionManager: ConnectionManager;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private activeTransactions = new Map<string, XCMTransaction>();
  private completedTransactions = new Map<string, XCMTransaction>();
  private retryQueue: XCMTransaction[] = [];
  private metrics: MonitoringMetrics = this.initializeMetrics();

  constructor(connectionManager: ConnectionManager) {
    super();
    this.connectionManager = connectionManager;
  }

  /**
   * Start monitoring transactions
   */
  startMonitoring(intervalMs: number = 5000): void {
    if (this.monitoringInterval) {
      return;
    }

    logger.info('Starting transaction monitoring', { intervalMs });

    this.monitoringInterval = setInterval(() => {
      this.checkTransactions();
      this.processRetryQueue();
      this.updateMetrics();
    }, intervalMs);

    // Set up event listeners for all connected chains
    this.setupChainEventListeners();
  }

  /**
   * Stop monitoring transactions
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      logger.info('Transaction monitoring stopped');
    }
  }

  /**
   * Add transaction to monitoring queue
   */
  addTransaction(transaction: XCMTransaction): void {
    this.activeTransactions.set(transaction.id, transaction);
    logger.info('Transaction added to monitoring', {
      transactionId: transaction.id,
      sourceChain: transaction.params.sourceChain,
      destinationChain: transaction.params.destinationChain
    });

    this.emit('transactionAdded', transaction);
  }

  /**
   * Get transaction status
   */
  getTransactionStatus(transactionId: string): XCMTransaction | undefined {
    return this.activeTransactions.get(transactionId) ||
           this.completedTransactions.get(transactionId);
  }

  /**
   * Get all active transactions
   */
  getActiveTransactions(): XCMTransaction[] {
    return Array.from(this.activeTransactions.values());
  }

  /**
   * Get monitoring metrics
   */
  getMetrics(): MonitoringMetrics {
    return { ...this.metrics };
  }

  /**
   * Check all active transactions
   */
  private async checkTransactions(): Promise<void> {
    const transactions = Array.from(this.activeTransactions.values());

    for (const transaction of transactions) {
      try {
        await this.checkTransaction(transaction);
      } catch (error) {
        logger.error('Error checking transaction', {
          transactionId: transaction.id,
          error
        });
      }
    }
  }

  /**
   * Check individual transaction status
   */
  private async checkTransaction(transaction: XCMTransaction): Promise<void> {
    const sourceApi = this.connectionManager.getConnection(transaction.params.sourceChain);

    if (!sourceApi || !transaction.extrinsic) {
      return;
    }

    try {
      // Check if transaction is in a block
      if (transaction.status === TransactionStatus.SUBMITTED) {
        const blockHash = await this.findTransactionInBlocks(
          sourceApi,
          transaction.extrinsic.hash.toHex()
        );

        if (blockHash) {
          transaction.sourceBlockHash = blockHash;
          transaction.status = TransactionStatus.IN_BLOCK;
          transaction.updatedAt = new Date();
          this.emit('transactionInBlock', transaction);
        }
      }

      // Check if transaction is finalized
      if (transaction.status === TransactionStatus.IN_BLOCK && transaction.sourceBlockHash) {
        const isFinalized = await this.isBlockFinalized(sourceApi, transaction.sourceBlockHash);

        if (isFinalized) {
          transaction.status = TransactionStatus.FINALIZED;
          transaction.updatedAt = new Date();
          this.emit('transactionFinalized', transaction);

          // Check destination chain for completion
          await this.checkDestinationChain(transaction);
        }
      }

      // Check for timeouts
      this.checkTransactionTimeout(transaction);

    } catch (error) {
      logger.error('Error checking transaction status', {
        transactionId: transaction.id,
        error
      });

      if (transaction.retryCount < 3) {
        this.scheduleRetry(transaction);
      } else {
        this.markTransactionFailed(transaction, error);
      }
    }
  }

  /**
   * Find transaction in recent blocks
   */
  private async findTransactionInBlocks(
    api: ApiPromise,
    extrinsicHash: string
  ): Promise<string | null> {
    try {
      const latestHeader = await api.rpc.chain.getHeader();
      const latestBlockNumber = latestHeader.number.toNumber();

      // Search last 10 blocks
      for (let i = 0; i < 10; i++) {
        const blockNumber = latestBlockNumber - i;
        if (blockNumber < 0) break;

        const blockHash = await api.rpc.chain.getBlockHash(blockNumber);
        const block = await api.rpc.chain.getBlock(blockHash);

        const foundExtrinsic = block.block.extrinsics.find(
          ext => ext.hash.toHex() === extrinsicHash
        );

        if (foundExtrinsic) {
          return blockHash.toHex();
        }
      }
    } catch (error) {
      logger.error('Error searching for transaction in blocks', { error });
    }

    return null;
  }

  /**
   * Check if block is finalized
   */
  private async isBlockFinalized(api: ApiPromise, blockHash: string): Promise<boolean> {
    try {
      const finalizedHead = await api.rpc.chain.getFinalizedHead();
      const blockNumber = (await api.rpc.chain.getHeader(blockHash)).number;
      const finalizedNumber = (await api.rpc.chain.getHeader(finalizedHead)).number;

      return blockNumber.lte(finalizedNumber);
    } catch (error) {
      logger.error('Error checking block finalization', { error });
      return false;
    }
  }

  /**
   * Check destination chain for XCM completion
   */
  private async checkDestinationChain(transaction: XCMTransaction): Promise<void> {
    const destinationApi = this.connectionManager.getConnection(
      transaction.params.destinationChain
    );

    if (!destinationApi) {
      logger.warn('Destination chain not connected', {
        chain: transaction.params.destinationChain,
        transactionId: transaction.id
      });
      return;
    }

    try {
      // Look for XCM execution events in recent blocks
      const events = await this.searchForXCMEvents(destinationApi, transaction);

      if (events.length > 0) {
        const successEvent = events.find(e => e.method === 'Success' || e.method === 'Complete');
        const failureEvent = events.find(e => e.method === 'Fail' || e.method === 'Error');

        if (successEvent) {
          transaction.status = TransactionStatus.SUCCESS;
          transaction.completedAt = new Date();
          transaction.updatedAt = new Date();
          this.completeTransaction(transaction);
          this.emit('transactionSuccess', transaction);
        } else if (failureEvent) {
          transaction.status = TransactionStatus.FAILED;
          transaction.error = this.extractErrorMessage(failureEvent);
          transaction.updatedAt = new Date();
          this.completeTransaction(transaction);
          this.emit('transactionFailed', transaction);
        }
      }
    } catch (error) {
      logger.error('Error checking destination chain', {
        transactionId: transaction.id,
        error
      });
    }
  }

  /**
   * Search for XCM events in destination chain
   */
  private async searchForXCMEvents(
    api: ApiPromise,
    transaction: XCMTransaction
  ): Promise<ChainEvent[]> {
    const events: ChainEvent[] = [];

    try {
      const latestHeader = await api.rpc.chain.getHeader();
      const latestBlockNumber = latestHeader.number.toNumber();

      // Search last 20 blocks for XCM events
      for (let i = 0; i < 20; i++) {
        const blockNumber = latestBlockNumber - i;
        if (blockNumber < 0) break;

        const blockHash = await api.rpc.chain.getBlockHash(blockNumber);
        const blockEvents = await api.query.system.events.at(blockHash);

        blockEvents.forEach((record, index) => {
          const { event } = record;

          if (event.section === 'xcmpQueue' ||
              event.section === 'dmpQueue' ||
              event.section === 'xcmPallet') {
            events.push({
              chainId: transaction.params.destinationChain,
              blockNumber,
              blockHash: blockHash.toHex(),
              eventIndex: index,
              section: event.section,
              method: event.method,
              data: event.data.toJSON(),
              timestamp: new Date(),
              transactionId: transaction.id
            });
          }
        });
      }
    } catch (error) {
      logger.error('Error searching XCM events', { error });
    }

    return events;
  }

  /**
   * Extract error message from failure event
   */
  private extractErrorMessage(event: ChainEvent): string {
    try {
      if (event.data && Array.isArray(event.data) && event.data.length > 0) {
        return JSON.stringify(event.data);
      }
      return `XCM execution failed: ${event.method}`;
    } catch {
      return 'Unknown XCM execution error';
    }
  }

  /**
   * Check for transaction timeout
   */
  private checkTransactionTimeout(transaction: XCMTransaction): void {
    const timeoutMs = 5 * 60 * 1000; // 5 minutes
    const elapsed = Date.now() - transaction.createdAt.getTime();

    if (elapsed > timeoutMs && transaction.status !== TransactionStatus.SUCCESS) {
      logger.warn('Transaction timeout detected', {
        transactionId: transaction.id,
        elapsed,
        timeoutMs
      });

      if (transaction.retryCount < 3) {
        this.scheduleRetry(transaction);
      } else {
        this.markTransactionFailed(transaction, new Error('Transaction timeout'));
      }
    }
  }

  /**
   * Schedule transaction retry
   */
  private scheduleRetry(transaction: XCMTransaction): void {
    transaction.status = TransactionStatus.RETRYING;
    transaction.retryCount += 1;
    transaction.updatedAt = new Date();

    this.retryQueue.push(transaction);
    this.activeTransactions.delete(transaction.id);

    logger.info('Transaction scheduled for retry', {
      transactionId: transaction.id,
      retryCount: transaction.retryCount
    });

    this.emit('transactionRetry', transaction);
  }

  /**
   * Process retry queue
   */
  private processRetryQueue(): void {
    const now = Date.now();
    const retryDelay = 30000; // 30 seconds

    const readyForRetry = this.retryQueue.filter(tx => {
      const timeSinceUpdate = now - tx.updatedAt.getTime();
      return timeSinceUpdate >= retryDelay;
    });

    readyForRetry.forEach(transaction => {
      const index = this.retryQueue.indexOf(transaction);
      this.retryQueue.splice(index, 1);

      transaction.status = TransactionStatus.PENDING;
      transaction.updatedAt = new Date();
      this.activeTransactions.set(transaction.id, transaction);

      logger.info('Transaction retry initiated', {
        transactionId: transaction.id
      });

      this.emit('transactionRetryInitiated', transaction);
    });
  }

  /**
   * Mark transaction as failed
   */
  private markTransactionFailed(transaction: XCMTransaction, error: any): void {
    transaction.status = TransactionStatus.FAILED;
    transaction.error = error instanceof Error ? error.message : String(error);
    transaction.updatedAt = new Date();

    this.completeTransaction(transaction);
    this.emit('transactionFailed', transaction);
  }

  /**
   * Complete transaction (move to completed queue)
   */
  private completeTransaction(transaction: XCMTransaction): void {
    this.activeTransactions.delete(transaction.id);
    this.completedTransactions.set(transaction.id, transaction);

    logger.info('Transaction completed', {
      transactionId: transaction.id,
      status: transaction.status,
      duration: transaction.completedAt ?
        transaction.completedAt.getTime() - transaction.createdAt.getTime() : 0
    });
  }

  /**
   * Setup event listeners for all chains
   */
  private setupChainEventListeners(): void {
    const connectedChains = this.connectionManager.getConnectedChains();

    connectedChains.forEach(chainId => {
      const api = this.connectionManager.getConnection(chainId);
      if (api) {
        this.subscribeToChainEvents(api, chainId);
      }
    });
  }

  /**
   * Subscribe to chain events
   */
  private async subscribeToChainEvents(api: ApiPromise, chainId: string): Promise<void> {
    try {
      await api.query.system.events((events) => {
        events.forEach((record, index) => {
          const { event } = record;

          if (event.section === 'xcmpQueue' ||
              event.section === 'dmpQueue' ||
              event.section === 'xcmPallet') {
            this.emit('chainEvent', {
              chainId,
              blockNumber: 0, // Will be filled by block subscription
              blockHash: '',
              eventIndex: index,
              section: event.section,
              method: event.method,
              data: event.data.toJSON(),
              timestamp: new Date()
            } as ChainEvent);
          }
        });
      });

      logger.info(`Subscribed to events for chain: ${chainId}`);
    } catch (error) {
      logger.error(`Failed to subscribe to events for chain: ${chainId}`, { error });
    }
  }

  /**
   * Update metrics
   */
  private updateMetrics(): void {
    this.metrics.activeTransactions = this.activeTransactions.size;
    this.metrics.completedTransactions = this.completedTransactions.size;
    this.metrics.failedTransactions = Array.from(this.completedTransactions.values())
      .filter(tx => tx.status === TransactionStatus.FAILED).length;

    // Calculate average processing time
    const completedTxs = Array.from(this.completedTransactions.values())
      .filter(tx => tx.completedAt);

    if (completedTxs.length > 0) {
      const totalTime = completedTxs.reduce((sum, tx) => {
        return sum + (tx.completedAt!.getTime() - tx.createdAt.getTime());
      }, 0);

      this.metrics.averageProcessingTime = totalTime / completedTxs.length;
    }

    this.metrics.chainHealth = this.connectionManager.getHealthStatus();
    this.metrics.lastUpdated = new Date();
  }

  /**
   * Initialize metrics object
   */
  private initializeMetrics(): MonitoringMetrics {
    return {
      activeTransactions: 0,
      completedTransactions: 0,
      failedTransactions: 0,
      averageProcessingTime: 0,
      totalVolume: new BN(0),
      uniqueUsers: 0,
      chainHealth: {},
      lastUpdated: new Date()
    };
  }
}