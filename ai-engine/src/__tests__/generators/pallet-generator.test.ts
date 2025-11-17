/**
 * @file Pallet Generator Tests
 * @description Comprehensive tests for AI-powered Substrate pallet generation
 */

import { PalletGenerator } from '../../generators/PalletGenerator';
import { CodeAnalyzer } from '../../analyzers/CodeAnalyzer';
import { createMockCodeGenerationRequest, mockCodeTemplates } from '../../../tests/setup/ai-engine.setup';

describe('PalletGenerator', () => {
  let generator: PalletGenerator;
  let analyzer: CodeAnalyzer;

  beforeEach(() => {
    generator = new PalletGenerator();
    analyzer = new CodeAnalyzer();
  });

  describe('Basic Code Generation', () => {
    it('should generate a basic pallet structure', async () => {
      const request = createMockCodeGenerationRequest();

      const result = await generator.generatePallet({
        ...request,
        prompt: 'Create a simple counter pallet',
      });

      expect(result).toBeDefined();
      expect(result.code).toContain('#[frame_support::pallet]');
      expect(result.code).toContain('pub mod pallet');
      expect(result.code).toContain('#[pallet::config]');
      expect(result.metadata.palletName).toBe('counter');
      expect(result.metadata.complexity).toBe('basic');
    });

    it('should generate storage items correctly', async () => {
      const request = createMockCodeGenerationRequest();

      const result = await generator.generatePallet({
        ...request,
        prompt: 'Create a pallet with a counter storage item',
      });

      expect(result.code).toContain('#[pallet::storage]');
      expect(result.code).toContain('StorageValue');
      expect(result.code).toContain('Counter');
      expect(result.metadata.storageItems).toContain('Counter');
    });

    it('should generate extrinsics with proper validation', async () => {
      const request = createMockCodeGenerationRequest();

      const result = await generator.generatePallet({
        ...request,
        prompt: 'Create a pallet with increment and decrement functions',
      });

      expect(result.code).toContain('#[pallet::call]');
      expect(result.code).toContain('ensure_signed');
      expect(result.code).toContain('DispatchResult');
      expect(result.metadata.extrinsics).toEqual(
        expect.arrayContaining(['increment', 'decrement'])
      );
    });

    it('should generate events correctly', async () => {
      const request = createMockCodeGenerationRequest();

      const result = await generator.generatePallet({
        ...request,
        prompt: 'Create a pallet that emits events on state changes',
      });

      expect(result.code).toContain('#[pallet::event]');
      expect(result.code).toContain('#[pallet::generate_deposit');
      expect(result.code).toContain('Self::deposit_event');
    });
  });

  describe('Advanced Features', () => {
    it('should handle complex business logic', async () => {
      const request = createMockCodeGenerationRequest();

      const result = await generator.generatePallet({
        ...request,
        prompt: 'Create a DEX pallet with liquidity pools and swapping',
      });

      expect(result.code).toContain('LiquidityPool');
      expect(result.code).toContain('swap_tokens');
      expect(result.code).toContain('add_liquidity');
      expect(result.metadata.complexity).toBe('advanced');
      expect(result.metadata.dependencies).toContain('frame-support');
    });

    it('should generate proper weight calculations', async () => {
      const request = createMockCodeGenerationRequest();

      const result = await generator.generatePallet({
        ...request,
        prompt: 'Create a pallet with weight-optimized operations',
      });

      expect(result.code).toContain('#[pallet::weight');
      expect(result.code).toContain('DbWeight');
      expect(result.metadata.weightCalculations).toBeDefined();
    });

    it('should handle multi-asset operations', async () => {
      const request = createMockCodeGenerationRequest();

      const result = await generator.generatePallet({
        ...request,
        prompt: 'Create a multi-asset token manager pallet',
      });

      expect(result.code).toContain('AssetId');
      expect(result.code).toContain('MultiAsset');
      expect(result.metadata.assets).toBeDefined();
    });
  });

  describe('Error Handling and Validation', () => {
    it('should handle invalid prompts gracefully', async () => {
      const request = createMockCodeGenerationRequest();

      await expect(generator.generatePallet({
        ...request,
        prompt: '',
      })).rejects.toThrow('Prompt cannot be empty');
    });

    it('should validate generated code syntax', async () => {
      const request = createMockCodeGenerationRequest();

      const result = await generator.generatePallet({
        ...request,
        prompt: 'Create a valid Rust pallet',
      });

      const syntaxCheck = await analyzer.validateSyntax(result.code);
      expect(syntaxCheck.isValid).toBe(true);
      expect(syntaxCheck.errors).toHaveLength(0);
    });

    it('should detect potential security issues', async () => {
      const request = createMockCodeGenerationRequest();

      const result = await generator.generatePallet({
        ...request,
        prompt: 'Create a pallet with user input handling',
      });

      const securityCheck = await analyzer.checkSecurity(result.code);
      expect(securityCheck.overflowProtection).toBe(true);
      expect(securityCheck.inputValidation).toBe(true);
    });

    it('should enforce best practices', async () => {
      const request = createMockCodeGenerationRequest();

      const result = await generator.generatePallet({
        ...request,
        prompt: 'Create a production-ready pallet',
      });

      const bestPractices = await analyzer.checkBestPractices(result.code);
      expect(bestPractices.documentation).toBeGreaterThan(0.8);
      expect(bestPractices.errorHandling).toBe(true);
      expect(bestPractices.testing).toBeDefined();
    });
  });

  describe('Context-Aware Generation', () => {
    it('should use project context for better generation', async () => {
      const request = createMockCodeGenerationRequest();
      request.context.projectType = 'gaming';
      request.context.features = ['nft', 'marketplace'];

      const result = await generator.generatePallet({
        ...request,
        prompt: 'Create a gaming-related pallet',
      });

      expect(result.code).toContain('NonFungibleToken');
      expect(result.metadata.category).toBe('gaming');
    });

    it('should adapt to target chain specifications', async () => {
      const request = createMockCodeGenerationRequest();
      request.context.targetChain = 'kusama';

      const result = await generator.generatePallet({
        ...request,
        prompt: 'Create a Kusama-compatible pallet',
      });

      expect(result.metadata.compatibility.kusama).toBe(true);
      expect(result.metadata.targetChain).toBe('kusama');
    });

    it('should consider existing project pallets', async () => {
      const request = createMockCodeGenerationRequest();
      request.context.existingPallets = ['balances', 'identity'];

      const result = await generator.generatePallet({
        ...request,
        prompt: 'Create a pallet that works with existing balances',
      });

      expect(result.code).toContain('T::Currency');
      expect(result.metadata.dependencies).toContain('balances');
    });
  });

  describe('Performance and Optimization', () => {
    it('should generate code in reasonable time', async () => {
      const request = createMockCodeGenerationRequest();
      const startTime = Date.now();

      await generator.generatePallet({
        ...request,
        prompt: 'Create a complex DeFi pallet',
      });

      const elapsed = Date.now() - startTime;
      expect(elapsed).toBeLessThan(10000); // Less than 10 seconds
    });

    it('should cache similar requests', async () => {
      const request = createMockCodeGenerationRequest();

      // First request
      const result1 = await generator.generatePallet({
        ...request,
        prompt: 'Create a simple token pallet',
      });

      // Similar request should be faster
      const startTime = Date.now();
      const result2 = await generator.generatePallet({
        ...request,
        prompt: 'Create a basic token pallet',
      });
      const elapsed = Date.now() - startTime;

      expect(elapsed).toBeLessThan(1000); // Should be cached/faster
      expect(result2.metadata.cached).toBe(true);
    });

    it('should handle concurrent requests', async () => {
      const request = createMockCodeGenerationRequest();

      const promises = Array(5).fill(null).map((_, i) =>
        generator.generatePallet({
          ...request,
          prompt: `Create pallet ${i}`,
        })
      );

      const results = await Promise.all(promises);

      expect(results).toHaveLength(5);
      results.forEach((result, i) => {
        expect(result.code).toContain('#[frame_support::pallet]');
        expect(result.metadata.requestId).toBeDefined();
      });
    });
  });

  describe('Template System', () => {
    it('should use appropriate templates for different pallet types', async () => {
      const request = createMockCodeGenerationRequest();

      const dexResult = await generator.generatePallet({
        ...request,
        prompt: 'Create a DEX pallet',
      });

      const nftResult = await generator.generatePallet({
        ...request,
        prompt: 'Create an NFT pallet',
      });

      expect(dexResult.metadata.template).toBe('dex');
      expect(nftResult.metadata.template).toBe('nft');
      expect(dexResult.code).not.toBe(nftResult.code);
    });

    it('should support custom templates', async () => {
      const customTemplate = mockCodeTemplates.pallet.basic;
      const request = createMockCodeGenerationRequest();

      const result = await generator.generatePallet({
        ...request,
        prompt: 'Use custom template',
        template: customTemplate,
      });

      expect(result.code).toContain('Basic pallet structure');
      expect(result.metadata.templateUsed).toBe('custom');
    });
  });

  describe('Integration with External Services', () => {
    it('should integrate with vector database for context', async () => {
      const request = createMockCodeGenerationRequest();

      const result = await generator.generatePallet({
        ...request,
        prompt: 'Create a pallet similar to existing governance pallets',
      });

      expect(result.metadata.similarPallets).toBeDefined();
      expect(result.metadata.contextScore).toBeGreaterThan(0.7);
    });

    it('should use AI model fallbacks', async () => {
      // Simulate primary model failure
      const originalGenerate = generator.aiService.generate;
      generator.aiService.generate = jest.fn()
        .mockRejectedValueOnce(new Error('Primary model unavailable'))
        .mockResolvedValueOnce({ code: 'fallback code' });

      const request = createMockCodeGenerationRequest();

      const result = await generator.generatePallet({
        ...request,
        prompt: 'Create a pallet with model fallback',
      });

      expect(result.code).toContain('fallback');
      expect(result.metadata.modelUsed).toBe('fallback');

      generator.aiService.generate = originalGenerate;
    });
  });
});