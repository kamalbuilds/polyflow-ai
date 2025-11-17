import { ApiPromise } from '@polkadot/api';
import { EventEmitter } from 'eventemitter3';
import { ConnectionManager } from './ConnectionManager';
import {
  ChainEvent,
  EventFilter,
  NotificationConfig,
  XCMTransaction,
  TransactionStatus
} from '../types';
import { logger } from '../utils/logger';
import { NotificationService } from './NotificationService';

export class EventListener extends EventEmitter {
  private connectionManager: ConnectionManager;
  private notificationService: NotificationService;
  private subscriptions = new Map<string, any>();
  private eventFilters: EventFilter[] = [];
  private eventQueue: ChainEvent[] = [];
  private maxQueueSize = 1000;
  private isProcessing = false;
  private processingInterval: NodeJS.Timeout | null = null;

  constructor(connectionManager: ConnectionManager, notificationConfig?: NotificationConfig) {
    super();
    this.connectionManager = connectionManager;
    this.notificationService = new NotificationService(notificationConfig);
    this.setupDefaultFilters();
  }

  /**
   * Start event listening for all connected chains
   */
  async startListening(): Promise<void> {
    logger.info('Starting cross-chain event listening');

    const connectedChains = this.connectionManager.getConnectedChains();

    for (const chainId of connectedChains) {
      await this.subscribeToChainEvents(chainId);
    }

    // Start event processing
    this.startEventProcessing();

    // Listen for new connections
    this.connectionManager.on('chainConnected', this.onChainConnected.bind(this));
    this.connectionManager.on('chainDisconnected', this.onChainDisconnected.bind(this));

    logger.info('Event listening started for all chains', {
      chains: connectedChains
    });
  }

  /**
   * Stop event listening
   */
  async stopListening(): Promise<void> {
    logger.info('Stopping cross-chain event listening');

    // Unsubscribe from all chains
    for (const [chainId, unsubscribe] of this.subscriptions.entries()) {
      try {
        await unsubscribe();
        logger.debug(`Unsubscribed from events for chain: ${chainId}`);
      } catch (error) {
        logger.error(`Failed to unsubscribe from ${chainId}`, { error });
      }
    }

    this.subscriptions.clear();

    // Stop event processing
    this.stopEventProcessing();

    logger.info('Event listening stopped');
  }

  /**
   * Subscribe to events for a specific chain
   */
  private async subscribeToChainEvents(chainId: string): Promise<void> {
    const api = this.connectionManager.getConnection(chainId);
    if (!api) {
      logger.warn(`No connection available for chain: ${chainId}`);
      return;
    }

    try {
      const unsubscribe = await api.query.system.events((events) => {
        events.forEach((record, index) => {
          const { event, phase } = record;

          // Create chain event object
          const chainEvent: ChainEvent = {
            chainId,
            blockNumber: 0, // Will be updated by block subscription
            blockHash: '',
            eventIndex: index,
            section: event.section,
            method: event.method,
            data: event.data.toJSON(),
            timestamp: new Date()
          };

          // Add to processing queue
          this.addEventToQueue(chainEvent);
        });
      });

      this.subscriptions.set(chainId, unsubscribe);

      // Also subscribe to new block headers for block info
      const headerUnsubscribe = await api.rpc.chain.subscribeNewHeads((header) => {
        this.updateBlockInfo(chainId, header.number.toNumber(), header.hash.toHex());
      });

      this.subscriptions.set(`${chainId}-headers`, headerUnsubscribe);

      logger.info(`Subscribed to events for chain: ${chainId}`);
    } catch (error) {
      logger.error(`Failed to subscribe to events for chain: ${chainId}`, { error });
    }
  }

  /**
   * Add event to processing queue
   */
  private addEventToQueue(event: ChainEvent): void {
    // Check if event matches any filters
    if (!this.matchesFilters(event)) {
      return;
    }

    this.eventQueue.push(event);

    // Maintain queue size limit
    if (this.eventQueue.length > this.maxQueueSize) {
      this.eventQueue.shift(); // Remove oldest event
    }

    this.emit('eventReceived', event);
  }

