/**
 * Type definitions for AI Service
 */

export type AIProvider = 'openai' | 'anthropic';

export interface CodeGenerationRequest {
  requestId: string;
  intent: string;
  language: string;
  framework?: string;
  environment?: string;
  requirements?: string[];
  context?: string;
  variables?: Record<string, any>;
  strategy?: GenerationStrategy;
  template?: string;
  userId?: string;
  preferredProvider?: AIProvider;
  optimizationLevel?: 'basic' | 'advanced' | 'expert';
  includeTests?: boolean;
  includeSecurity?: boolean;
}

export interface CodeGenerationResponse {
  requestId: string;
  generatedCode: string;
  language: string;
  framework?: string;
  confidence: number;
  suggestions: string[];
  securityNotes: string[];
  performanceNotes: string[];
  optimizationSuggestions?: string[];
  testSuggestions?: string[];
  templateUsed?: string;
  parsedRequirements?: any;
  metadata: {
    tokenCount?: number;
    responseTime?: number;
    model?: string;
    provider?: AIProvider;
    temperature?: number;
    strategy?: string;
    templateId?: string;
    templateVersion?: string;
    baseCodeLength?: number;
    cacheHit?: boolean;
  };
}

export interface CodeAnalysisRequest {
  requestId: string;
  code: string;
  language: string;
  framework?: string;
  analysisTypes?: string[];
  focusAreas?: string[];
  userId?: string;
}

export interface CodeAnalysisResponse {
  requestId: string;
  securityIssues: Array<{
    severity: string;
    description: string;
    recommendation: string;
  }>;
  performanceIssues: Array<{
    type: string;
    description: string;
    impact: string;
    recommendation: string;
  }>;
  codeQuality: {
    score: number;
    issues: string[];
    strengths: string[];
  };
  suggestions: string[];
  compliance: Array<{
    standard: string;
    issue: string;
    recommendation: string;
  }>;
  metadata: {
    tokenCount?: number;
    responseTime?: number;
    model?: string;
    codeLength?: number;
    analysisTime?: number;
    rulesApplied?: number;
    codeHash?: string;
  };
}

export interface AIModelConfig {
  primaryProvider: AIProvider;
  openaiModel: string;
  anthropicModel: string;
  maxTokens: number;
  temperature: number;
  topP: number;
  frequencyPenalty: number;
  presencePenalty: number;
}

export interface PromptTemplate {
  id: string;
  name: string;
  description: string;
  template: string;
  variables: string[];
  category: string;
  language?: string;
  framework?: string;
}

export type GenerationStrategy = 'template' | 'ai' | 'hybrid' | 'auto';

export interface ContextData {
  knowledgeEntries: string[];
  patterns: string[];
  examples: string[];
  bestPractices: string[];
  securityGuidelines: string[];
}

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCost: number;
}

export interface ModelCapabilities {
  maxTokens: number;
  languages: string[];
  frameworks: string[];
  specialties: string[];
  costPerToken: number;
}