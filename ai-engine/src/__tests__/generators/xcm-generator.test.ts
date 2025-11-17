/**
 * @file XCM Generator Tests
 * @description Tests for AI-powered XCM (Cross-Consensus Messaging) generation
 */

import { XCMGenerator } from '../../generators/XCMGenerator';
import { XCMValidator } from '../../validators/XCMValidator';
import { createMockXCMRequest } from '../../../tests/setup/ai-engine.setup';

describe('XCMGenerator', () => {
  let generator: XCMGenerator;
  let validator: XCMValidator;

  beforeEach(() => {
    generator = new XCMGenerator();
    validator = new XCMValidator();
  });

  describe('Basic XCM Message Generation', () => {
    it('should generate a basic asset transfer message', async () => {
      const request = createMockXCMRequest();

      const result = await generator.generateXCM({
        ...request,
        operation: 'transfer',
      });

      expect(result).toBeDefined();
      expect(result.xcm).toContain('WithdrawAsset');
      expect(result.xcm).toContain('DepositAsset');
      expect(result.xcm).toContain('BuyExecution');
      expect(result.metadata.operation).toBe('transfer');
      expect(result.metadata.sourceChain).toBe('asset-hub');
      expect(result.metadata.destinationChain).toBe('hydration');
    });

    it('should generate proper asset withdrawal instructions', async () => {
      const request = createMockXCMRequest();

      const result = await generator.generateXCM({
        ...request,
        asset: { symbol: 'DOT', amount: '5000000000000' },
      });

      expect(result.xcm).toContain('WithdrawAsset');
      expect(result.xcm).toContain('Fungible(5000000000000)');
      expect(result.metadata.assetAmount).toBe('5000000000000');
    });

    it('should include proper execution fee calculation', async () => {
      const request = createMockXCMRequest();

      const result = await generator.generateXCM({
        ...request,
        operation: 'transfer',
      });

      expect(result.xcm).toContain('BuyExecution');
      expect(result.metadata.estimatedFee).toBeDefined();
      expect(result.metadata.estimatedFee).toBeGreaterThan('0');
    });

    it('should generate correct beneficiary addressing', async () => {
      const request = createMockXCMRequest();

      const result = await generator.generateXCM({
        ...request,
        recipient: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
      });

      expect(result.xcm).toContain('AccountId32');
      expect(result.xcm).toContain('5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY');
      expect(result.metadata.recipientType).toBe('AccountId32');
    });
  });

  describe('Advanced XCM Operations', () => {
    it('should generate multi-asset transfers', async () => {
      const request = createMockXCMRequest();

      const result = await generator.generateXCM({
        ...request,
        operation: 'multi_transfer',
        assets: [
          { symbol: 'DOT', amount: '1000000000000' },
          { symbol: 'USDT', amount: '100000000' },
        ],
      });

      expect(result.xcm).toContain('MultiAssets::from');
      expect(result.metadata.assetCount).toBe(2);
    });

    it('should generate teleport operations', async () => {
      const request = createMockXCMRequest();

      const result = await generator.generateXCM({
        ...request,
        operation: 'teleport',
        sourceChain: 'polkadot',
        destinationChain: 'asset-hub',
      });

      expect(result.xcm).toContain('InitiateTeleport');
      expect(result.metadata.trustLevel).toBe('teleport');
    });

    it('should generate reserve-backed transfers', async () => {
      const request = createMockXCMRequest();

      const result = await generator.generateXCM({
        ...request,
        operation: 'reserve_transfer',
        sourceChain: 'asset-hub',
        destinationChain: 'astar',
      });

      expect(result.xcm).toContain('InitiateReserveWithdraw');
      expect(result.metadata.trustLevel).toBe('reserve');
    });

    it('should handle complex multi-hop routing', async () => {
      const request = createMockXCMRequest();

      const result = await generator.generateXCM({
        ...request,
        operation: 'multi_hop',
        route: ['asset-hub', 'acala', 'moonbeam'],
      });

      expect(result.xcm).toContain('DepositReserveAsset');
      expect(result.metadata.hopCount).toBe(3);
    });
  });

  describe('Chain-Specific Optimizations', () => {
    it('should optimize for Polkadot relay chain', async () => {
      const request = createMockXCMRequest();

      const result = await generator.generateXCM({
        ...request,
        sourceChain: 'polkadot',
        destinationChain: 'asset-hub',
      });

      expect(result.metadata.optimizations).toContain('relay_chain');
      expect(result.metadata.estimatedWeight).toBeLessThan(1000000000);
    });

    it('should handle Kusama ecosystem specifics', async () => {
      const request = createMockXCMRequest();

      const result = await generator.generateXCM({
        ...request,
        sourceChain: 'kusama',
        destinationChain: 'karura',
      });

      expect(result.metadata.network).toBe('kusama');
      expect(result.metadata.chainSpecs.kusama).toBeDefined();
    });

    it('should optimize for parachain-to-parachain transfers', async () => {
      const request = createMockXCMRequest();

      const result = await generator.generateXCM({
        ...request,
        sourceChain: 'acala',
        destinationChain: 'moonbeam',
      });

      expect(result.xcm).toContain('parents: 1');
      expect(result.metadata.transferType).toBe('parachain_to_parachain');
    });
  });

  describe('Security and Validation', () => {
    it('should validate asset amounts', async () => {
      const request = createMockXCMRequest();

      await expect(generator.generateXCM({
        ...request,
        asset: { symbol: 'DOT', amount: '0' },
      })).rejects.toThrow('Asset amount must be greater than 0');
    });

    it('should validate recipient addresses', async () => {
      const request = createMockXCMRequest();

      await expect(generator.generateXCM({
        ...request,
        recipient: 'invalid_address',
      })).rejects.toThrow('Invalid recipient address format');
    });

    it('should validate chain compatibility', async () => {
      const request = createMockXCMRequest();

      await expect(generator.generateXCM({
        ...request,
        sourceChain: 'ethereum', // Not compatible
        destinationChain: 'polkadot',
      })).rejects.toThrow('Unsupported chain');
    });

    it('should detect potential security risks', async () => {
      const request = createMockXCMRequest();

      const result = await generator.generateXCM({
        ...request,
        asset: { symbol: 'DOT', amount: '1000000000000000' }, // Very large amount
      });

      expect(result.metadata.warnings).toContain('large_amount');
      expect(result.metadata.riskLevel).toBe('high');
    });
  });

  describe('Fee Estimation and Optimization', () => {
    it('should provide accurate fee estimations', async () => {
      const request = createMockXCMRequest();

      const result = await generator.generateXCM({
        ...request,
        operation: 'transfer',
      });

      expect(result.metadata.estimatedFee).toBeDefined();
      expect(result.metadata.feeBreakdown).toHaveProperty('execution');
      expect(result.metadata.feeBreakdown).toHaveProperty('delivery');
    });

    it('should optimize fees for different execution contexts', async () => {
      const request = createMockXCMRequest();

      const standardResult = await generator.generateXCM({
        ...request,
        feeOptimization: 'standard',
      });

      const economyResult = await generator.generateXCM({
        ...request,
        feeOptimization: 'economy',
      });

      const standardFee = parseFloat(standardResult.metadata.estimatedFee);
      const economyFee = parseFloat(economyResult.metadata.estimatedFee);

      expect(economyFee).toBeLessThan(standardFee);
    });

    it('should handle fee payment in different assets', async () => {
      const request = createMockXCMRequest();

      const result = await generator.generateXCM({
        ...request,
        feeAsset: 'USDT',
      });

      expect(result.xcm).toContain('fees: MultiAsset');
      expect(result.metadata.feeAsset).toBe('USDT');
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should generate error handling instructions', async () => {
      const request = createMockXCMRequest();

      const result = await generator.generateXCM({
        ...request,
        includeErrorHandling: true,
      });

      expect(result.xcm).toContain('SetErrorHandler');
      expect(result.xcm).toContain('SetAppendix');
    });

    it('should handle timeout scenarios', async () => {
      const request = createMockXCMRequest();

      const result = await generator.generateXCM({
        ...request,
        timeout: 100, // blocks
      });

      expect(result.metadata.timeout).toBe(100);
      expect(result.xcm).toContain('SetTopic');
    });

    it('should provide refund mechanisms', async () => {
      const request = createMockXCMRequest();

      const result = await generator.generateXCM({
        ...request,
        includeRefund: true,
      });

      expect(result.xcm).toContain('RefundSurplus');
      expect(result.metadata.refundEnabled).toBe(true);
    });
  });

  describe('Message Versioning and Compatibility', () => {
    it('should generate V3 XCM messages by default', async () => {
      const request = createMockXCMRequest();

      const result = await generator.generateXCM(request);

      expect(result.metadata.xcmVersion).toBe('v3');
      expect(result.xcm).toContain('use xcm::v3::');
    });

    it('should support backward compatibility with V2', async () => {
      const request = createMockXCMRequest();

      const result = await generator.generateXCM({
        ...request,
        xcmVersion: 'v2',
      });

      expect(result.metadata.xcmVersion).toBe('v2');
      expect(result.xcm).toContain('use xcm::v2::');
    });

    it('should handle version-specific features', async () => {
      const request = createMockXCMRequest();

      const v3Result = await generator.generateXCM({
        ...request,
        xcmVersion: 'v3',
      });

      const v2Result = await generator.generateXCM({
        ...request,
        xcmVersion: 'v2',
      });

      // V3 has more features
      expect(v3Result.metadata.supportedInstructions.length)
        .toBeGreaterThan(v2Result.metadata.supportedInstructions.length);
    });
  });

  describe('Testing and Simulation', () => {
    it('should provide dry-run simulation data', async () => {
      const request = createMockXCMRequest();

      const result = await generator.generateXCM({
        ...request,
        includeDryRun: true,
      });

      expect(result.dryRun).toBeDefined();
      expect(result.dryRun.success).toBe(true);
      expect(result.dryRun.weightUsed).toBeDefined();
    });

    it('should generate test cases', async () => {
      const request = createMockXCMRequest();

      const result = await generator.generateXCM({
        ...request,
        generateTests: true,
      });

      expect(result.testCases).toBeDefined();
      expect(result.testCases).toHaveLength(3); // Success, failure, edge cases
    });

    it('should validate against known working patterns', async () => {
      const request = createMockXCMRequest();

      const result = await generator.generateXCM(request);

      const validation = await validator.validate(result.xcm);
      expect(validation.isValid).toBe(true);
      expect(validation.issues).toHaveLength(0);
    });
  });
});