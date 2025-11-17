import { ApiPromise } from '@polkadot/api';
import { BN } from '@polkadot/util';
import { ConnectionManager } from './ConnectionManager';
import {
  XCMTransferParams,
  FeeEstimation,
  AssetInfo,
  ChainConfig
} from '../types';
import { logger } from '../utils/logger';
import { CHAIN_CONFIGS, XCM_ROUTES } from '../config/chains';
import Decimal from 'decimal.js';

export class FeeEstimator {
  private connectionManager: ConnectionManager;
  private feeCache = new Map<string, { estimation: FeeEstimation; expiry: number }>();
  private cacheTimeout = 60000; // 1 minute
  private priceFeeds = new Map<string, { price: Decimal; lastUpdate: number }>();

  constructor(connectionManager: ConnectionManager) {
    this.connectionManager = connectionManager;
  }

  /**
   * Estimate fees for XCM transfer
   */
  async estimateFees(params: XCMTransferParams): Promise<FeeEstimation> {
    logger.info('Estimating XCM transfer fees', {
      sourceChain: params.sourceChain,
      destinationChain: params.destinationChain,
      asset: params.asset.symbol,
      amount: params.amount.toString()
    });

    const cacheKey = this.generateCacheKey(params);
    const cached = this.getCachedEstimation(cacheKey);

    if (cached) {
      logger.debug('Using cached fee estimation', { cacheKey });
      return cached;
    }

    try {
      const estimation = await this.calculateFees(params);
      this.cacheEstimation(cacheKey, estimation);
      return estimation;
    } catch (error) {
      logger.error('Failed to estimate fees', { error, params });
      throw error;
    }
  }

  /**
   * Calculate fees for XCM transfer
   */
  private async calculateFees(params: XCMTransferParams): Promise<FeeEstimation> {
    const sourceApi = this.connectionManager.getConnection(params.sourceChain);
    if (!sourceApi) {
      throw new Error(`No connection to source chain: ${params.sourceChain}`);
    }

    const sourceConfig = CHAIN_CONFIGS[params.sourceChain];
    const destinationConfig = CHAIN_CONFIGS[params.destinationChain];

    if (!sourceConfig || !destinationConfig) {
      throw new Error('Unsupported chain configuration');
    }

    // Get base fees from chain
    const baseFee = await this.getBaseFee(sourceApi, sourceConfig);

    // Get XCM delivery fee
    const deliveryFee = await this.getDeliveryFee(params, sourceApi);

    // Apply multipliers and optimizations
    const optimizedFees = this.optimizeFees(baseFee, deliveryFee, params);

    // Get fee asset information
    const feeAsset = await this.determineFeeAsset(params);

    return {
      baseFee: optimizedFees.baseFee,
      deliveryFee: optimizedFees.deliveryFee,
      totalFee: optimizedFees.baseFee.add(optimizedFees.deliveryFee),
      feeAsset,
      confidence: this.calculateConfidence(params),
      timestamp: new Date()
    };
  }

  /**
   * Get base transaction fee
   */
  private async getBaseFee(api: ApiPromise, config: ChainConfig): Promise<BN> {
    try {
      // Get payment info for a simple transfer
      const paymentInfo = await api.tx.balances.transfer('0x' + '00'.repeat(32), new BN(1))
        .paymentInfo('0x' + '00'.repeat(32));

      const baseFee = paymentInfo.partialFee;

      logger.debug('Base fee calculated', {
        chain: config.id,
        baseFee: baseFee.toString()
      });

      return baseFee;
    } catch (error) {
      logger.error('Failed to get base fee', { error, chain: config.id });
      // Fallback to estimated fee
      return new BN('1000000000'); // 0.1 units
    }
  }

  /**
   * Get XCM delivery fee
   */
  private async getDeliveryFee(
    params: XCMTransferParams,
    sourceApi: ApiPromise
  ): Promise<BN> {
    try {
      const routeKey = `${params.sourceChain}-${params.destinationChain}`;
      const routeConfig = XCM_ROUTES[routeKey as keyof typeof XCM_ROUTES];

      if (routeConfig && routeConfig.fees[params.asset.symbol as keyof typeof routeConfig.fees]) {
        const configuredFee = routeConfig.fees[params.asset.symbol as keyof typeof routeConfig.fees];
        return new BN(configuredFee as string);
      }

      // Try to query delivery fee from chain
      const deliveryFee = await this.queryDeliveryFee(params, sourceApi);
      if (deliveryFee) {
        return deliveryFee;
      }

      // Fallback estimation
      return this.estimateDeliveryFee(params);
    } catch (error) {
      logger.error('Failed to get delivery fee', { error });
      return this.estimateDeliveryFee(params);
    }
  }

