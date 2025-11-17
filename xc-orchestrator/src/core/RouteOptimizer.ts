import { BN } from '@polkadot/util';
import { ConnectionManager } from './ConnectionManager';
import { FeeEstimator } from './FeeEstimator';
import {
  XCMTransferParams,
  XCMRoute,
  RouteAnalysis,
  AssetInfo,
  FeeEstimation
} from '../types';
import { CHAIN_CONFIGS, XCM_ROUTES } from '../config/chains';
import { logger } from '../utils/logger';

interface RouteNode {
  chainId: string;
  cost: number;
  time: number;
  reliability: number;
}

interface RouteEdge {
  from: string;
  to: string;
  weight: number;
  fees: Record<string, string>;
  estimatedTime: number;
  reliability: number;
}

export class RouteOptimizer {
  private connectionManager: ConnectionManager;
  private feeEstimator: FeeEstimator;
  private routeGraph: Map<string, RouteEdge[]> = new Map();
  private routeCache = new Map<string, { analysis: RouteAnalysis; expiry: number }>();
  private cacheTimeout = 5 * 60 * 1000; // 5 minutes

  constructor(connectionManager: ConnectionManager, feeEstimator: FeeEstimator) {
    this.connectionManager = connectionManager;
    this.feeEstimator = feeEstimator;
    this.buildRouteGraph();
  }

  /**
   * Find optimal routes for XCM transfer
   */
  async findOptimalRoutes(params: XCMTransferParams): Promise<RouteAnalysis> {
    logger.info('Finding optimal routes', {
      sourceChain: params.sourceChain,
      destinationChain: params.destinationChain,
      asset: params.asset.symbol
    });

    const cacheKey = this.generateRouteKey(params);
    const cached = this.getCachedAnalysis(cacheKey);

    if (cached) {
      logger.debug('Using cached route analysis', { cacheKey });
      return cached;
    }

    try {
      const analysis = await this.analyzeRoutes(params);
      this.cacheAnalysis(cacheKey, analysis);
      return analysis;
    } catch (error) {
      logger.error('Failed to find optimal routes', { error, params });
      throw error;
    }
  }

  /**
   * Analyze all possible routes
   */
  private async analyzeRoutes(params: XCMTransferParams): Promise<RouteAnalysis> {
    const allRoutes = await this.findAllRoutes(params);
    const routeAnalysis: RouteAnalysis = {
      routes: allRoutes,
      bestRoute: allRoutes[0], // Will be determined later
      alternatives: [],
      analysis: {
        speedRank: [],
        costRank: [],
        reliabilityRank: []
      }
    };

    if (allRoutes.length === 0) {
      throw new Error(`No routes found between ${params.sourceChain} and ${params.destinationChain}`);
    }

    // Rank routes by different criteria
    routeAnalysis.analysis.speedRank = [...allRoutes].sort((a, b) => a.estimatedDuration - b.estimatedDuration);
    routeAnalysis.analysis.costRank = [...allRoutes].sort((a, b) => a.estimatedFee.cmp(b.estimatedFee));
    routeAnalysis.analysis.reliabilityRank = [...allRoutes].sort((a, b) => b.confidence - a.confidence);

    // Determine best route using weighted scoring
    routeAnalysis.bestRoute = this.selectBestRoute(allRoutes, params);
    routeAnalysis.alternatives = allRoutes.filter(route => route.id !== routeAnalysis.bestRoute.id);

    logger.info('Route analysis completed', {
      totalRoutes: allRoutes.length,
      bestRoute: routeAnalysis.bestRoute.path,
      bestRouteFee: routeAnalysis.bestRoute.estimatedFee.toString()
    });

    return routeAnalysis;
  }

  /**
   * Find all possible routes between source and destination
   */
  private async findAllRoutes(params: XCMTransferParams): Promise<XCMRoute[]> {
    const routes: XCMRoute[] = [];

    // Direct route (if available)
    const directRoute = await this.buildDirectRoute(params);
    if (directRoute) {
      routes.push(directRoute);
    }

    // Multi-hop routes through major hubs
    const hubRoutes = await this.findHubRoutes(params);
    routes.push(...hubRoutes);

    return routes.filter(route => route.confidence > 0.5); // Filter out low-confidence routes
  }

