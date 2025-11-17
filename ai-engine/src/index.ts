/**
 * PolyFlow AI Engine
 * Main entry point for the AI-powered Substrate code generation system
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { AIService } from './services/ai-service';
import { KnowledgeBase } from './services/knowledge-base';
import { CodeGenerator } from './engines/code-generator';
import { CodeAnalyzer } from './engines/code-analyzer';
import { LearningSystem } from './engines/learning-system';
import { MetricsCollector } from './services/metrics-collector';
import { Logger } from './utils/logger';
import { apiRoutes } from './routes/api';
import { errorHandler } from './middleware/error-handler';
import { rateLimiter } from './middleware/rate-limiter';

dotenv.config();

export class PolyFlowAIEngine {
  private app: express.Application;
  private aiService: AIService;
  private knowledgeBase: KnowledgeBase;
  private codeGenerator: CodeGenerator;
  private codeAnalyzer: CodeAnalyzer;
  private learningSystem: LearningSystem;
  private metricsCollector: MetricsCollector;
  private logger: Logger;

  constructor() {
    this.app = express();
    this.logger = new Logger();
    this.setupMiddleware();
    this.initializeServices();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  private setupMiddleware(): void {
    this.app.use(helmet());
    this.app.use(cors());
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));
    this.app.use(rateLimiter);
  }

  private async initializeServices(): Promise<void> {
    try {
      this.logger.info('Initializing AI Engine services...');

      // Initialize core services
      this.metricsCollector = new MetricsCollector();
      this.knowledgeBase = new KnowledgeBase();
      this.aiService = new AIService(this.knowledgeBase, this.metricsCollector);

      // Initialize engines
      this.codeGenerator = new CodeGenerator(this.aiService, this.knowledgeBase);
      this.codeAnalyzer = new CodeAnalyzer();
      this.learningSystem = new LearningSystem(this.aiService, this.metricsCollector);

      // Start initialization in parallel
      await Promise.all([
        this.knowledgeBase.initialize(),
        this.aiService.initialize(),
        this.codeAnalyzer.initialize(),
        this.learningSystem.initialize(),
        this.metricsCollector.initialize()
      ]);

      this.logger.info('All AI Engine services initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize services:', error);
      throw error;
    }
  }

  private setupRoutes(): void {
    this.app.use('/api/v1', apiRoutes({
      aiService: this.aiService,
      codeGenerator: this.codeGenerator,
      codeAnalyzer: this.codeAnalyzer,
      learningSystem: this.learningSystem,
      knowledgeBase: this.knowledgeBase,
      metricsCollector: this.metricsCollector
    }));

    // Health check
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        services: {
          ai: this.aiService.isHealthy(),
          knowledge: this.knowledgeBase.isHealthy(),
          generator: this.codeGenerator.isHealthy(),
          analyzer: this.codeAnalyzer.isHealthy(),
          learning: this.learningSystem.isHealthy()
        }
      });
    });
  }

  private setupErrorHandling(): void {
    this.app.use(errorHandler);
  }

  public async start(port: number = 3001): Promise<void> {
    try {
      await this.initializeServices();

      this.app.listen(port, () => {
        this.logger.info(`PolyFlow AI Engine running on port ${port}`);
        this.logger.info('Services status:', {
          ai: this.aiService.isHealthy(),
          knowledge: this.knowledgeBase.isHealthy(),
          generator: this.codeGenerator.isHealthy(),
          analyzer: this.codeAnalyzer.isHealthy(),
          learning: this.learningSystem.isHealthy()
        });
      });
    } catch (error) {
      this.logger.error('Failed to start AI Engine:', error);
      process.exit(1);
    }
  }

  public getServices() {
    return {
      aiService: this.aiService,
      knowledgeBase: this.knowledgeBase,
      codeGenerator: this.codeGenerator,
      codeAnalyzer: this.codeAnalyzer,
      learningSystem: this.learningSystem,
      metricsCollector: this.metricsCollector
    };
  }
}

// Start the engine if this file is run directly
if (require.main === module) {
  const engine = new PolyFlowAIEngine();
  const port = parseInt(process.env.PORT || '3001', 10);
  engine.start(port);
}

export default PolyFlowAIEngine;