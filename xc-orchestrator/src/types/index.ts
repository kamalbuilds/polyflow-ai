import { BN } from '@polkadot/util';
import { SubmittableExtrinsic } from '@polkadot/api/types';
import { ISubmittableResult } from '@polkadot/types/types';

export interface ChainConfig {
  id: string;
  name: string;
  wsEndpoint: string;
  parachainId?: number;
  isRelay?: boolean;
  nativeToken: string;
  decimals: number;
  ss58Format: number;
  blockTime: number;
  maxRetries: number;
  retryDelay: number;
}

export interface AssetInfo {
  assetId: string | number;
  symbol: string;
  decimals: number;
  minBalance: BN;
  isNative: boolean;
  location?: MultiLocation;
}

export interface MultiLocation {
  parents: number;
  interior: {
    [key: string]: any;
  };
}

export interface XCMRoute {
  id: string;
  sourceChain: string;
  destinationChain: string;
  asset: AssetInfo;
  estimatedFee: BN;
  estimatedDuration: number;
  confidence: number;
  path: string[];
  lastUpdated: Date;
}

export interface XCMTransferParams {
  sourceChain: string;
  destinationChain: string;
  asset: AssetInfo;
  amount: BN;
  sender: string;
  recipient: string;
  route?: XCMRoute;
  maxFee?: BN;
  priority?: 'low' | 'normal' | 'high';
}

export interface XCMTransaction {
  id: string;
  params: XCMTransferParams;
  status: TransactionStatus;
  sourceBlockHash?: string;
  sourceBlockNumber?: number;
  destinationBlockHash?: string;
  destinationBlockNumber?: number;
  extrinsic?: SubmittableExtrinsic<'promise', ISubmittableResult>;
  actualFee?: BN;
  error?: string;
  retryCount: number;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

export enum TransactionStatus {
  PENDING = 'pending',
  BUILDING = 'building',
  SUBMITTED = 'submitted',
  IN_BLOCK = 'in_block',
  FINALIZED = 'finalized',
  SUCCESS = 'success',
  FAILED = 'failed',
  RETRYING = 'retrying'
}

export interface FeeEstimation {
  baseFee: BN;
  deliveryFee: BN;
  totalFee: BN;
  feeAsset: AssetInfo;
  confidence: number;
  timestamp: Date;
}

export interface RouteAnalysis {
  routes: XCMRoute[];
  bestRoute: XCMRoute;
  alternatives: XCMRoute[];
  analysis: {
    speedRank: XCMRoute[];
    costRank: XCMRoute[];
    reliabilityRank: XCMRoute[];
  };
}

export interface ChainEvent {
  chainId: string;
  blockNumber: number;
  blockHash: string;
  eventIndex: number;
  section: string;
  method: string;
  data: any[];
  timestamp: Date;
  transactionId?: string;
}

export interface NotificationConfig {
  webhook?: string;
  email?: string;
  discord?: string;
  slack?: string;
  telegram?: string;
}

export interface MonitoringMetrics {
  activeTransactions: number;
  completedTransactions: number;
  failedTransactions: number;
  averageProcessingTime: number;
  totalVolume: BN;
  uniqueUsers: number;
  chainHealth: Record<string, boolean>;
  lastUpdated: Date;
}

export interface OrchestrationConfig {
  maxConcurrentTransactions: number;
  enableAutoRetry: boolean;
  enableFeeOptimization: boolean;
  enableRouteOptimization: boolean;
  monitoringInterval: number;
  cacheTimeout: number;
  notifications: NotificationConfig;
}

export interface EventFilter {
  chains: string[];
  sections: string[];
  methods: string[];
  addresses?: string[];
  transactionIds?: string[];
}

export interface AnalyticsData {
  transactionVolume: {
    daily: Record<string, number>;
    weekly: Record<string, number>;
    monthly: Record<string, number>;
  };
  popularRoutes: Array<{
    route: string;
    count: number;
    volume: BN;
  }>;
  feeAnalysis: {
    average: BN;
    median: BN;
    trends: Array<{
      date: string;
      averageFee: BN;
    }>;
  };
  performanceMetrics: {
    averageExecutionTime: number;
    successRate: number;
    errorRate: number;
  };
}