  /**
   * Build direct route between chains
   */
  private async buildDirectRoute(params: XCMTransferParams): Promise<XCMRoute | null> {
    const routeKey = `${params.sourceChain}-${params.destinationChain}`;
    const routeConfig = XCM_ROUTES[routeKey as keyof typeof XCM_ROUTES];

    if (!routeConfig) {
      return null;
    }

    try {
      const feeEstimation = await this.feeEstimator.estimateFees(params);

      return {
        id: `direct-${routeKey}`,
        sourceChain: params.sourceChain,
        destinationChain: params.destinationChain,
        asset: params.asset,
        estimatedFee: feeEstimation.totalFee,
        estimatedDuration: routeConfig.estimatedDuration,
        confidence: routeConfig.confidence,
        path: [params.sourceChain, params.destinationChain],
        lastUpdated: new Date()
      };
    } catch (error) {
      logger.error('Failed to build direct route', { error, routeKey });
      return null;
    }
  }

  /**
   * Find routes through major hubs (Asset Hub, etc.)
   */
  private async findHubRoutes(params: XCMTransferParams): Promise<XCMRoute[]> {
    const routes: XCMRoute[] = [];
    const hubs = ['assetHub', 'polkadot']; // Major routing hubs

    for (const hub of hubs) {
      if (hub === params.sourceChain || hub === params.destinationChain) {
        continue;
      }

      try {
        const route = await this.buildHubRoute(params, hub);
        if (route) {
          routes.push(route);
        }
      } catch (error) {
        logger.debug('Failed to build hub route', { hub, error });
      }
    }

    return routes;
  }

  /**
   * Build route through specific hub
   */
  private async buildHubRoute(params: XCMTransferParams, hub: string): Promise<XCMRoute | null> {
    // Check if both hops are possible
    const hop1Key = `${params.sourceChain}-${hub}`;
    const hop2Key = `${hub}-${params.destinationChain}`;

    const hop1Config = XCM_ROUTES[hop1Key as keyof typeof XCM_ROUTES];
    const hop2Config = XCM_ROUTES[hop2Key as keyof typeof XCM_ROUTES];

    if (!hop1Config || !hop2Config) {
      return null;
    }

    try {
      // Estimate fees for both hops
      const hop1Params = { ...params, destinationChain: hub };
      const hop2Params = { ...params, sourceChain: hub };

      const hop1Fees = await this.feeEstimator.estimateFees(hop1Params);
      const hop2Fees = await this.feeEstimator.estimateFees(hop2Params);

      const totalFee = hop1Fees.totalFee.add(hop2Fees.totalFee);
      const totalDuration = hop1Config.estimatedDuration + hop2Config.estimatedDuration;
      const averageConfidence = (hop1Config.confidence + hop2Config.confidence) / 2;

      // Add hub processing time
      const hubProcessingTime = 12000; // 1 block for processing
      const adjustedDuration = totalDuration + hubProcessingTime;

      return {
        id: `hub-${params.sourceChain}-${hub}-${params.destinationChain}`,
        sourceChain: params.sourceChain,
        destinationChain: params.destinationChain,
        asset: params.asset,
        estimatedFee: totalFee,
        estimatedDuration: adjustedDuration,
        confidence: averageConfidence * 0.9, // Slight reduction for multi-hop
        path: [params.sourceChain, hub, params.destinationChain],
        lastUpdated: new Date()
      };
    } catch (error) {
      logger.error('Failed to estimate hub route fees', { hub, error });
      return null;
    }
  }

