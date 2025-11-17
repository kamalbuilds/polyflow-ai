/**
 * Rate Limiter Middleware with Redis support
 */

import { Request, Response, NextFunction } from 'express';
import { RateLimiterRedis, RateLimiterMemory } from 'rate-limiter-flexible';
import Redis from 'redis';
import { Logger } from '../utils/logger';
import { RateLimitError } from './error-handler';

const logger = new Logger();

interface RateLimiterConfig {
  windowMs: number;
  maxRequests: number;
  keyGenerator?: (req: Request) => string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

class RateLimiterService {
  private rateLimiters: Map<string, any> = new Map();
  private redis: Redis.RedisClientType | null = null;

  constructor() {
    this.initializeRedis();
    this.setupRateLimiters();
  }

  private async initializeRedis(): Promise<void> {
    if (process.env.REDIS_URL) {
      try {
        this.redis = Redis.createClient({ url: process.env.REDIS_URL });
        await this.redis.connect();
        logger.info('Redis connected for rate limiting');
      } catch (error) {
        logger.warn('Failed to connect to Redis for rate limiting, using memory store', error);
      }
    }
  }

  private setupRateLimiters(): void {
    // Global API rate limiter
    this.createRateLimiter('global', {
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 1000,
      keyGenerator: (req) => req.ip
    });

    // Code generation rate limiter (more restrictive)
    this.createRateLimiter('code-generation', {
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 20,
      keyGenerator: (req) => `code-gen:${req.ip}`
    });

    // Code analysis rate limiter
    this.createRateLimiter('code-analysis', {
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 30,
      keyGenerator: (req) => `code-analysis:${req.ip}`
    });

    // AI service rate limiter (very restrictive)
    this.createRateLimiter('ai-service', {
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 10,
      keyGenerator: (req) => `ai:${req.ip}`
    });

    // Feedback rate limiter
    this.createRateLimiter('feedback', {
      windowMs: 5 * 60 * 1000, // 5 minutes
      maxRequests: 10,
      keyGenerator: (req) => `feedback:${req.ip}`
    });

    // Model training rate limiter (very restrictive)
    this.createRateLimiter('model-training', {
      windowMs: 60 * 60 * 1000, // 1 hour
      maxRequests: 5,
      keyGenerator: (req) => `training:${req.ip}`
    });

    // Health check rate limiter (generous)
    this.createRateLimiter('health', {
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 60,
      keyGenerator: (req) => `health:${req.ip}`
    });

    // Knowledge base search rate limiter
    this.createRateLimiter('knowledge-search', {
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 50,
      keyGenerator: (req) => `knowledge:${req.ip}`
    });

    // Metrics query rate limiter
    this.createRateLimiter('metrics', {
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 30,
      keyGenerator: (req) => `metrics:${req.ip}`
    });
  }

  private createRateLimiter(name: string, config: RateLimiterConfig): void {
    const options = {
      keyGenerator: config.keyGenerator,
      points: config.maxRequests,
      duration: Math.floor(config.windowMs / 1000),
      blockDuration: Math.floor(config.windowMs / 1000),
      skipSuccessfulRequests: config.skipSuccessfulRequests || false,
      skipFailedRequests: config.skipFailedRequests || false
    };

    let rateLimiter;

    if (this.redis) {
      rateLimiter = new RateLimiterRedis({
        storeClient: this.redis,
        keyPrefix: `rl:${name}`,
        ...options
      });
    } else {
      rateLimiter = new RateLimiterMemory(options);
    }

    this.rateLimiters.set(name, rateLimiter);

    logger.info(`Rate limiter created: ${name}`, {
      maxRequests: config.maxRequests,
      windowMs: config.windowMs,
      backend: this.redis ? 'Redis' : 'Memory'
    });
  }

  public async checkRateLimit(
    limiterName: string,
    req: Request
  ): Promise<{ allowed: boolean; remaining?: number; resetTime?: Date }> {
    const rateLimiter = this.rateLimiters.get(limiterName);

    if (!rateLimiter) {
      logger.warn(`Rate limiter not found: ${limiterName}`);
      return { allowed: true };
    }

    try {
      const key = rateLimiter.keyGenerator ? rateLimiter.keyGenerator(req) : req.ip;

      const result = await rateLimiter.consume(key);

      return {
        allowed: true,
        remaining: result.remainingPoints,
        resetTime: new Date(Date.now() + result.msBeforeNext)
      };
    } catch (rejRes: any) {
      const resetTime = new Date(Date.now() + rejRes.msBeforeNext);

      logger.warn(`Rate limit exceeded for ${limiterName}`, {
        key: rateLimiter.keyGenerator ? rateLimiter.keyGenerator(req) : req.ip,
        totalRequests: rejRes.totalRequests,
        resetTime
      });

      return {
        allowed: false,
        remaining: 0,
        resetTime
      };
    }
  }