  /**
   * Check if event matches configured filters
   */
  private matchesFilters(event: ChainEvent): boolean {
    if (this.eventFilters.length === 0) {
      return true; // No filters, accept all events
    }

    return this.eventFilters.some(filter => {
      // Check chain filter
      if (filter.chains.length > 0 && !filter.chains.includes(event.chainId)) {
        return false;
      }

      // Check section filter
      if (filter.sections.length > 0 && !filter.sections.includes(event.section)) {
        return false;
      }

      // Check method filter
      if (filter.methods.length > 0 && !filter.methods.includes(event.method)) {
        return false;
      }

      return true;
    });
  }

  /**
   * Start event processing loop
   */
  private startEventProcessing(): void {
    if (this.processingInterval) {
      return;
    }

    this.isProcessing = true;
    this.processingInterval = setInterval(() => {
      this.processEventQueue();
    }, 1000); // Process every second

    logger.debug('Event processing started');
  }

  /**
   * Stop event processing loop
   */
  private stopEventProcessing(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }

    this.isProcessing = false;
    logger.debug('Event processing stopped');
  }

  /**
   * Process events in the queue
   */
  private async processEventQueue(): Promise<void> {
    if (this.eventQueue.length === 0) {
      return;
    }

    const eventsToProcess = [...this.eventQueue];
    this.eventQueue.length = 0; // Clear the queue

    for (const event of eventsToProcess) {
      try {
        await this.processEvent(event);
      } catch (error) {
        logger.error('Error processing event', { event, error });
      }
    }
  }

  /**
   * Process individual event
   */
  private async processEvent(event: ChainEvent): Promise<void> {
    logger.debug('Processing chain event', {
      chainId: event.chainId,
      section: event.section,
      method: event.method,
      blockNumber: event.blockNumber
    });

    // Handle specific XCM-related events
    if (this.isXCMEvent(event)) {
      await this.handleXCMEvent(event);
    }

    // Handle balance transfer events
    if (this.isBalanceEvent(event)) {
      await this.handleBalanceEvent(event);
    }

    // Handle asset events
    if (this.isAssetEvent(event)) {
      await this.handleAssetEvent(event);
    }

    // Emit processed event
    this.emit('eventProcessed', event);

    // Send notifications if configured
    await this.notificationService.notifyEvent(event);
  }

  /**
   * Check if event is XCM-related
   */
  private isXCMEvent(event: ChainEvent): boolean {
    const xcmSections = ['xcmpQueue', 'dmpQueue', 'xcmPallet', 'polkadotXcm', 'xcm'];
    return xcmSections.includes(event.section);
  }

  /**
   * Handle XCM events
   */
  private async handleXCMEvent(event: ChainEvent): Promise<void> {
    logger.info('XCM event detected', {
      chainId: event.chainId,
      section: event.section,
      method: event.method,
      data: event.data
    });

    // Emit specific XCM event types
    switch (event.method) {
      case 'Success':
      case 'Complete':
        this.emit('xcmSuccess', event);
        break;
      case 'Fail':
      case 'Error':
        this.emit('xcmFailure', event);
        break;
      case 'Sent':
        this.emit('xcmSent', event);
        break;
      case 'Received':
        this.emit('xcmReceived', event);
        break;
      case 'AssetsTrapped':
        this.emit('xcmAssetsTrapped', event);
        logger.warn('XCM assets trapped', { event });
        break;
    }

    // Try to correlate with pending transactions
    await this.correlateWithTransactions(event);
  }

  /**
   * Handle balance events
   */
  private async handleBalanceEvent(event: ChainEvent): Promise<void> {
    if (event.method === 'Transfer') {
      logger.debug('Balance transfer detected', {
        chainId: event.chainId,
        data: event.data
      });

      this.emit('balanceTransfer', event);
    }
  }

  /**
   * Handle asset events
   */
  private async handleAssetEvent(event: ChainEvent): Promise<void> {
    if (event.section === 'assets') {
      logger.debug('Asset event detected', {
        chainId: event.chainId,
        method: event.method,
        data: event.data
      });

      this.emit('assetEvent', event);
    }
  }

  /**
   * Correlate events with pending transactions
   */
  private async correlateWithTransactions(event: ChainEvent): Promise<void> {
    // This would match events to pending XCM transactions
    // For now, we'll emit an event that the TransactionMonitor can handle
    this.emit('transactionCorrelation', event);
  }

  /**
   * Update block information for recent events
   */
  private updateBlockInfo(chainId: string, blockNumber: number, blockHash: string): void {
    // Update recent events with block information
    this.eventQueue
      .filter(event => event.chainId === chainId && !event.blockNumber)
      .forEach(event => {
        event.blockNumber = blockNumber;
        event.blockHash = blockHash;
      });
  }

  /**
   * Add event filter
   */
  addEventFilter(filter: EventFilter): void {
    this.eventFilters.push(filter);
    logger.info('Event filter added', { filter });
  }

  /**
   * Remove event filter
   */
  removeEventFilter(index: number): void {
    if (index >= 0 && index < this.eventFilters.length) {
      const removed = this.eventFilters.splice(index, 1);
      logger.info('Event filter removed', { filter: removed[0] });
    }
  }

  /**
   * Clear all event filters
   */
  clearEventFilters(): void {
    this.eventFilters.length = 0;
    logger.info('All event filters cleared');
  }

  /**
   * Get recent events by criteria
   */
  getRecentEvents(criteria: {
    chainId?: string;
    section?: string;
    method?: string;
    limit?: number;
    since?: Date;
  }): ChainEvent[] {
    let events = [...this.eventQueue];

    // Apply filters
    if (criteria.chainId) {
      events = events.filter(e => e.chainId === criteria.chainId);
    }

    if (criteria.section) {
      events = events.filter(e => e.section === criteria.section);
    }

    if (criteria.method) {
      events = events.filter(e => e.method === criteria.method);
    }

    if (criteria.since) {
      events = events.filter(e => e.timestamp >= criteria.since!);
    }

    // Sort by timestamp (newest first)
    events.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // Apply limit
    if (criteria.limit) {
      events = events.slice(0, criteria.limit);
    }

    return events;
  }

  /**
   * Get event statistics
   */
  getEventStatistics(): {
    totalEventsProcessed: number;
    eventsByChain: Record<string, number>;
    eventsBySection: Record<string, number>;
    activeSubscriptions: number;
    queueSize: number;
    filters: number;
  } {
    const eventsByChain: Record<string, number> = {};
    const eventsBySection: Record<string, number> = {};

    this.eventQueue.forEach(event => {
      eventsByChain[event.chainId] = (eventsByChain[event.chainId] || 0) + 1;
      eventsBySection[event.section] = (eventsBySection[event.section] || 0) + 1;
    });

    return {
      totalEventsProcessed: this.eventQueue.length,
      eventsByChain,
      eventsBySection,
      activeSubscriptions: this.subscriptions.size,
      queueSize: this.eventQueue.length,
      filters: this.eventFilters.length
    };
  }

  /**
   * Setup default event filters
   */
  private setupDefaultFilters(): void {
    // Filter for XCM events
    this.addEventFilter({
      chains: [],
      sections: ['xcmpQueue', 'dmpQueue', 'xcmPallet', 'polkadotXcm'],
      methods: []
    });

    // Filter for balance transfers
    this.addEventFilter({
      chains: [],
      sections: ['balances'],
      methods: ['Transfer']
    });

    // Filter for asset events
    this.addEventFilter({
      chains: [],
      sections: ['assets'],
      methods: ['Transferred', 'Issued', 'Burned']
    });
  }

  /**
   * Handle new chain connection
   */
  private async onChainConnected(chainId: string): Promise<void> {
    logger.info(`New chain connected, starting event subscription: ${chainId}`);
    await this.subscribeToChainEvents(chainId);
  }

  /**
   * Handle chain disconnection
   */
  private async onChainDisconnected(chainId: string): Promise<void> {
    logger.info(`Chain disconnected, stopping event subscription: ${chainId}`);

    const unsubscribe = this.subscriptions.get(chainId);
    const headerUnsubscribe = this.subscriptions.get(`${chainId}-headers`);

    try {
      if (unsubscribe) {
        await unsubscribe();
        this.subscriptions.delete(chainId);
      }

      if (headerUnsubscribe) {
        await headerUnsubscribe();
        this.subscriptions.delete(`${chainId}-headers`);
      }
    } catch (error) {
      logger.error(`Error unsubscribing from chain events: ${chainId}`, { error });
    }
  }
}