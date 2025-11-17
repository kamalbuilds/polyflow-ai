/**
 * AI Service - Core OpenAI integration for code generation and analysis
 */

import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { encoding_for_model } from 'tiktoken';
import { KnowledgeBase } from './knowledge-base';
import { MetricsCollector } from './metrics-collector';
import { Logger } from '../utils/logger';
import { CacheService } from './cache-service';
import { RequirementParser } from '../engines/requirement-parser';
import {
  CodeGenerationRequest,
  CodeGenerationResponse,
  CodeAnalysisRequest,
  CodeAnalysisResponse,
  AIModelConfig,
  PromptTemplate,
  AIProvider
} from '../types/ai-types';

export class AIService {
  private openai: OpenAI;
  private anthropic: Anthropic;
  private knowledgeBase: KnowledgeBase;
  private metricsCollector: MetricsCollector;
  private logger: Logger;
  private cacheService: CacheService;
  private requirementParser: RequirementParser;
  private tokenizers: Map<string, any> = new Map();
  private config: AIModelConfig;
  private providers: AIProvider[];

  constructor(knowledgeBase: KnowledgeBase, metricsCollector: MetricsCollector) {
    this.knowledgeBase = knowledgeBase;
    this.metricsCollector = metricsCollector;
    this.logger = new Logger();
    this.cacheService = new CacheService();
    this.requirementParser = new RequirementParser();

    // Initialize AI providers
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      organization: process.env.OPENAI_ORG_ID
    });

    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    });

    this.config = {
      primaryProvider: (process.env.PRIMARY_AI_PROVIDER as AIProvider) || 'anthropic',
      openaiModel: process.env.OPENAI_MODEL || 'gpt-4-turbo-preview',
      anthropicModel: process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20241022',
      maxTokens: parseInt(process.env.MAX_TOKENS || '8000', 10),
      temperature: parseFloat(process.env.TEMPERATURE || '0.3'),
      topP: parseFloat(process.env.TOP_P || '0.9'),
      frequencyPenalty: parseFloat(process.env.FREQUENCY_PENALTY || '0.1'),
      presencePenalty: parseFloat(process.env.PRESENCE_PENALTY || '0.1')
    };

    this.providers = ['openai', 'anthropic'];
  }

  async initialize(): Promise<void> {
    try {
      this.logger.info('Initializing AI Service...');

      // Initialize cache service
      await this.cacheService.initialize();

      // Initialize requirement parser
      await this.requirementParser.initialize();

      // Initialize tokenizers
      try {
        this.tokenizers.set('gpt-4', encoding_for_model('gpt-4'));
        this.tokenizers.set('gpt-3.5-turbo', encoding_for_model('gpt-3.5-turbo'));
      } catch (error) {
        this.logger.warn('Failed to initialize tokenizers:', error);
      }

      // Test connections to all providers
      await this.testConnections();

      this.setInitialized();
      this.logger.info('AI Service initialized successfully with providers:', this.providers);
    } catch (error) {
      this.logger.error('Failed to initialize AI Service:', error);
      throw error;
    }
  }

  private async testConnections(): Promise<void> {
    const connectionTests = [];

    // Test OpenAI
    if (process.env.OPENAI_API_KEY) {
      connectionTests.push(this.testOpenAIConnection());
    }

    // Test Anthropic
    if (process.env.ANTHROPIC_API_KEY) {
      connectionTests.push(this.testAnthropicConnection());
    }

    const results = await Promise.allSettled(connectionTests);

    const failedTests = results.filter(result => result.status === 'rejected');
    if (failedTests.length === results.length) {
      throw new Error('All AI provider connections failed');
    }

    this.logger.info(`AI Service connections tested: ${results.length - failedTests.length}/${results.length} successful`);
  }

  private async testOpenAIConnection(): Promise<void> {
    try {
      const response = await this.openai.chat.completions.create({
        model: this.config.openaiModel,
        messages: [{ role: 'user', content: 'Hello' }],
        max_tokens: 10
      });

      if (!response.choices || response.choices.length === 0) {
        throw new Error('Invalid response from OpenAI');
      }

      this.logger.info('OpenAI connection test successful');
    } catch (error) {
      this.logger.error('OpenAI connection test failed:', error);
      throw error;
    }
  }

  private async testAnthropicConnection(): Promise<void> {
    try {
      const response = await this.anthropic.messages.create({
        model: this.config.anthropicModel,
        max_tokens: 10,
        messages: [{ role: 'user', content: 'Hello' }]
      });

      if (!response.content || response.content.length === 0) {
        throw new Error('Invalid response from Anthropic');
      }

      this.logger.info('Anthropic connection test successful');
    } catch (error) {
      this.logger.error('Anthropic connection test failed:', error);
      throw error;
    }
  }

  async generateCode(request: CodeGenerationRequest): Promise<CodeGenerationResponse> {
    const startTime = Date.now();

    try {
      this.logger.info('Generating code for request:', {
        intent: request.intent,
        language: request.language,
        framework: request.framework,
        provider: request.preferredProvider || this.config.primaryProvider
      });

      // Parse and enhance requirements
      const parsedRequirements = await this.requirementParser.parse(request.intent);

      // Check cache first
      const cacheKey = this.generateCacheKey(request, parsedRequirements);
      const cachedResponse = await this.cacheService.get(cacheKey);
      if (cachedResponse) {
        this.logger.info('Returning cached response');
        return cachedResponse;
      }

      // Get relevant knowledge context
      const context = await this.knowledgeBase.getRelevantContext(
        request.intent,
        request.language,
        request.framework,
        parsedRequirements
      );

      // Build enhanced prompt with parsed requirements
      const prompt = this.buildEnhancedCodeGenerationPrompt(request, context, parsedRequirements);

      // Determine provider and generate code
      const provider = request.preferredProvider || this.config.primaryProvider;
      let generatedCode: string;
      let tokenCount: number;
      let confidence: number;

      if (provider === 'anthropic' && process.env.ANTHROPIC_API_KEY) {
        const result = await this.generateWithAnthropic(prompt, 'code_generation');
        generatedCode = result.content;
        tokenCount = result.tokenCount;
        confidence = 0.9;
      } else {
        const result = await this.generateWithOpenAI(prompt, 'code_generation');
        generatedCode = result.content;
        tokenCount = result.tokenCount;
        confidence = this.calculateConfidenceOpenAI(result.completion);
      }

      const responseTime = Date.now() - startTime;

      // Track metrics
      await this.metricsCollector.trackCodeGeneration({
        requestId: request.requestId,
        intent: request.intent,
        language: request.language,
        framework: request.framework,
        provider,
        tokenCount,
        responseTime,
        success: true,
        cacheHit: false
      });

      const response: CodeGenerationResponse = {
        requestId: request.requestId,
        generatedCode,
        language: request.language,
        framework: request.framework,
        confidence,
        suggestions: this.extractSuggestions(generatedCode),
        securityNotes: this.extractSecurityNotes(generatedCode),
        performanceNotes: this.extractPerformanceNotes(generatedCode),
        optimizationSuggestions: await this.generateOptimizationSuggestions(generatedCode, request),
        testSuggestions: await this.generateTestSuggestions(generatedCode, request),
        parsedRequirements,
        metadata: {
          tokenCount,
          responseTime,
          provider,
          model: provider === 'anthropic' ? this.config.anthropicModel : this.config.openaiModel,
          temperature: this.config.temperature,
          cacheHit: false
        }
      };

      // Cache the response
      await this.cacheService.set(cacheKey, response, 3600); // 1 hour cache

      this.logger.info('Code generation completed successfully', {
        requestId: request.requestId,
        responseTime,
        provider
      });

      return response;

    } catch (error) {
      const responseTime = Date.now() - startTime;

      await this.metricsCollector.trackCodeGeneration({
        requestId: request.requestId,
        intent: request.intent,
        language: request.language,
        framework: request.framework,
        provider: request.preferredProvider || this.config.primaryProvider,
        tokenCount: 0,
        responseTime,
        success: false,
        cacheHit: false,
        error: (error as Error).message
      });

      this.logger.error('Code generation failed:', error);
      throw error;
    }
  }

  async analyzeCode(request: CodeAnalysisRequest): Promise<CodeAnalysisResponse> {
    const startTime = Date.now();

    try {
      this.logger.info('Analyzing code:', { language: request.language });

      const prompt = this.buildCodeAnalysisPrompt(request);
      const tokenCount = Math.ceil(prompt.length / 4); // Rough estimate

      const completion = await this.openai.chat.completions.create({
        model: this.config.model,
        messages: [
          {
            role: 'system',
            content: this.getSystemPrompt('code_analysis')
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: this.config.maxTokens,
        temperature: 0.2 // Lower temperature for analysis
      });

      const analysis = completion.choices[0]?.message?.content || '';
      const responseTime = Date.now() - startTime;

      const response: CodeAnalysisResponse = {
        requestId: request.requestId,
        securityIssues: this.extractSecurityIssues(analysis),
        performanceIssues: this.extractPerformanceIssues(analysis),
        codeQuality: this.extractCodeQuality(analysis),
        suggestions: this.extractImprovementSuggestions(analysis),
        compliance: this.extractComplianceIssues(analysis),
        metadata: {
          tokenCount,
          responseTime,
          model: this.config.model
        }
      };

      await this.metricsCollector.trackCodeAnalysis({
        requestId: request.requestId,
        language: request.language,
        codeLength: request.code.length,
        tokenCount,
        responseTime,
        success: true
      });

      return response;

    } catch (error) {
      const responseTime = Date.now() - startTime;

      await this.metricsCollector.trackCodeAnalysis({
        requestId: request.requestId,
        language: request.language,
        codeLength: request.code.length,
        tokenCount: 0,
        responseTime,
        success: false,
        error: (error as Error).message
      });

      this.logger.error('Code analysis failed:', error);
      throw error;
    }
  }

  private buildCodeGenerationPrompt(request: CodeGenerationRequest, context: string): string {
    return `
# Code Generation Request

## User Intent
${request.intent}

## Target Specifications
- Language: ${request.language}
- Framework: ${request.framework}
- Environment: ${request.environment || 'development'}

## Additional Requirements
${request.requirements ? request.requirements.join('\n') : 'None specified'}

## Relevant Knowledge Context
${context}

## Output Requirements
- Generate production-ready code following best practices
- Include comprehensive error handling
- Add detailed comments explaining key concepts
- Follow security best practices for blockchain development
- Optimize for performance and gas efficiency
- Include unit test suggestions

Please generate the requested code with high quality and attention to detail.
`;
  }

  private buildCodeAnalysisPrompt(request: CodeAnalysisRequest): string {
    return `
# Code Analysis Request

## Code to Analyze
\`\`\`${request.language}
${request.code}
\`\`\`

## Analysis Focus Areas
${request.analysisTypes?.join(', ') || 'All areas'}

## Analysis Requirements
Please provide a comprehensive analysis covering:
1. Security vulnerabilities and potential exploits
2. Performance bottlenecks and optimization opportunities
3. Code quality and maintainability issues
4. Best practices compliance
5. Gas optimization suggestions (if applicable)
6. Error handling improvements
7. Testing recommendations

Provide specific, actionable suggestions for each issue found.
`;
  }

  private getSystemPrompt(type: 'code_generation' | 'code_analysis'): string {
    const basePrompt = `
You are an expert Polkadot/Substrate developer with deep knowledge of:
- Substrate framework and FRAME pallets
- Rust programming for blockchain development
- Cross-chain messaging and XCM
- Polkadot ecosystem best practices
- Security patterns in blockchain development
- Performance optimization and gas efficiency

You understand the latest Substrate features, security patterns, and ecosystem standards.
`;

    if (type === 'code_generation') {
      return basePrompt + `
Generate high-quality, production-ready code that:
- Follows Substrate and FRAME best practices
- Implements proper error handling and safety checks
- Uses efficient algorithms and data structures
- Includes comprehensive documentation
- Follows Rust coding conventions
- Implements security best practices
- Is optimized for performance and resource usage
`;
    } else {
      return basePrompt + `
Analyze code for:
- Security vulnerabilities and potential attack vectors
- Performance issues and optimization opportunities
- Code quality and maintainability concerns
- Compliance with best practices
- Error handling and edge cases
- Testing coverage and recommendations

Provide specific, actionable feedback with clear explanations.
`;
    }
  }

  private generateCacheKey(request: CodeGenerationRequest, parsedRequirements: any): string {
    const keyData = {
      intent: request.intent,
      language: request.language,
      framework: request.framework,
      requirements: request.requirements,
      variables: request.variables,
      provider: request.preferredProvider || this.config.primaryProvider
    };
    return JSON.stringify(keyData);
  }

  private async generateWithAnthropic(prompt: string, type: 'code_generation' | 'code_analysis'): Promise<{
    content: string;
    tokenCount: number;
  }> {
    const systemPrompt = this.getSystemPrompt(type);

    const response = await this.anthropic.messages.create({
      model: this.config.anthropicModel,
      max_tokens: this.config.maxTokens,
      temperature: this.config.temperature,
      system: systemPrompt,
      messages: [{
        role: 'user',
        content: prompt
      }]
    });

    const content = response.content[0]?.type === 'text' ? response.content[0].text : '';
    const tokenCount = response.usage?.input_tokens + response.usage?.output_tokens || 0;

    return { content, tokenCount };
  }

  private async generateWithOpenAI(prompt: string, type: 'code_generation' | 'code_analysis'): Promise<{
    content: string;
    tokenCount: number;
    completion: OpenAI.Chat.Completions.ChatCompletion;
  }> {
    const completion = await this.openai.chat.completions.create({
      model: this.config.openaiModel,
      messages: [
        {
          role: 'system',
          content: this.getSystemPrompt(type)
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: this.config.maxTokens,
      temperature: this.config.temperature,
      top_p: this.config.topP,
      frequency_penalty: this.config.frequencyPenalty,
      presence_penalty: this.config.presencePenalty
    });

    const content = completion.choices[0]?.message?.content || '';
    const tokenCount = completion.usage?.total_tokens || 0;

    return { content, tokenCount, completion };
  }

  private buildEnhancedCodeGenerationPrompt(
    request: CodeGenerationRequest,
    context: string,
    parsedRequirements: any
  ): string {
    return `
# Enhanced Code Generation Request

## User Intent
${request.intent}

## Parsed Requirements Analysis
- Complexity: ${parsedRequirements.complexity}
- Category: ${parsedRequirements.category}
- Confidence: ${parsedRequirements.confidence}
- Estimated Effort: ${parsedRequirements.estimatedEffort.description}

## Extracted Entities
- Pallet Names: ${parsedRequirements.entities.palletNames.join(', ') || 'None'}
- Function Names: ${parsedRequirements.entities.functionNames.join(', ') || 'None'}
- Data Types: ${parsedRequirements.entities.dataTypes.join(', ') || 'None'}
- Frameworks: ${parsedRequirements.entities.frameworks.join(', ') || 'None'}
- Features: ${parsedRequirements.entities.features.join(', ') || 'None'}

## Target Specifications
- Language: ${request.language}
- Framework: ${request.framework}
- Environment: ${request.environment || 'development'}
- Optimization Level: ${request.optimizationLevel || 'basic'}

## Additional Requirements
${request.requirements ? request.requirements.join('\n') : 'None specified'}

## Include Tests: ${request.includeTests ? 'Yes' : 'No'}
## Include Security Analysis: ${request.includeSecurity ? 'Yes' : 'No'}

## Required Dependencies
${parsedRequirements.requiredDependencies.join(', ')}

## Relevant Knowledge Context
${context}

## Output Requirements
- Generate production-ready code following best practices
- Include comprehensive error handling
- Add detailed comments explaining key concepts
- Follow security best practices for blockchain development
- Optimize for performance and gas efficiency
${request.includeTests ? '- Include comprehensive unit tests\n' : ''}
${request.includeSecurity ? '- Add security analysis and recommendations\n' : ''}
- Consider the complexity level (${parsedRequirements.complexity}) in implementation

Please generate high-quality code that addresses all requirements with attention to detail.
`;
  }

  private async generateOptimizationSuggestions(code: string, request: CodeGenerationRequest): Promise<string[]> {
    if (request.optimizationLevel === 'basic') return [];

    try {
      const prompt = `Analyze this ${request.language} code for optimization opportunities:\n\n\`\`\`${request.language}\n${code}\n\`\`\`\n\nProvide specific optimization suggestions for:\n1. Performance improvements\n2. Gas efficiency (if applicable)\n3. Memory usage\n4. Code structure\n\nReturn only actionable suggestions, one per line.`;

      const provider = request.preferredProvider || this.config.primaryProvider;
      let suggestions: string;

      if (provider === 'anthropic' && process.env.ANTHROPIC_API_KEY) {
        const result = await this.generateWithAnthropic(prompt, 'code_analysis');
        suggestions = result.content;
      } else {
        const result = await this.generateWithOpenAI(prompt, 'code_analysis');
        suggestions = result.content;
      }

      return suggestions.split('\n').filter(line => line.trim().length > 0).slice(0, 10);
    } catch (error) {
      this.logger.warn('Failed to generate optimization suggestions:', error);
      return [];
    }
  }

  private async generateTestSuggestions(code: string, request: CodeGenerationRequest): Promise<string[]> {
    if (!request.includeTests) return [];

    try {
      const prompt = `Generate test suggestions for this ${request.language} code:\n\n\`\`\`${request.language}\n${code}\n\`\`\`\n\nProvide specific test cases that should be implemented:\n1. Unit tests for individual functions\n2. Integration tests\n3. Edge cases and error conditions\n4. Security test scenarios\n\nReturn only test descriptions, one per line.`;

      const provider = request.preferredProvider || this.config.primaryProvider;
      let suggestions: string;

      if (provider === 'anthropic' && process.env.ANTHROPIC_API_KEY) {
        const result = await this.generateWithAnthropic(prompt, 'code_analysis');
        suggestions = result.content;
      } else {
        const result = await this.generateWithOpenAI(prompt, 'code_analysis');
        suggestions = result.content;
      }

      return suggestions.split('\n').filter(line => line.trim().length > 0).slice(0, 8);
    } catch (error) {
      this.logger.warn('Failed to generate test suggestions:', error);
      return [];
    }
  }

  private calculateConfidenceOpenAI(completion: OpenAI.Chat.Completions.ChatCompletion): number {
    // Enhanced confidence calculation based on response characteristics
    const choice = completion.choices[0];
    if (!choice) return 0;

    const content = choice.message?.content || '';
    const hasCode = content.includes('```');
    const hasExplanation = content.length > 100;
    const finishReason = choice.finish_reason === 'stop';
    const hasComments = content.includes('//') || content.includes('/*');
    const hasErrorHandling = content.includes('Error') || content.includes('Result');

    let confidence = 0.4;
    if (hasCode) confidence += 0.25;
    if (hasExplanation) confidence += 0.15;
    if (finishReason) confidence += 0.1;
    if (hasComments) confidence += 0.05;
    if (hasErrorHandling) confidence += 0.05;

    return Math.min(confidence, 1.0);
  }

  private extractSuggestions(code: string): string[] {
    // Extract suggestions from generated code comments
    const suggestions: string[] = [];
    const lines = code.split('\n');

    for (const line of lines) {
      if (line.includes('TODO:') || line.includes('SUGGESTION:') || line.includes('NOTE:')) {
        suggestions.push(line.trim().replace(/^\/\/\s*/, ''));
      }
    }

    return suggestions;
  }

  private extractSecurityNotes(code: string): string[] {
    const notes: string[] = [];
    const lines = code.split('\n');

    for (const line of lines) {
      if (line.includes('SECURITY:') || line.includes('WARNING:') || line.includes('CAUTION:')) {
        notes.push(line.trim().replace(/^\/\/\s*/, ''));
      }
    }

    return notes;
  }

  private extractPerformanceNotes(code: string): string[] {
    const notes: string[] = [];
    const lines = code.split('\n');

    for (const line of lines) {
      if (line.includes('PERFORMANCE:') || line.includes('OPTIMIZATION:') || line.includes('GAS:')) {
        notes.push(line.trim().replace(/^\/\/\s*/, ''));
      }
    }

    return notes;
  }

  private extractSecurityIssues(analysis: string): Array<{severity: string, description: string, recommendation: string}> {
    // Parse security issues from analysis text
    // This is a simplified implementation - in production, use more sophisticated parsing
    return [];
  }

  private extractPerformanceIssues(analysis: string): Array<{type: string, description: string, impact: string, recommendation: string}> {
    // Parse performance issues from analysis text
    return [];
  }

  private extractCodeQuality(analysis: string): {score: number, issues: string[], strengths: string[]} {
    // Extract code quality metrics
    return {
      score: 0.8,
      issues: [],
      strengths: []
    };
  }

  private extractImprovementSuggestions(analysis: string): string[] {
    // Extract improvement suggestions
    return [];
  }

  private extractComplianceIssues(analysis: string): Array<{standard: string, issue: string, recommendation: string}> {
    // Extract compliance issues
    return [];
  }

  async getAvailableProviders(): Promise<AIProvider[]> {
    const providers: AIProvider[] = [];

    if (process.env.OPENAI_API_KEY) {
      providers.push('openai');
    }

    if (process.env.ANTHROPIC_API_KEY) {
      providers.push('anthropic');
    }

    return providers;
  }

  async getProviderStatus(): Promise<Record<AIProvider, { available: boolean; model: string; healthy: boolean }>> {
    const status: Record<AIProvider, { available: boolean; model: string; healthy: boolean }> = {
      openai: {
        available: !!process.env.OPENAI_API_KEY,
        model: this.config.openaiModel,
        healthy: false
      },
      anthropic: {
        available: !!process.env.ANTHROPIC_API_KEY,
        model: this.config.anthropicModel,
        healthy: false
      }
    };

    // Test provider health
    if (status.openai.available) {
      try {
        await this.testOpenAIConnection();
        status.openai.healthy = true;
      } catch (error) {
        this.logger.warn('OpenAI health check failed:', error);
      }
    }

    if (status.anthropic.available) {
      try {
        await this.testAnthropicConnection();
        status.anthropic.healthy = true;
      } catch (error) {
        this.logger.warn('Anthropic health check failed:', error);
      }
    }

    return status;
  }

  isHealthy(): boolean {
    return !!(this.openai || this.anthropic) && this.initialized;
  }

  private initialized: boolean = false;

  private setInitialized(): void {
    this.initialized = true;
  }
}