/**
 * API Routes for PolyFlow AI Engine
 */

import { Router, Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { v4 as uuidv4 } from 'uuid';
import { Logger } from '../utils/logger';
import {
  CodeGenerationRequest,
  CodeAnalysisRequest
} from '../types/ai-types';
import { FeedbackData, ModelTrainingData } from '../types/learning-types';
import { MetricsQuery } from '../types/metrics-types';

interface Services {
  aiService: any;
  codeGenerator: any;
  codeAnalyzer: any;
  learningSystem: any;
  knowledgeBase: any;
  metricsCollector: any;
}

export function apiRoutes(services: Services): Router {
  const router = Router();
  const logger = new Logger();

  // Validation schemas
  const codeGenerationSchema = Joi.object({
    intent: Joi.string().required().min(10).max(1000),
    language: Joi.string().required().valid('rust', 'typescript', 'javascript', 'python'),
    framework: Joi.string().optional().valid('substrate', 'frame', 'polkadot', 'ethereum'),
    environment: Joi.string().optional().valid('development', 'testing', 'production'),
    requirements: Joi.array().items(Joi.string()).optional(),
    context: Joi.string().optional().max(5000),
    variables: Joi.object().optional(),
    strategy: Joi.string().optional().valid('template', 'ai', 'hybrid', 'auto'),
    template: Joi.string().optional()
  });

  const codeAnalysisSchema = Joi.object({
    code: Joi.string().required().min(10).max(50000),
    language: Joi.string().required().valid('rust', 'typescript', 'javascript', 'python'),
    framework: Joi.string().optional().valid('substrate', 'frame', 'polkadot', 'ethereum'),
    analysisTypes: Joi.array().items(
      Joi.string().valid('security', 'performance', 'quality', 'compliance')
    ).optional(),
    focusAreas: Joi.array().items(Joi.string()).optional()
  });

  const feedbackSchema = Joi.object({
    requestId: Joi.string().required().guid(),
    rating: Joi.number().required().min(1).max(5),
    category: Joi.string().optional(),
    comments: Joi.string().optional().max(1000),
    intent: Joi.string().optional(),
    generatedCode: Joi.string().optional()
  });

  // Middleware for request validation
  const validateRequest = (schema: Joi.Schema) => {
    return (req: Request, res: Response, next: NextFunction) => {
      const { error } = schema.validate(req.body);
      if (error) {
        logger.warn('Request validation failed', {
          path: req.path,
          error: error.details[0].message,
          body: req.body
        });
        return res.status(400).json({
          error: 'Validation error',
          message: error.details[0].message,
          field: error.details[0].path.join('.')
        });
      }
      next();
    };
  };

  // Middleware for request tracking
  const trackRequest = (req: Request, res: Response, next: NextFunction) => {
    req['requestId'] = uuidv4();
    req['startTime'] = Date.now();

    logger.requestInfo(req['requestId'], 'Request started', {
      method: req.method,
      path: req.path,
      userAgent: req.get('User-Agent'),
      ip: req.ip
    });

    // Track response
    const originalSend = res.send;
    res.send = function(data) {
      const responseTime = Date.now() - req['startTime'];

      logger.requestInfo(req['requestId'], 'Request completed', {
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        responseTime
      });

      // Track user metrics
      services.metricsCollector.trackUserInteraction({
        sessionId: req.sessionID,
        userAgent: req.get('User-Agent'),
        endpoint: req.path,
        method: req.method,
        statusCode: res.statusCode,
        responseTime
      });

      return originalSend.call(this, data);
    };

    next();
  };

  router.use(trackRequest);

  // Health check endpoint
  router.get('/health', (req: Request, res: Response) => {
    const services = {
      ai: services.aiService.isHealthy(),
      knowledge: services.knowledgeBase.isHealthy(),
      generator: services.codeGenerator.isHealthy(),
      analyzer: services.codeAnalyzer.isHealthy(),
      learning: services.learningSystem.isHealthy(),
      metrics: services.metricsCollector.isHealthy()
    };

    const overallHealth = Object.values(services).every(healthy => healthy);

    res.status(overallHealth ? 200 : 503).json({
      status: overallHealth ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      services
    });
  });

  // Code Generation Endpoints
  router.post('/generate', validateRequest(codeGenerationSchema), async (req: Request, res: Response, next: NextFunction) => {
    try {
      const requestId = req['requestId'];
      const startTime = Date.now();

      logger.codeGeneration(requestId, 'start', {
        intent: req.body.intent,
        language: req.body.language,
        framework: req.body.framework
      });

      const request: CodeGenerationRequest = {
        requestId,
        ...req.body
      };

      const response = await services.codeGenerator.generateCode(request);

      const responseTime = Date.now() - startTime;

      logger.codeGeneration(requestId, 'complete', {
        success: true,
        responseTime,
        confidence: response.confidence,
        templateUsed: response.templateUsed
      });

      res.json({
        success: true,
        data: response,
        requestId,
        responseTime
      });

    } catch (error) {
      next(error);
    }
  });

  // Code Analysis Endpoints
  router.post('/analyze', validateRequest(codeAnalysisSchema), async (req: Request, res: Response, next: NextFunction) => {
    try {
      const requestId = req['requestId'];
      const startTime = Date.now();

      logger.codeAnalysis(requestId, 'start', {
        language: req.body.language,
        codeLength: req.body.code.length
      });

      const request: CodeAnalysisRequest = {
        requestId,
        ...req.body
      };

      const response = await services.codeAnalyzer.analyzeCode(request);

      const responseTime = Date.now() - startTime;

      logger.codeAnalysis(requestId, 'complete', {
        success: true,
        responseTime,
        securityIssues: response.securityIssues.length,
        performanceIssues: response.performanceIssues.length,
        qualityScore: response.codeQuality.score
      });

      res.json({
        success: true,
        data: response,
        requestId,
        responseTime
      });

    } catch (error) {
      next(error);
    }
  });

  // Feedback Endpoints
  router.post('/feedback', validateRequest(feedbackSchema), async (req: Request, res: Response, next: NextFunction) => {
    try {
      const feedback: FeedbackData = {
        ...req.body,
        timestamp: new Date(),
        processed: false
      };

      await services.learningSystem.collectFeedback(feedback);

      // Track feedback metrics
      await services.metricsCollector.trackFeedback(feedback);

      logger.learning('feedback_collected', {
        requestId: feedback.requestId,
        rating: feedback.rating,
        category: feedback.category
      });

      res.json({
        success: true,
        message: 'Feedback collected successfully'
      });

    } catch (error) {
      next(error);
    }
  });

  // Knowledge Base Endpoints
  router.get('/knowledge/search', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { q, language, framework, limit = 10 } = req.query;

      if (!q || typeof q !== 'string') {
        return res.status(400).json({
          error: 'Query parameter "q" is required'
        });
      }

      const results = await services.knowledgeBase.searchKnowledge({
        text: q,
        language: language as string,
        framework: framework as string,
        limit: parseInt(limit as string, 10)
      });

      res.json({
        success: true,
        data: results,
        query: q,
        total: results.length
      });

    } catch (error) {
      next(error);
    }
  });

  router.get('/knowledge/context', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { query, language, framework } = req.query;

      if (!query || typeof query !== 'string') {
        return res.status(400).json({
          error: 'Query parameter "query" is required'
        });
      }

      const context = await services.knowledgeBase.getRelevantContext(
        query,
        language as string,
        framework as string
      );

      res.json({
        success: true,
        data: context,
        query
      });

    } catch (error) {
      next(error);
    }
  });

  // Templates Endpoints
  router.get('/templates', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { category, language, framework } = req.query;

      const templates = services.codeGenerator.getAvailableTemplates();

      // Filter templates based on query parameters
      let filteredTemplates = templates;

      if (category) {
        filteredTemplates = filteredTemplates.filter(t => t.category === category);
      }

      if (language) {
        filteredTemplates = filteredTemplates.filter(t => t.language === language);
      }

      if (framework) {
        filteredTemplates = filteredTemplates.filter(t => t.framework === framework);
      }

      res.json({
        success: true,
        data: filteredTemplates,
        total: filteredTemplates.length,
        filters: { category, language, framework }
      });

    } catch (error) {
      next(error);
    }
  });

  router.get('/templates/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      const template = await services.codeGenerator.getTemplate(id);

      if (!template) {
        return res.status(404).json({
          error: 'Template not found',
          templateId: id
        });
      }

      res.json({
        success: true,
        data: template
      });

    } catch (error) {
      next(error);
    }
  });

  // Learning and Analytics Endpoints
  router.get('/patterns', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const patterns = await services.learningSystem.getPatternInsights();

      res.json({
        success: true,
        data: patterns,
        total: patterns.length
      });

    } catch (error) {
      next(error);
    }
  });

  router.get('/metrics/realtime', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const metrics = await services.metricsCollector.getRealtimeMetrics();

      res.json({
        success: true,
        data: metrics,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      next(error);
    }
  });

  router.post('/metrics/query', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const querySchema = Joi.object({
        metric: Joi.string().required(),
        startTime: Joi.date().required(),
        endTime: Joi.date().required(),
        aggregation: Joi.string().valid('minute', 'hour', 'day', 'week', 'month').optional(),
        filters: Joi.object().optional(),
        groupBy: Joi.array().items(Joi.string()).optional(),
        limit: Joi.number().min(1).max(10000).optional()
      });

      const { error } = querySchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          error: 'Validation error',
          message: error.details[0].message
        });
      }

      const query: MetricsQuery = req.body;
      const results = await services.metricsCollector.queryMetrics(query);

      res.json({
        success: true,
        data: results
      });

    } catch (error) {
      next(error);
    }
  });

  // A/B Testing Endpoints
  router.get('/ab-tests', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tests = await services.learningSystem.getABTestResults();

      res.json({
        success: true,
        data: tests,
        total: tests.length
      });

    } catch (error) {
      next(error);
    }
  });

  // Model Training Endpoints
  router.post('/models/train', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const trainingSchema = Joi.object({
        name: Joi.string().required(),
        type: Joi.string().required().valid('code_generation', 'code_analysis', 'pattern_recognition'),
        baseModel: Joi.string().optional(),
        examples: Joi.array().items(Joi.object({
          input: Joi.string().required(),
          expectedOutput: Joi.string().required(),
          category: Joi.string().optional()
        })).required().min(10),
        epochs: Joi.number().min(1).max(100).optional(),
        batchSize: Joi.number().min(1).max(32).optional(),
        learningRate: Joi.number().min(0.0001).max(1).optional()
      });

      const { error } = trainingSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          error: 'Validation error',
          message: error.details[0].message
        });
      }

      const trainingData: ModelTrainingData = req.body;
      const response = await services.learningSystem.trainModel(trainingData);

      logger.learning('model_training_started', {
        modelId: response.modelId,
        trainingJobId: response.trainingJobId,
        datasetSize: trainingData.examples.length
      });

      res.json({
        success: true,
        data: response
      });

    } catch (error) {
      next(error);
    }
  });

  router.get('/models/:modelId/performance', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { modelId } = req.params;

      const performance = await services.learningSystem.getModelPerformance(modelId);

      if (!performance) {
        return res.status(404).json({
          error: 'Model not found',
          modelId
        });
      }

      res.json({
        success: true,
        data: performance
      });

    } catch (error) {
      next(error);
    }
  });

  // Error handling middleware
  router.use((error: any, req: Request, res: Response, next: NextFunction) => {
    const requestId = req['requestId'];
    const responseTime = Date.now() - req['startTime'];

    logger.requestError(requestId, 'Request failed', error, {
      method: req.method,
      path: req.path,
      statusCode: 500,
      responseTime
    });

    // Track error metrics
    services.metricsCollector.trackUserInteraction({
      sessionId: req.sessionID,
      endpoint: req.path,
      method: req.method,
      statusCode: 500,
      responseTime
    });

    res.status(500).json({
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong',
      requestId
    });
  });

  return router;
}