  /**
   * Select best route using weighted scoring
   */
  private selectBestRoute(routes: XCMRoute[], params: XCMTransferParams): XCMRoute {
    if (routes.length === 1) {
      return routes[0];
    }

    // Weights based on priority
    let weights = { cost: 0.4, speed: 0.3, reliability: 0.3 };

    if (params.priority === 'high') {
      weights = { cost: 0.2, speed: 0.5, reliability: 0.3 };
    } else if (params.priority === 'low') {
      weights = { cost: 0.6, speed: 0.2, reliability: 0.2 };
    }

    // Normalize and score routes
    const normalizedRoutes = this.normalizeRouteMetrics(routes);
    let bestRoute = routes[0];
    let bestScore = -1;

    normalizedRoutes.forEach((normalized, index) => {
      const score = (
        weights.cost * (1 - normalized.costScore) + // Lower cost is better
        weights.speed * (1 - normalized.speedScore) + // Lower time is better
        weights.reliability * normalized.reliabilityScore // Higher reliability is better
      );

      if (score > bestScore) {
        bestScore = score;
        bestRoute = routes[index];
      }
    });

    logger.info('Best route selected', {
      routeId: bestRoute.id,
      path: bestRoute.path,
      score: bestScore,
      weights
    });

    return bestRoute;
  }

  /**
   * Normalize route metrics for comparison
   */
  private normalizeRouteMetrics(routes: XCMRoute[]): Array<{
    costScore: number;
    speedScore: number;
    reliabilityScore: number;
  }> {
    const costs = routes.map(r => parseFloat(r.estimatedFee.toString()));
    const speeds = routes.map(r => r.estimatedDuration);
    const reliabilities = routes.map(r => r.confidence);

    const minCost = Math.min(...costs);
    const maxCost = Math.max(...costs);
    const minSpeed = Math.min(...speeds);
    const maxSpeed = Math.max(...speeds);
    const minReliability = Math.min(...reliabilities);
    const maxReliability = Math.max(...reliabilities);

    return routes.map((route, index) => ({
      costScore: maxCost > minCost ? (costs[index] - minCost) / (maxCost - minCost) : 0,
      speedScore: maxSpeed > minSpeed ? (speeds[index] - minSpeed) / (maxSpeed - minSpeed) : 0,
      reliabilityScore: maxReliability > minReliability ?
        (reliabilities[index] - minReliability) / (maxReliability - minReliability) : 1
    }));
  }

  /**
   * Build route graph from configuration
   */
  private buildRouteGraph(): void {
    Object.keys(CHAIN_CONFIGS).forEach(chainId => {
      this.routeGraph.set(chainId, []);
    });

    // Add edges based on XCM_ROUTES configuration
    Object.entries(XCM_ROUTES).forEach(([routeKey, config]) => {
      const [from, to] = routeKey.split('-');
      const fromEdges = this.routeGraph.get(from) || [];

      fromEdges.push({
        from,
        to,
        weight: config.estimatedDuration,
        fees: config.fees,
        estimatedTime: config.estimatedDuration,
        reliability: config.confidence
      });

      this.routeGraph.set(from, fromEdges);
    });

    logger.info('Route graph built', {
      nodes: this.routeGraph.size,
      edges: Array.from(this.routeGraph.values()).reduce((sum, edges) => sum + edges.length, 0)
    });
  }

  /**
   * Update route performance based on actual results
   */
  async updateRoutePerformance(
    routeId: string,
    actualDuration: number,
    actualFee: BN,
    success: boolean
  ): Promise<void> {
    // This would update the route performance metrics
    // For now, we'll log the performance data
    logger.info('Route performance update', {
      routeId,
      actualDuration,
      actualFee: actualFee.toString(),
      success
    });

    // In a real implementation, this would:
    // 1. Update route confidence based on success/failure
    // 2. Adjust estimated duration based on actual performance
    // 3. Update fee estimates
    // 4. Train ML models for better predictions
  }