  public createMiddleware(limiterName: string) {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const result = await this.checkRateLimit(limiterName, req);

        if (!result.allowed) {
          const retryAfter = Math.ceil((result.resetTime!.getTime() - Date.now()) / 1000);

          res.set({
            'Retry-After': retryAfter.toString(),
            'X-RateLimit-Limit': this.rateLimiters.get(limiterName).points?.toString() || 'unknown',
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': result.resetTime!.toISOString()
          });

          throw new RateLimitError('Too many requests', { retryAfter });
        }

        // Add rate limit headers to successful requests
        if (result.remaining !== undefined) {
          res.set({
            'X-RateLimit-Limit': this.rateLimiters.get(limiterName).points?.toString() || 'unknown',
            'X-RateLimit-Remaining': result.remaining.toString(),
            'X-RateLimit-Reset': result.resetTime!.toISOString()
          });
        }

        next();
      } catch (error) {
        next(error);
      }
    };
  }
}

// Create singleton instance
const rateLimiterService = new RateLimiterService();

// Default rate limiter middleware (global)
export const rateLimiter = rateLimiterService.createMiddleware('global');

// Specific rate limiter middlewares
export const codeGenerationLimiter = rateLimiterService.createMiddleware('code-generation');
export const codeAnalysisLimiter = rateLimiterService.createMiddleware('code-analysis');
export const aiServiceLimiter = rateLimiterService.createMiddleware('ai-service');
export const feedbackLimiter = rateLimiterService.createMiddleware('feedback');
export const modelTrainingLimiter = rateLimiterService.createMiddleware('model-training');
export const healthLimiter = rateLimiterService.createMiddleware('health');
export const knowledgeSearchLimiter = rateLimiterService.createMiddleware('knowledge-search');
export const metricsLimiter = rateLimiterService.createMiddleware('metrics');

// Custom rate limiter creator
export const createCustomRateLimiter = (config: RateLimiterConfig) => {
  const name = `custom-${Date.now()}`;

  // Add the custom limiter to the service
  rateLimiterService['createRateLimiter'](name, config);

  return rateLimiterService.createMiddleware(name);
};

// Rate limiter for authenticated users (higher limits)
export const createAuthenticatedRateLimiter = (baseConfig: RateLimiterConfig) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Check if user is authenticated
    const isAuthenticated = req.headers.authorization || req.headers['x-api-key'];

    if (isAuthenticated) {
      // Increase limits for authenticated users
      const authConfig = {
        ...baseConfig,
        maxRequests: baseConfig.maxRequests * 5, // 5x higher limit
        keyGenerator: (req: Request) => `auth:${req.headers.authorization || req.headers['x-api-key']}`
      };

      return createCustomRateLimiter(authConfig)(req, res, next);
    } else {
      // Use default limits for unauthenticated users
      return createCustomRateLimiter(baseConfig)(req, res, next);
    }
  };
};

// Rate limiter bypass for internal services
export const createInternalRateLimiter = () => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Check for internal service header
    const isInternal = req.headers['x-internal-service'] === process.env.INTERNAL_SERVICE_KEY;

    if (isInternal) {
      // Skip rate limiting for internal services
      next();
    } else {
      // Apply standard rate limiting
      rateLimiter(req, res, next);
    }
  };
};

// Adaptive rate limiter that adjusts based on system load
export const createAdaptiveRateLimiter = (baseConfig: RateLimiterConfig) => {
  let currentMultiplier = 1;

  // Adjust limits based on system metrics
  setInterval(() => {
    const memoryUsage = process.memoryUsage();
    const memoryUsagePercent = memoryUsage.heapUsed / memoryUsage.heapTotal;

    if (memoryUsagePercent > 0.9) {
      // Reduce limits when memory usage is high
      currentMultiplier = 0.5;
    } else if (memoryUsagePercent > 0.7) {
      currentMultiplier = 0.75;
    } else {
      currentMultiplier = 1;
    }
  }, 30000); // Check every 30 seconds

  return (req: Request, res: Response, next: NextFunction) => {
    const adaptiveConfig = {
      ...baseConfig,
      maxRequests: Math.floor(baseConfig.maxRequests * currentMultiplier)
    };

    return createCustomRateLimiter(adaptiveConfig)(req, res, next);
  };
};

// Export the service for advanced usage
export { rateLimiterService };

export default rateLimiter;