  /**
   * Query delivery fee from chain
   */
  private async queryDeliveryFee(
    params: XCMTransferParams,
    sourceApi: ApiPromise
  ): Promise<BN | null> {
    try {
      // Check if chain supports delivery fee queries
      if (!sourceApi.query.xcmPallet?.deliveryFeeFactor) {
        return null;
      }

      const destination = this.buildDestinationLocation(params.destinationChain);
      const deliveryFactor = await sourceApi.query.xcmPallet.deliveryFeeFactor(destination);

      if (deliveryFactor && !deliveryFactor.isEmpty) {
        const baseFee = new BN('1000000000');
        return baseFee.mul(deliveryFactor as any);
      }
    } catch (error) {
      logger.debug('Failed to query delivery fee', { error });
    }

    return null;
  }

  /**
   * Estimate delivery fee based on route complexity
   */
  private estimateDeliveryFee(params: XCMTransferParams): BN {
    const sourceConfig = CHAIN_CONFIGS[params.sourceChain];
    const destinationConfig = CHAIN_CONFIGS[params.destinationChain];

    let baseFee = new BN('5000000000'); // 0.5 units base

    // Adjust for chain types
    if (sourceConfig.isRelay || destinationConfig.isRelay) {
      baseFee = baseFee.muln(1); // Lower fee for relay chain involvement
    } else {
      baseFee = baseFee.muln(2); // Higher fee for parachain-to-parachain
    }

    // Adjust for asset type
    if (!params.asset.isNative) {
      baseFee = baseFee.muln(1.5); // 50% more for non-native assets
    }

    // Adjust for amount (larger amounts may require more execution)
    const amountFactor = params.amount.div(new BN(10).pow(new BN(params.asset.decimals)));
    if (amountFactor.gt(new BN(1000))) {
      baseFee = baseFee.muln(1.2); // 20% more for large amounts
    }

    return baseFee;
  }

  /**
   * Optimize fees based on network conditions
   */
  private optimizeFees(
    baseFee: BN,
    deliveryFee: BN,
    params: XCMTransferParams
  ): { baseFee: BN; deliveryFee: BN } {
    const feeMultiplier = process.env.FEE_MULTIPLIER ?
      parseFloat(process.env.FEE_MULTIPLIER) : 1.2;

    // Apply safety multiplier
    const optimizedBaseFee = baseFee.muln(Math.floor(feeMultiplier * 100)).divn(100);
    const optimizedDeliveryFee = deliveryFee.muln(Math.floor(feeMultiplier * 100)).divn(100);

    // Priority adjustments
    if (params.priority === 'high') {
      return {
        baseFee: optimizedBaseFee.muln(2),
        deliveryFee: optimizedDeliveryFee.muln(2)
      };
    } else if (params.priority === 'low') {
      return {
        baseFee: optimizedBaseFee.muln(80).divn(100),
        deliveryFee: optimizedDeliveryFee.muln(80).divn(100)
      };
    }

    return {
      baseFee: optimizedBaseFee,
      deliveryFee: optimizedDeliveryFee
    };
  }

  /**
   * Determine fee asset
   */
  private async determineFeeAsset(params: XCMTransferParams): Promise<AssetInfo> {
    const sourceConfig = CHAIN_CONFIGS[params.sourceChain];

    // Default to native token of source chain
    return {
      assetId: 'native',
      symbol: sourceConfig.nativeToken,
      decimals: sourceConfig.decimals,
      minBalance: '1000000000', // 0.1 units
      isNative: true
    };
  }

  /**
   * Calculate estimation confidence
   */
  private calculateConfidence(params: XCMTransferParams): number {
    const routeKey = `${params.sourceChain}-${params.destinationChain}`;
    const routeConfig = XCM_ROUTES[routeKey as keyof typeof XCM_ROUTES];

    if (routeConfig) {
      return routeConfig.confidence;
    }

    // Lower confidence for unknown routes
    return 0.7;
  }

  /**
   * Build destination location for fee queries
   */
  private buildDestinationLocation(chainId: string): any {
    const config = CHAIN_CONFIGS[chainId];

    if (config.isRelay) {
      return { parents: 1, interior: 'Here' };
    } else {
      return {
        parents: 1,
        interior: { X1: { Parachain: config.parachainId } }
      };
    }
  }

