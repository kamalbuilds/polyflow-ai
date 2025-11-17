/**
 * Type definitions for Learning System
 */

export interface FeedbackData {
  requestId: string;
  rating: number; // 1-5 scale
  category?: string;
  comments?: string;
  intent?: string;
  generatedCode?: string;
  userId?: string;
  timestamp?: Date;
  processed?: boolean;
  tags?: string[];
  metadata?: Record<string, any>;
}

export interface ModelTrainingData {
  name: string;
  type: 'code_generation' | 'code_analysis' | 'pattern_recognition' | 'optimization';
  baseModel?: string;
  examples: TrainingExample[];
  epochs?: number;
  batchSize?: number;
  learningRate?: number;
  validationSplit?: number;
  metadata?: {
    description?: string;
    version?: string;
    creator?: string;
  };
}

export interface TrainingExample {
  input: string;
  expectedOutput: string;
  category?: string;
  difficulty?: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  framework?: string;
  language?: string;
  systemPrompt?: string;
  metadata?: Record<string, any>;
}

export interface PatternRecognition {
  id: string;
  name: string;
  description: string;
  category: string;
  triggers: string[];
  confidence: number;
  successRate: number;
  examples: string[];
  improvements: string[];
  lastUpdated: Date;
  lastUsed?: Date;
  usageCount?: number;
  contextRequirements?: string[];
}

export interface ABTestConfig {
  id: string;
  name: string;
  description: string;
  variants: TestVariant[];
  metrics: string[];
  startDate: Date;
  endDate: Date;
  status: 'active' | 'paused' | 'completed' | 'draft';
  results?: ABTestResultData[];
  targetSampleSize?: number;
  confidenceLevel?: number;
}

export interface TestVariant {
  id: string;
  name: string;
  weight: number; // Percentage of traffic
  configuration?: Record<string, any>;
  description?: string;
}

export interface ABTestResultData {
  variant: string;
  metrics: Record<string, number>;
  timestamp: Date;
  userId?: string;
  sessionId?: string;
}

export interface ABTestResult {
  testId: string;
  variants: Array<{
    variantId: string;
    sampleSize: number;
    metrics: Record<string, number>;
    confidence: number;
  }>;
  winner: string | null;
  significance: number;
  recommendation: string;
  insights?: string[];
}

export interface PerformanceMetrics {
  timestamp: Date;
  codeGenerationStats: {
    total: number;
    successful: number;
    failed: number;
    averageResponseTime: number;
  };
  codeAnalysisStats: {
    total: number;
    successful: number;
    failed: number;
    averageResponseTime: number;
  };
  apiStats: {
    totalRequests: number;
    averageResponseTime: number;
    errorRate: number;
  };
  feedbackStats: {
    total: number;
    averageRating: number;
  };
}

export interface ModelVersion {
  id: string;
  name: string;
  version: string;
  baseModel: string;
  trainingData: {
    size: number;
    type: string;
    quality: number;
  };
  performance: {
    accuracy: number;
    latency: number;
    tokenEfficiency: number;
  };
  status: 'training' | 'completed' | 'failed' | 'deployed' | 'deprecated';
  createdAt: Date;
  updatedAt: Date;
  deployedAt?: Date;
  metrics?: ModelPerformanceMetrics;
}

export interface ModelPerformanceMetrics {
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  bleuScore?: number; // For code generation
  codeCompilationRate?: number;
  userSatisfactionScore?: number;
  responseTime: {
    p50: number;
    p95: number;
    p99: number;
  };
  tokenEfficiency: {
    averageTokensPerRequest: number;
    compressionRatio: number;
  };
}

export interface LearningRequest {
  type: 'feedback' | 'pattern_update' | 'model_training' | 'ab_test';
  data: any;
  userId?: string;
  timestamp?: Date;
}

export interface LearningResponse {
  success: boolean;
  message?: string;
  data?: any;
  modelId?: string;
  trainingJobId?: string;
  estimatedCompletionTime?: Date;
  metrics?: {
    datasetSize?: number;
    epochs?: number;
    estimatedCost?: number;
    accuracy?: number;
  };
}

export type LearningStrategy =
  | 'supervised'
  | 'unsupervised'
  | 'reinforcement'
  | 'transfer'
  | 'few_shot'
  | 'meta_learning';

export interface ReinforcementSignal {
  action: string;
  reward: number;
  state: any;
  nextState: any;
  done: boolean;
  timestamp: Date;
}

export interface KnowledgeTransfer {
  sourceModel: string;
  targetDomain: string;
  transferMethod: 'fine_tuning' | 'feature_extraction' | 'domain_adaptation';
  performance: {
    beforeTransfer: number;
    afterTransfer: number;
    improvement: number;
  };
}

export interface LearningCurve {
  epoch: number;
  trainingLoss: number;
  validationLoss: number;
  trainingAccuracy: number;
  validationAccuracy: number;
  learningRate: number;
  timestamp: Date;
}

export interface HyperparameterOptimization {
  parameters: Record<string, any>;
  objective: 'maximize' | 'minimize';
  metric: string;
  trials: Array<{
    parameters: Record<string, any>;
    score: number;
    duration: number;
  }>;
  bestTrial: {
    parameters: Record<string, any>;
    score: number;
  };
}

export interface DataAugmentation {
  technique: string;
  parameters: Record<string, any>;
  originalSize: number;
  augmentedSize: number;
  quality: number;
  examples: string[];
}

export interface FeatureEngineering {
  features: Array<{
    name: string;
    type: 'numerical' | 'categorical' | 'text' | 'embedding';
    importance: number;
    description: string;
  }>;
  transformations: Array<{
    name: string;
    description: string;
    impact: number;
  }>;
}

export interface ModelEvaluation {
  metrics: ModelPerformanceMetrics;
  confusionMatrix?: number[][];
  featureImportance?: Array<{
    feature: string;
    importance: number;
  }>;
  predictions: Array<{
    input: any;
    predicted: any;
    actual: any;
    confidence: number;
  }>;
  errors: Array<{
    input: any;
    predicted: any;
    actual: any;
    error: string;
  }>;
}

export interface ContinualLearning {
  strategy: 'elastic_weight_consolidation' | 'progressive_networks' | 'replay_buffer';
  forgettingRate: number;
  retentionStrategy: string;
  performanceMonitoring: {
    oldTasks: number;
    newTasks: number;
    overallPerformance: number;
  };
}