  /**
   * Get route recommendations
   */
  async getRouteRecommendations(
    asset: AssetInfo,
    sourceChain: string,
    destinationChain: string
  ): Promise<{
    fastestRoute: XCMRoute | null;
    cheapestRoute: XCMRoute | null;
    mostReliableRoute: XCMRoute | null;
  }> {
    const mockParams: XCMTransferParams = {
      sourceChain,
      destinationChain,
      asset,
      amount: new BN(10).pow(new BN(asset.decimals)), // 1 unit
      sender: '0x' + '00'.repeat(32),
      recipient: '0x' + '11'.repeat(32)
    };

    try {
      const analysis = await this.findOptimalRoutes(mockParams);

      return {
        fastestRoute: analysis.analysis.speedRank[0] || null,
        cheapestRoute: analysis.analysis.costRank[0] || null,
        mostReliableRoute: analysis.analysis.reliabilityRank[0] || null
      };
    } catch (error) {
      logger.error('Failed to get route recommendations', { error });
      return {
        fastestRoute: null,
        cheapestRoute: null,
        mostReliableRoute: null
      };
    }
  }

  /**
   * Check route availability
   */
  async checkRouteAvailability(sourceChain: string, destinationChain: string): Promise<{
    isAvailable: boolean;
    reason?: string;
    alternatives: string[];
  }> {
    const sourceConnected = this.connectionManager.isConnected(sourceChain);
    const destinationConnected = this.connectionManager.isConnected(destinationChain);

    if (!sourceConnected) {
      return {
        isAvailable: false,
        reason: `Source chain not connected: ${sourceChain}`,
        alternatives: this.connectionManager.getConnectedChains()
      };
    }

    if (!destinationConnected) {
      return {
        isAvailable: false,
        reason: `Destination chain not connected: ${destinationChain}`,
        alternatives: this.connectionManager.getConnectedChains()
      };
    }

    const directRoute = `${sourceChain}-${destinationChain}`;
    const hasDirectRoute = directRoute in XCM_ROUTES;

    if (hasDirectRoute) {
      return {
        isAvailable: true,
        alternatives: []
      };
    }

    // Check for hub routes
    const hubAlternatives = [];
    const hubs = ['assetHub', 'polkadot'];

    for (const hub of hubs) {
      const hop1 = `${sourceChain}-${hub}`;
      const hop2 = `${hub}-${destinationChain}`;

      if (hop1 in XCM_ROUTES && hop2 in XCM_ROUTES) {
        hubAlternatives.push(`${sourceChain} -> ${hub} -> ${destinationChain}`);
      }
    }

    return {
      isAvailable: hubAlternatives.length > 0,
      reason: hubAlternatives.length === 0 ? 'No available routes found' : undefined,
      alternatives: hubAlternatives
    };
  }

  /**
   * Generate cache key for route analysis
   */
  private generateRouteKey(params: XCMTransferParams): string {
    return `${params.sourceChain}-${params.destinationChain}-${params.asset.symbol}-${params.priority || 'normal'}`;
  }

  /**
   * Get cached route analysis
   */
  private getCachedAnalysis(key: string): RouteAnalysis | null {
    const cached = this.routeCache.get(key);
    if (cached && cached.expiry > Date.now()) {
      return cached.analysis;
    }
    return null;
  }

  /**
   * Cache route analysis
   */
  private cacheAnalysis(key: string, analysis: RouteAnalysis): void {
    this.routeCache.set(key, {
      analysis,
      expiry: Date.now() + this.cacheTimeout
    });
  }

  /**
   * Clear expired cache entries
   */
  clearExpiredCache(): void {
    const now = Date.now();
    for (const [key, cached] of this.routeCache.entries()) {
      if (cached.expiry <= now) {
        this.routeCache.delete(key);
      }
    }
  }

  /**
   * Get optimization statistics
   */
  getOptimizationStats(): {
    cachedAnalyses: number;
    routeGraph: { nodes: number; edges: number };
    supportedRoutes: number;
  } {
    return {
      cachedAnalyses: this.routeCache.size,
      routeGraph: {
        nodes: this.routeGraph.size,
        edges: Array.from(this.routeGraph.values()).reduce((sum, edges) => sum + edges.length, 0)
      },
      supportedRoutes: Object.keys(XCM_ROUTES).length
    };
  }
}