  /**
   * Get real-time price feeds
   */
  async updatePriceFeeds(): Promise<void> {
    try {
      // In a real implementation, this would fetch from price APIs
      // For now, using mock prices
      const mockPrices = {
        DOT: new Decimal(6.50),
        KSM: new Decimal(25.00),
        HDX: new Decimal(0.45),
        USDT: new Decimal(1.00),
        USDC: new Decimal(1.00)
      };

      Object.entries(mockPrices).forEach(([symbol, price]) => {
        this.priceFeeds.set(symbol, {
          price,
          lastUpdate: Date.now()
        });
      });

      logger.debug('Price feeds updated', {
        feeds: Object.keys(mockPrices)
      });
    } catch (error) {
      logger.error('Failed to update price feeds', { error });
    }
  }

  /**
   * Convert fees to USD for comparison
   */
  async convertToUSD(amount: BN, assetSymbol: string, decimals: number): Promise<Decimal | null> {
    const priceFeed = this.priceFeeds.get(assetSymbol);
    if (!priceFeed) {
      return null;
    }

    const tokenAmount = new Decimal(amount.toString()).div(
      new Decimal(10).pow(decimals)
    );

    return tokenAmount.mul(priceFeed.price);
  }

  /**
   * Compare fees across different routes
   */
  async compareFees(
    params: XCMTransferParams,
    alternativeRoutes: string[][]
  ): Promise<Array<{ route: string[]; estimation: FeeEstimation; usdValue?: Decimal }>> {
    const comparisons = [];

    // Direct route
    const directEstimation = await this.estimateFees(params);
    const directUSD = await this.convertToUSD(
      directEstimation.totalFee,
      directEstimation.feeAsset.symbol,
      directEstimation.feeAsset.decimals
    );

    comparisons.push({
      route: [params.sourceChain, params.destinationChain],
      estimation: directEstimation,
      usdValue: directUSD || undefined
    });

    // Alternative routes
    for (const route of alternativeRoutes) {
      try {
        // This would involve calculating fees for multi-hop routes
        // For now, we'll estimate based on the sum of individual hops
        let totalFee = new BN(0);
        let confidence = 1;

        for (let i = 0; i < route.length - 1; i++) {
          const hopParams = {
            ...params,
            sourceChain: route[i],
            destinationChain: route[i + 1]
          };

          const hopEstimation = await this.estimateFees(hopParams);
          totalFee = totalFee.add(hopEstimation.totalFee);
          confidence *= hopEstimation.confidence;
        }

        const routeEstimation: FeeEstimation = {
          baseFee: totalFee.muln(70).divn(100), // 70% base
          deliveryFee: totalFee.muln(30).divn(100), // 30% delivery
          totalFee,
          feeAsset: directEstimation.feeAsset,
          confidence,
          timestamp: new Date()
        };

        const routeUSD = await this.convertToUSD(
          totalFee,
          directEstimation.feeAsset.symbol,
          directEstimation.feeAsset.decimals
        );

        comparisons.push({
          route,
          estimation: routeEstimation,
          usdValue: routeUSD || undefined
        });
      } catch (error) {
        logger.error('Failed to estimate fees for alternative route', {
          route,
          error
        });
      }
    }

    return comparisons;
  }

  /**
   * Generate cache key for fee estimation
   */
  private generateCacheKey(params: XCMTransferParams): string {
    return `${params.sourceChain}-${params.destinationChain}-${params.asset.symbol}-${params.priority || 'normal'}`;
  }

  /**
   * Get cached fee estimation
   */
  private getCachedEstimation(key: string): FeeEstimation | null {
    const cached = this.feeCache.get(key);
    if (cached && cached.expiry > Date.now()) {
      return cached.estimation;
    }
    return null;
  }

  /**
   * Cache fee estimation
   */
  private cacheEstimation(key: string, estimation: FeeEstimation): void {
    this.feeCache.set(key, {
      estimation,
      expiry: Date.now() + this.cacheTimeout
    });
  }

  /**
   * Clear expired cache entries
   */
  clearExpiredCache(): void {
    const now = Date.now();
    for (const [key, cached] of this.feeCache.entries()) {
      if (cached.expiry <= now) {
        this.feeCache.delete(key);
      }
    }
  }

  /**
   * Get fee statistics for analytics
   */
  getFeeStatistics(): {
    cachedEstimations: number;
    priceFeeds: number;
    lastPriceUpdate: Date | null;
  } {
    const lastPriceUpdate = Math.max(
      ...Array.from(this.priceFeeds.values()).map(p => p.lastUpdate),
      0
    );

    return {
      cachedEstimations: this.feeCache.size,
      priceFeeds: this.priceFeeds.size,
      lastPriceUpdate: lastPriceUpdate > 0 ? new Date(lastPriceUpdate) : null
    };
  }
}