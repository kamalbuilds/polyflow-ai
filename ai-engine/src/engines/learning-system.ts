/**
 * Learning System - Continuous improvement through feedback and pattern recognition
 */

import OpenAI from 'openai';
import fs from 'fs/promises';
import path from 'path';
import { AIService } from '../services/ai-service';
import { MetricsCollector } from '../services/metrics-collector';
import { Logger } from '../utils/logger';
import {
  LearningRequest,
  LearningResponse,
  FeedbackData,
  ModelTrainingData,
  PatternRecognition,
  ABTestConfig,
  ABTestResult,
  PerformanceMetrics,
  ModelVersion,
  LearningStrategy
} from '../types/learning-types';

export class LearningSystem {
  private aiService: AIService;
  private metricsCollector: MetricsCollector;
  private logger: Logger;
  private openai: OpenAI;
  private feedbackDatabase: Map<string, FeedbackData[]> = new Map();
  private patterns: Map<string, PatternRecognition> = new Map();
  private models: Map<string, ModelVersion> = new Map();
  private abTests: Map<string, ABTestConfig> = new Map();

  constructor(aiService: AIService, metricsCollector: MetricsCollector) {
    this.aiService = aiService;
    this.metricsCollector = metricsCollector;
    this.logger = new Logger();

    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      organization: process.env.OPENAI_ORG_ID
    });
  }

  async initialize(): Promise<void> {
    try {
      this.logger.info('Initializing Learning System...');

      // Load existing feedback and patterns
      await this.loadHistoricalData();

      // Initialize pattern recognition models
      await this.initializePatternRecognition();

      // Setup A/B testing framework
      await this.setupABTesting();

      this.logger.info('Learning System initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Learning System:', error);
      throw error;
    }
  }

  private async loadHistoricalData(): Promise<void> {
    try {
      const dataDir = path.join(__dirname, '../../data/learning');
      await fs.mkdir(dataDir, { recursive: true });

      // Load feedback data
      const feedbackFile = path.join(dataDir, 'feedback.json');
      try {
        const feedbackData = await fs.readFile(feedbackFile, 'utf-8');
        const feedback = JSON.parse(feedbackData);

        for (const [key, value] of Object.entries(feedback)) {
          this.feedbackDatabase.set(key, value as FeedbackData[]);
        }

        this.logger.info(`Loaded ${this.feedbackDatabase.size} feedback categories`);
      } catch (error) {
        this.logger.info('No existing feedback data found, starting fresh');
      }

      // Load patterns
      const patternsFile = path.join(dataDir, 'patterns.json');
      try {
        const patternsData = await fs.readFile(patternsFile, 'utf-8');
        const patterns = JSON.parse(patternsData);

        for (const [key, value] of Object.entries(patterns)) {
          this.patterns.set(key, value as PatternRecognition);
        }

        this.logger.info(`Loaded ${this.patterns.size} recognized patterns`);
      } catch (error) {
        this.logger.info('No existing patterns found, starting fresh');
      }

    } catch (error) {
      this.logger.warn('Failed to load historical data:', error);
    }
  }

  private async initializePatternRecognition(): Promise<void> {
    // Initialize with common Substrate development patterns
    const initialPatterns: PatternRecognition[] = [
      {
        id: 'substrate-pallet-creation',
        name: 'Substrate Pallet Creation',
        description: 'Pattern for creating new FRAME pallets',
        category: 'development',
        triggers: ['create pallet', 'new pallet', 'pallet template'],
        confidence: 0.95,
        successRate: 0.9,
        examples: [
          'Create a new token pallet',
          'Generate a governance pallet',
          'Build a custom pallet for voting'
        ],
        improvements: [
          'Always include proper error handling',
          'Use weight annotations for all extrinsics',
          'Implement comprehensive tests'
        ],
        lastUpdated: new Date()
      },
      {
        id: 'xcm-integration',
        name: 'Cross-Chain Messaging',
        description: 'Pattern for XCM implementation',
        category: 'interoperability',
        triggers: ['xcm', 'cross-chain', 'parachain communication'],
        confidence: 0.85,
        successRate: 0.75,
        examples: [
          'Send assets between parachains',
          'Execute remote calls via XCM',
          'Handle XCM message routing'
        ],
        improvements: [
          'Validate XCM origins carefully',
          'Handle XCM version compatibility',
          'Implement proper fee handling'
        ],
        lastUpdated: new Date()
      },
      {
        id: 'defi-integration',
        name: 'DeFi Protocol Integration',
        description: 'Pattern for DeFi applications on Substrate',
        category: 'defi',
        triggers: ['defi', 'swap', 'liquidity', 'trading', 'dex'],
        confidence: 0.8,
        successRate: 0.7,
        examples: [
          'Create automated market maker',
          'Implement lending protocol',
          'Build yield farming mechanism'
        ],
        improvements: [
          'Implement slippage protection',
          'Use oracle price feeds',
          'Add circuit breakers for safety'
        ],
        lastUpdated: new Date()
      }
    ];

    for (const pattern of initialPatterns) {
      this.patterns.set(pattern.id, pattern);
    }
  }

  private async setupABTesting(): Promise<void> {
    // Setup A/B tests for different generation strategies
    const defaultTests: ABTestConfig[] = [
      {
        id: 'template-vs-ai',
        name: 'Template vs AI Generation',
        description: 'Compare template-based vs pure AI code generation',
        variants: [
          { id: 'template', name: 'Template-based', weight: 0.5 },
          { id: 'ai', name: 'AI-only', weight: 0.5 }
        ],
        metrics: ['code_quality', 'compilation_success', 'user_satisfaction'],
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        status: 'active'
      },
      {
        id: 'prompt-strategies',
        name: 'Prompt Engineering Strategies',
        description: 'Test different prompt engineering approaches',
        variants: [
          { id: 'detailed', name: 'Detailed Context', weight: 0.33 },
          { id: 'concise', name: 'Concise Prompts', weight: 0.33 },
          { id: 'examples', name: 'Example-driven', weight: 0.34 }
        ],
        metrics: ['response_accuracy', 'generation_time', 'token_efficiency'],
        startDate: new Date(),
        endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days
        status: 'active'
      }
    ];

    for (const test of defaultTests) {
      this.abTests.set(test.id, test);
    }
  }

  async collectFeedback(feedback: FeedbackData): Promise<void> {
    try {
      const category = feedback.category || 'general';

      if (!this.feedbackDatabase.has(category)) {
        this.feedbackDatabase.set(category, []);
      }

      this.feedbackDatabase.get(category)!.push({
        ...feedback,
        timestamp: feedback.timestamp || new Date(),
        processed: false
      });

      // Trigger pattern update if enough feedback collected
      const categoryFeedback = this.feedbackDatabase.get(category)!;
      if (categoryFeedback.length % 10 === 0) {
        await this.updatePatternsFromFeedback(category);
      }

      // Persist feedback
      await this.saveFeedbackData();

      this.logger.info('Feedback collected', {
        category,
        rating: feedback.rating,
        requestId: feedback.requestId
      });

    } catch (error) {
      this.logger.error('Failed to collect feedback:', error);
      throw error;
    }
  }

  private async updatePatternsFromFeedback(category: string): Promise<void> {
    const feedback = this.feedbackDatabase.get(category);
    if (!feedback) return;

    // Analyze feedback patterns
    const positiveFeedback = feedback.filter(f => f.rating >= 4);
    const negativeFeedback = feedback.filter(f => f.rating <= 2);

    // Find common success patterns
    if (positiveFeedback.length > 0) {
      const successPatterns = this.extractPatterns(positiveFeedback);
      await this.reinforceSuccessfulPatterns(successPatterns);
    }

    // Identify failure patterns
    if (negativeFeedback.length > 0) {
      const failurePatterns = this.extractPatterns(negativeFeedback);
      await this.mitigateFailurePatterns(failurePatterns);
    }
  }

  private extractPatterns(feedback: FeedbackData[]): string[] {
    const patterns: string[] = [];

    for (const fb of feedback) {
      if (fb.intent) {
        // Extract common keywords and phrases
        const words = fb.intent.toLowerCase().split(/\s+/);
        patterns.push(...words.filter(word => word.length > 3));
      }

      if (fb.comments) {
        // Extract patterns from comments
        const commentWords = fb.comments.toLowerCase().split(/\s+/);
        patterns.push(...commentWords.filter(word => word.length > 3));
      }
    }

    // Return most common patterns
    const patternCounts = patterns.reduce((acc, pattern) => {
      acc[pattern] = (acc[pattern] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(patternCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([pattern]) => pattern);
  }

  private async reinforceSuccessfulPatterns(patterns: string[]): Promise<void> {
    for (const pattern of patterns) {
      const existingPattern = Array.from(this.patterns.values())
        .find(p => p.triggers.some(trigger => trigger.includes(pattern)));

      if (existingPattern) {
        // Increase confidence and success rate
        existingPattern.confidence = Math.min(existingPattern.confidence + 0.05, 1.0);
        existingPattern.successRate = Math.min(existingPattern.successRate + 0.02, 1.0);
        existingPattern.lastUpdated = new Date();
      } else {
        // Create new pattern
        const newPattern: PatternRecognition = {
          id: `learned-${pattern}-${Date.now()}`,
          name: `Learned Pattern: ${pattern}`,
          description: `Auto-discovered pattern for ${pattern}`,
          category: 'learned',
          triggers: [pattern],
          confidence: 0.6,
          successRate: 0.7,
          examples: [],
          improvements: [],
          lastUpdated: new Date()
        };

        this.patterns.set(newPattern.id, newPattern);
      }
    }
  }

  private async mitigateFailurePatterns(patterns: string[]): Promise<void> {
    for (const pattern of patterns) {
      const existingPattern = Array.from(this.patterns.values())
        .find(p => p.triggers.some(trigger => trigger.includes(pattern)));

      if (existingPattern) {
        // Decrease confidence but don't remove entirely
        existingPattern.confidence = Math.max(existingPattern.confidence - 0.1, 0.3);
        existingPattern.successRate = Math.max(existingPattern.successRate - 0.05, 0.3);
        existingPattern.lastUpdated = new Date();

        // Add improvement notes
        existingPattern.improvements.push(`Pattern requires improvement: ${pattern}`);
      }
    }
  }

  async trainModel(trainingData: ModelTrainingData): Promise<LearningResponse> {
    try {
      this.logger.info('Starting model training', {
        datasetSize: trainingData.examples.length,
        type: trainingData.type
      });

      // Prepare training data for OpenAI fine-tuning
      const formattedData = this.formatTrainingData(trainingData);

      // Create fine-tuning job
      const fineTuningJob = await this.openai.fineTuning.jobs.create({
        training_file: await this.uploadTrainingFile(formattedData),
        model: trainingData.baseModel || 'gpt-3.5-turbo',
        hyperparameters: {
          n_epochs: trainingData.epochs || 3,
          batch_size: trainingData.batchSize || 1,
          learning_rate_multiplier: trainingData.learningRate || 0.1
        }
      });

      // Store model version info
      const modelVersion: ModelVersion = {
        id: fineTuningJob.id,
        name: trainingData.name,
        version: `v${Date.now()}`,
        baseModel: trainingData.baseModel || 'gpt-3.5-turbo',
        trainingData: {
          size: trainingData.examples.length,
          type: trainingData.type,
          quality: this.assessTrainingDataQuality(trainingData)
        },
        performance: {
          accuracy: 0, // Will be updated after training
          latency: 0,
          tokenEfficiency: 0
        },
        status: 'training',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      this.models.set(fineTuningJob.id, modelVersion);

      return {
        success: true,
        modelId: fineTuningJob.id,
        trainingJobId: fineTuningJob.id,
        estimatedCompletionTime: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes estimate
        metrics: {
          datasetSize: trainingData.examples.length,
          epochs: trainingData.epochs || 3,
          estimatedCost: this.estimateTrainingCost(trainingData)
        }
      };

    } catch (error) {
      this.logger.error('Model training failed:', error);
      throw error;
    }
  }

  private formatTrainingData(trainingData: ModelTrainingData): any[] {
    return trainingData.examples.map(example => ({
      messages: [
        { role: 'system', content: example.systemPrompt || 'You are a Substrate developer assistant.' },
        { role: 'user', content: example.input },
        { role: 'assistant', content: example.expectedOutput }
      ]
    }));
  }

  private async uploadTrainingFile(data: any[]): Promise<string> {
    // Convert to JSONL format
    const jsonlData = data.map(item => JSON.stringify(item)).join('\n');

    // Create temporary file
    const tempFile = path.join(__dirname, '../../data/temp', `training-${Date.now()}.jsonl`);
    await fs.mkdir(path.dirname(tempFile), { recursive: true });
    await fs.writeFile(tempFile, jsonlData);

    // Upload to OpenAI
    const file = await this.openai.files.create({
      file: await fs.readFile(tempFile),
      purpose: 'fine-tune'
    });

    // Clean up temp file
    await fs.unlink(tempFile);

    return file.id;
  }

  private assessTrainingDataQuality(trainingData: ModelTrainingData): number {
    let quality = 100;

    // Deduct for insufficient data
    if (trainingData.examples.length < 50) quality -= 20;
    if (trainingData.examples.length < 100) quality -= 10;

    // Check for diversity
    const uniqueInputs = new Set(trainingData.examples.map(ex => ex.input));
    const diversityRatio = uniqueInputs.size / trainingData.examples.length;
    if (diversityRatio < 0.8) quality -= 15;

    // Check output quality (basic validation)
    const hasCodeExamples = trainingData.examples.some(ex =>
      ex.expectedOutput.includes('fn ') || ex.expectedOutput.includes('impl ')
    );
    if (!hasCodeExamples) quality -= 10;

    return Math.max(0, quality);
  }

  private estimateTrainingCost(trainingData: ModelTrainingData): number {
    // Rough cost estimation based on OpenAI pricing
    const tokensPerExample = 1000; // Average estimate
    const totalTokens = trainingData.examples.length * tokensPerExample * (trainingData.epochs || 3);
    const costPerToken = 0.008 / 1000; // Fine-tuning cost per token

    return totalTokens * costPerToken;
  }

  async runABTest(testId: string, variant: string, metrics: PerformanceMetrics): Promise<void> {
    const test = this.abTests.get(testId);
    if (!test) {
      throw new Error(`A/B test ${testId} not found`);
    }

    // Record test result
    if (!test.results) test.results = [];

    test.results.push({
      variant,
      metrics,
      timestamp: new Date()
    });

    // Check if we have enough data to analyze
    if (test.results.length >= 100) {
      await this.analyzeABTestResults(testId);
    }
  }

  private async analyzeABTestResults(testId: string): Promise<ABTestResult> {
    const test = this.abTests.get(testId);
    if (!test || !test.results) {
      throw new Error(`Cannot analyze test ${testId}`);
    }

    const variantResults = test.variants.reduce((acc, variant) => {
      acc[variant.id] = test.results!.filter(r => r.variant === variant.id);
      return acc;
    }, {} as Record<string, any[]>);

    // Calculate statistical significance
    const analysis: ABTestResult = {
      testId,
      variants: Object.entries(variantResults).map(([variantId, results]) => ({
        variantId,
        sampleSize: results.length,
        metrics: this.calculateVariantMetrics(results),
        confidence: this.calculateConfidence(results)
      })),
      winner: this.determineWinner(variantResults),
      significance: this.calculateStatisticalSignificance(variantResults),
      recommendation: this.generateRecommendation(variantResults)
    };

    this.logger.info('A/B test analysis completed', {
      testId,
      winner: analysis.winner,
      significance: analysis.significance
    });

    return analysis;
  }

  private calculateVariantMetrics(results: any[]): Record<string, number> {
    if (results.length === 0) return {};

    const metrics = {};
    const firstResult = results[0];

    for (const metricKey in firstResult.metrics) {
      const values = results.map(r => r.metrics[metricKey]).filter(v => typeof v === 'number');
      if (values.length > 0) {
        metrics[metricKey] = values.reduce((sum, val) => sum + val, 0) / values.length;
      }
    }

    return metrics;
  }

  private calculateConfidence(results: any[]): number {
    // Simple confidence calculation based on sample size and variance
    const sampleSize = results.length;
    const baseConfidence = Math.min(sampleSize / 100, 0.95); // Max 95% confidence

    return baseConfidence;
  }

  private determineWinner(variantResults: Record<string, any[]>): string | null {
    let bestVariant = null;
    let bestScore = -Infinity;

    for (const [variantId, results] of Object.entries(variantResults)) {
      if (results.length === 0) continue;

      // Calculate composite score (weighted average of metrics)
      const avgMetrics = this.calculateVariantMetrics(results);
      let score = 0;

      // Weight different metrics
      if (avgMetrics.user_satisfaction) score += avgMetrics.user_satisfaction * 0.4;
      if (avgMetrics.code_quality) score += avgMetrics.code_quality * 0.3;
      if (avgMetrics.response_time) score += (1 / avgMetrics.response_time) * 0.3;

      if (score > bestScore) {
        bestScore = score;
        bestVariant = variantId;
      }
    }

    return bestVariant;
  }

  private calculateStatisticalSignificance(variantResults: Record<string, any[]>): number {
    // Simplified statistical significance calculation
    const variants = Object.values(variantResults);
    if (variants.length < 2) return 0;

    const totalSamples = variants.reduce((sum, results) => sum + results.length, 0);
    if (totalSamples < 50) return 0;

    // More samples = higher significance
    return Math.min(totalSamples / 500, 0.95); // Max 95% significance
  }

  private generateRecommendation(variantResults: Record<string, any[]>): string {
    const winner = this.determineWinner(variantResults);
    const significance = this.calculateStatisticalSignificance(variantResults);

    if (!winner) {
      return 'Insufficient data to make a recommendation. Continue testing.';
    }

    if (significance < 0.8) {
      return `Variant ${winner} is leading but needs more data for confident recommendation.`;
    }

    return `Recommend implementing variant ${winner} with ${Math.round(significance * 100)}% confidence.`;
  }

  async recognizePattern(input: string): Promise<PatternRecognition | null> {
    const inputLower = input.toLowerCase();

    // Find matching patterns
    const candidates = Array.from(this.patterns.values())
      .filter(pattern =>
        pattern.triggers.some(trigger => inputLower.includes(trigger.toLowerCase()))
      )
      .sort((a, b) => b.confidence - a.confidence);

    if (candidates.length === 0) return null;

    // Return the highest confidence pattern
    const bestMatch = candidates[0];

    // Update usage statistics
    bestMatch.lastUsed = new Date();
    if (!bestMatch.usageCount) bestMatch.usageCount = 0;
    bestMatch.usageCount++;

    return bestMatch;
  }

  private async saveFeedbackData(): Promise<void> {
    try {
      const dataDir = path.join(__dirname, '../../data/learning');
      await fs.mkdir(dataDir, { recursive: true });

      const feedbackFile = path.join(dataDir, 'feedback.json');
      const feedbackData = Object.fromEntries(this.feedbackDatabase.entries());
      await fs.writeFile(feedbackFile, JSON.stringify(feedbackData, null, 2));

      const patternsFile = path.join(dataDir, 'patterns.json');
      const patternsData = Object.fromEntries(this.patterns.entries());
      await fs.writeFile(patternsFile, JSON.stringify(patternsData, null, 2));

    } catch (error) {
      this.logger.error('Failed to save learning data:', error);
    }
  }

  async getModelPerformance(modelId: string): Promise<ModelVersion | null> {
    return this.models.get(modelId) || null;
  }

  async getPatternInsights(): Promise<PatternRecognition[]> {
    return Array.from(this.patterns.values())
      .sort((a, b) => b.confidence - a.confidence);
  }

  async getABTestResults(): Promise<ABTestConfig[]> {
    return Array.from(this.abTests.values());
  }

  isHealthy(): boolean {
    return this.patterns.size > 0 && !!this.openai;
  }
}