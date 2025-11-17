/**
 * AI Service - Core OpenAI integration for code generation and analysis
 */

import OpenAI from 'openai';
import { tiktoken } from 'tiktoken';
import { KnowledgeBase } from './knowledge-base';
import { MetricsCollector } from './metrics-collector';
import { Logger } from '../utils/logger';
import {
  CodeGenerationRequest,
  CodeGenerationResponse,
  CodeAnalysisRequest,
  CodeAnalysisResponse,
  AIModelConfig,
  PromptTemplate
} from '../types/ai-types';

export class AIService {
  private openai: OpenAI;
  private knowledgeBase: KnowledgeBase;
  private metricsCollector: MetricsCollector;
  private logger: Logger;
  private tokenizer: any;
  private config: AIModelConfig;

  constructor(knowledgeBase: KnowledgeBase, metricsCollector: MetricsCollector) {
    this.knowledgeBase = knowledgeBase;
    this.metricsCollector = metricsCollector;
    this.logger = new Logger();

    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      organization: process.env.OPENAI_ORG_ID
    });

    this.config = {
      model: process.env.OPENAI_MODEL || 'gpt-4-turbo-preview',
      maxTokens: parseInt(process.env.MAX_TOKENS || '8000', 10),
      temperature: parseFloat(process.env.TEMPERATURE || '0.3'),
      topP: parseFloat(process.env.TOP_P || '0.9'),
      frequencyPenalty: parseFloat(process.env.FREQUENCY_PENALTY || '0.1'),
      presencePenalty: parseFloat(process.env.PRESENCE_PENALTY || '0.1')
    };
  }

  async initialize(): Promise<void> {
    try {
      this.logger.info('Initializing AI Service...');

      // Initialize tokenizer for token counting
      this.tokenizer = tiktoken.encodingForModel(this.config.model as any);

      // Test OpenAI connection
      await this.testConnection();

      this.logger.info('AI Service initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize AI Service:', error);
      throw error;
    }
  }

  private async testConnection(): Promise<void> {
    try {
      const response = await this.openai.chat.completions.create({
        model: this.config.model,
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

  async generateCode(request: CodeGenerationRequest): Promise<CodeGenerationResponse> {
    const startTime = Date.now();

    try {
      this.logger.info('Generating code for request:', {
        intent: request.intent,
        language: request.language,
        framework: request.framework
      });

      // Get relevant knowledge context
      const context = await this.knowledgeBase.getRelevantContext(
        request.intent,
        request.language,
        request.framework
      );

      // Build the prompt with context
      const prompt = this.buildCodeGenerationPrompt(request, context);

      // Count tokens
      const tokenCount = this.tokenizer.encode(prompt).length;
      this.logger.info(`Prompt token count: ${tokenCount}`);

      // Generate code
      const completion = await this.openai.chat.completions.create({
        model: this.config.model,
        messages: [
          {
            role: 'system',
            content: this.getSystemPrompt('code_generation')
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

      const generatedCode = completion.choices[0]?.message?.content || '';
      const responseTime = Date.now() - startTime;

      // Track metrics
      await this.metricsCollector.trackCodeGeneration({
        requestId: request.requestId,
        intent: request.intent,
        language: request.language,
        framework: request.framework,
        tokenCount,
        responseTime,
        success: true
      });

      const response: CodeGenerationResponse = {
        requestId: request.requestId,
        generatedCode,
        language: request.language,
        framework: request.framework,
        confidence: this.calculateConfidence(completion),
        suggestions: this.extractSuggestions(generatedCode),
        securityNotes: this.extractSecurityNotes(generatedCode),
        performanceNotes: this.extractPerformanceNotes(generatedCode),
        metadata: {
          tokenCount,
          responseTime,
          model: this.config.model,
          temperature: this.config.temperature
        }
      };

      this.logger.info('Code generation completed successfully', {
        requestId: request.requestId,
        responseTime
      });

      return response;

    } catch (error) {
      const responseTime = Date.now() - startTime;

      await this.metricsCollector.trackCodeGeneration({
        requestId: request.requestId,
        intent: request.intent,
        language: request.language,
        framework: request.framework,
        tokenCount: 0,
        responseTime,
        success: false,
        error: error.message
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
      const tokenCount = this.tokenizer.encode(prompt).length;

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
        error: error.message
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

  private calculateConfidence(completion: OpenAI.Chat.Completions.ChatCompletion): number {
    // Simple confidence calculation based on response characteristics
    const choice = completion.choices[0];
    if (!choice) return 0;

    const hasCode = choice.message?.content?.includes('```');
    const hasExplanation = (choice.message?.content?.length || 0) > 100;
    const finishReason = choice.finish_reason === 'stop';

    let confidence = 0.5;
    if (hasCode) confidence += 0.2;
    if (hasExplanation) confidence += 0.2;
    if (finishReason) confidence += 0.1;

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

  isHealthy(): boolean {
    return !!this.openai && !!this.tokenizer;
  }
}