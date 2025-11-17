import { ApiPromise } from '@polkadot/api';
import { BN, u8aToHex } from '@polkadot/util';
import { Keyring } from '@polkadot/keyring';
import { cryptoWaitReady } from '@polkadot/util-crypto';
import {
  XCMTransferParams,
  MultiLocation,
  AssetInfo,
  XCMTransaction,
  TransactionStatus
} from '../types';
import { ConnectionManager } from './ConnectionManager';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';

export class XCMMessageBuilder {
  private connectionManager: ConnectionManager;
  private keyring: Keyring;

  constructor(connectionManager: ConnectionManager) {
    this.connectionManager = connectionManager;
    this.keyring = new Keyring({ type: 'sr25519' });
  }

  /**
   * Initialize the message builder
   */
  async initialize(): Promise<void> {
    await cryptoWaitReady();
    logger.info('XCM Message Builder initialized');
  }

  /**
   * Build XCM transfer message for asset transfer between chains
   */
  async buildTransferMessage(params: XCMTransferParams): Promise<XCMTransaction> {
    logger.info('Building XCM transfer message', {
      sourceChain: params.sourceChain,
      destinationChain: params.destinationChain,
      asset: params.asset.symbol,
      amount: params.amount.toString()
    });

    const transaction: XCMTransaction = {
      id: uuidv4(),
      params,
      status: TransactionStatus.BUILDING,
      retryCount: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    try {
      const sourceApi = this.connectionManager.getConnection(params.sourceChain);
      if (!sourceApi) {
        throw new Error(`No connection available for source chain: ${params.sourceChain}`);
      }

      // Build the appropriate XCM message based on source chain type
      let extrinsic;

      if (params.sourceChain === 'polkadot' || params.sourceChain === 'kusama') {
        // Relay chain to parachain transfer
        extrinsic = await this.buildReserveTransferAssets(sourceApi, params);
      } else if (params.destinationChain === 'polkadot' || params.destinationChain === 'kusama') {
        // Parachain to relay chain transfer
        extrinsic = await this.buildWithdrawAssets(sourceApi, params);
      } else {
        // Parachain to parachain transfer
        extrinsic = await this.buildLimitedReserveTransferAssets(sourceApi, params);
      }

      transaction.extrinsic = extrinsic;
      transaction.status = TransactionStatus.PENDING;
      transaction.updatedAt = new Date();

      logger.info('XCM transfer message built successfully', {
        transactionId: transaction.id,
        extrinsicHash: extrinsic.hash.toHex()
      });

      return transaction;
    } catch (error) {
      logger.error('Failed to build XCM transfer message', {
        error,
        transactionId: transaction.id
      });

      transaction.status = TransactionStatus.FAILED;
      transaction.error = error instanceof Error ? error.message : String(error);
      transaction.updatedAt = new Date();

      throw error;
    }
  }

  /**
   * Build reserve transfer assets extrinsic (relay chain to parachain)
   */
  private async buildReserveTransferAssets(
    api: ApiPromise,
    params: XCMTransferParams
  ) {
    const destination = this.buildDestinationMultiLocation(params.destinationChain);
    const beneficiary = this.buildBeneficiaryMultiLocation(params.recipient);
    const assets = this.buildAssetsMultiLocation([params.asset], [params.amount]);
    const feeAssetItem = 0; // First asset pays fees

    return api.tx.xcmPallet.reserveTransferAssets(
      destination,
      beneficiary,
      assets,
      feeAssetItem
    );
  }

  /**
   * Build limited reserve transfer assets extrinsic (parachain to parachain)
   */
  private async buildLimitedReserveTransferAssets(
    api: ApiPromise,
    params: XCMTransferParams
  ) {
    const destination = this.buildDestinationMultiLocation(params.destinationChain);
    const beneficiary = this.buildBeneficiaryMultiLocation(params.recipient);
    const assets = this.buildAssetsMultiLocation([params.asset], [params.amount]);
    const feeAssetItem = 0;
    const weightLimit = 'Unlimited'; // Can be optimized

    return api.tx.xcmPallet.limitedReserveTransferAssets(
      destination,
      beneficiary,
      assets,
      feeAssetItem,
      weightLimit
    );
  }

  /**
   * Build withdraw assets extrinsic (parachain to relay chain)
   */
  private async buildWithdrawAssets(
    api: ApiPromise,
    params: XCMTransferParams
  ) {
    const destination = this.buildDestinationMultiLocation(params.destinationChain);
    const beneficiary = this.buildBeneficiaryMultiLocation(params.recipient);
    const assets = this.buildAssetsMultiLocation([params.asset], [params.amount]);
    const feeAssetItem = 0;
    const weightLimit = 'Unlimited';

    return api.tx.xcmPallet.limitedTeleportAssets(
      destination,
      beneficiary,
      assets,
      feeAssetItem,
      weightLimit
    );
  }

  /**
   * Build destination multi-location
   */
  private buildDestinationMultiLocation(chainId: string): MultiLocation {
    const chainConfigs: Record<string, MultiLocation> = {
      polkadot: { parents: 0, interior: 'Here' },
      kusama: { parents: 0, interior: 'Here' },
      assetHub: {
        parents: 0,
        interior: { X1: { Parachain: 1000 } }
      },
      assetHubKusama: {
        parents: 0,
        interior: { X1: { Parachain: 1000 } }
      },
      hydration: {
        parents: 0,
        interior: { X1: { Parachain: 2034 } }
      },
      moonbeam: {
        parents: 0,
        interior: { X1: { Parachain: 2004 } }
      },
      astar: {
        parents: 0,
        interior: { X1: { Parachain: 2006 } }
      }
    };

    const destination = chainConfigs[chainId];
    if (!destination) {
      throw new Error(`Unsupported destination chain: ${chainId}`);
    }

    return destination;
  }

  /**
   * Build beneficiary multi-location
   */
  private buildBeneficiaryMultiLocation(recipient: string): MultiLocation {
    return {
      parents: 0,
      interior: {
        X1: {
          AccountId32: {
            network: null,
            id: recipient
          }
        }
      }
    };
  }

  /**
   * Build assets multi-location
   */
  private buildAssetsMultiLocation(assets: AssetInfo[], amounts: BN[]): any {
    return assets.map((asset, index) => ({
      id: this.buildAssetLocation(asset),
      fun: {
        Fungible: amounts[index]
      }
    }));
  }

  /**
   * Build asset location
   */
  private buildAssetLocation(asset: AssetInfo): MultiLocation {
    if (asset.isNative) {
      return { parents: 0, interior: 'Here' };
    }

    if (asset.location) {
      return asset.location;
    }

    // Default for asset hub assets
    return {
      parents: 0,
      interior: {
        X2: [
          { PalletInstance: 50 },
          { GeneralIndex: asset.assetId }
        ]
      }
    };
  }

  /**
   * Build XCM message for custom operations
   */
  async buildCustomXCMMessage(
    sourceChain: string,
    instructions: any[],
    destination: MultiLocation
  ) {
    const sourceApi = this.connectionManager.getConnection(sourceChain);
    if (!sourceApi) {
      throw new Error(`No connection available for source chain: ${sourceChain}`);
    }

    const message = {
      V3: instructions
    };

    return sourceApi.tx.xcmPallet.send(destination, message);
  }

  /**
   * Estimate message size and complexity
   */
  estimateMessageComplexity(params: XCMTransferParams): {
    size: number;
    complexity: 'low' | 'medium' | 'high';
    estimatedGas: BN;
  } {
    let complexity: 'low' | 'medium' | 'high' = 'low';
    let baseGas = new BN('1000000000'); // 1 unit of gas

    // Simple native asset transfer
    if (params.asset.isNative) {
      complexity = 'low';
      baseGas = baseGas.muln(1);
    }
    // Non-native asset transfer
    else {
      complexity = 'medium';
      baseGas = baseGas.muln(2);
    }

    // Cross-chain complexity
    if (params.sourceChain !== params.destinationChain) {
      complexity = 'high';
      baseGas = baseGas.muln(3);
    }

    const estimatedSize = this.calculateMessageSize(params);

    return {
      size: estimatedSize,
      complexity,
      estimatedGas: baseGas
    };
  }

  /**
   * Calculate approximate message size
   */
  private calculateMessageSize(params: XCMTransferParams): number {
    const baseSize = 200; // Base XCM message size
    const assetSize = 50; // Per asset
    const addressSize = 32; // Account size

    return baseSize + assetSize + addressSize * 2; // sender + recipient
  }

  /**
   * Validate XCM transfer parameters
   */
  validateTransferParams(params: XCMTransferParams): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // Check if chains are supported
    if (!this.connectionManager.isConnected(params.sourceChain)) {
      errors.push(`Source chain not connected: ${params.sourceChain}`);
    }

    // Validate amount
    if (params.amount.isZero() || params.amount.isNeg()) {
      errors.push('Amount must be positive');
    }

    // Check minimum balance
    if (params.asset.minBalance && params.amount.lt(new BN(params.asset.minBalance))) {
      errors.push(`Amount below minimum balance: ${params.asset.minBalance}`);
    }

    // Validate addresses
    try {
      this.keyring.decodeAddress(params.sender);
      this.keyring.decodeAddress(params.recipient);
    } catch (error) {
      errors.push('Invalid sender or recipient address');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}