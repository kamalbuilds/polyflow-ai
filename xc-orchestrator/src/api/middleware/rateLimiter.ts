import { Request, Response, NextFunction } from 'express';
import { logger } from '../../utils/logger';

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  message?: string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

interface ClientInfo {
  requests: number[];
  blocked: boolean;
  blockedUntil?: number;
}

export class RateLimiter {
  private clients = new Map<string, ClientInfo>();
  private config: RateLimitConfig;
  private cleanupInterval: NodeJS.Timeout;

  constructor(config?: Partial<RateLimitConfig>) {
    this.config = {
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW || '900000'), // 15 minutes
      maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
      message: 'Too many requests from this IP, please try again later.',
      skipSuccessfulRequests: false,
      skipFailedRequests: false,
      ...config
    };

    // Cleanup old entries every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);

    logger.info('Rate limiter initialized', {
      windowMs: this.config.windowMs,
      maxRequests: this.config.maxRequests
    });
  }

  /**
   * Express middleware for rate limiting
   */
  middleware() {
    return (req: Request, res: Response, next: NextFunction): void => {
      const clientId = this.getClientId(req);
      const now = Date.now();

      // Get or create client info
      let client = this.clients.get(clientId);
      if (!client) {
        client = { requests: [], blocked: false };
        this.clients.set(clientId, client);
      }

      // Check if client is currently blocked
      if (client.blocked && client.blockedUntil && now < client.blockedUntil) {
        const retryAfter = Math.ceil((client.blockedUntil - now) / 1000);

        logger.warn('Blocked request attempt', {
          clientId,
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          url: req.url,
          retryAfter
        });

        res.set('Retry-After', retryAfter.toString());
        return res.status(429).json({
          error: 'Rate limit exceeded',
          message: this.config.message,
          retryAfter: retryAfter
        });
      }

      // Remove old requests outside the window
      const windowStart = now - this.config.windowMs;
      client.requests = client.requests.filter(timestamp => timestamp > windowStart);

      // Check if limit is exceeded
      if (client.requests.length >= this.config.maxRequests) {
        client.blocked = true;
        client.blockedUntil = now + this.config.windowMs;

        const retryAfter = Math.ceil(this.config.windowMs / 1000);

        logger.warn('Rate limit exceeded', {
          clientId,
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          url: req.url,
          requestCount: client.requests.length,
          retryAfter
        });

        res.set('Retry-After', retryAfter.toString());
        return res.status(429).json({
          error: 'Rate limit exceeded',
          message: this.config.message,
          retryAfter: retryAfter
        });
      }

      // Add current request
      client.requests.push(now);
      client.blocked = false;
      client.blockedUntil = undefined;

      // Add rate limit headers
      const remaining = this.config.maxRequests - client.requests.length;
      const resetTime = Math.ceil((windowStart + this.config.windowMs) / 1000);

      res.set({
        'X-RateLimit-Limit': this.config.maxRequests.toString(),
        'X-RateLimit-Remaining': Math.max(0, remaining).toString(),
        'X-RateLimit-Reset': resetTime.toString(),
        'X-RateLimit-Window': this.config.windowMs.toString()
      });

      // Log the request for monitoring
      logger.debug('Rate limit check passed', {
        clientId,
        requestCount: client.requests.length,
        remaining,
        url: req.url
      });

      next();
    };
  }

  /**
   * Get client identifier (IP + User-Agent hash)
   */
  private getClientId(req: Request): string {
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const userAgent = req.get('User-Agent') || 'unknown';

    // Simple hash for user agent to avoid long keys
    const userAgentHash = this.simpleHash(userAgent);

    return `${ip}:${userAgentHash}`;
  }

  /**
   * Simple string hash function
   */
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  }

  /**
   * Clean up old entries
   */
  private cleanup(): void {
    const now = Date.now();
    let cleanedClients = 0;

    for (const [clientId, client] of this.clients.entries()) {
      const windowStart = now - this.config.windowMs;

      // Remove old requests
      const oldRequestCount = client.requests.length;
      client.requests = client.requests.filter(timestamp => timestamp > windowStart);

      // Check if client should be unblocked
      if (client.blocked && client.blockedUntil && now >= client.blockedUntil) {
        client.blocked = false;
        client.blockedUntil = undefined;
      }

      // Remove client if no recent activity
      if (client.requests.length === 0 && !client.blocked) {
        this.clients.delete(clientId);
        cleanedClients++;
      }

      // Log cleanup if requests were removed
      if (oldRequestCount > client.requests.length) {
        logger.debug('Cleaned old requests', {
          clientId,
          removedRequests: oldRequestCount - client.requests.length
        });
      }
    }

    if (cleanedClients > 0) {
      logger.debug('Rate limiter cleanup completed', {
        cleanedClients,
        activeClients: this.clients.size
      });
    }
  }

  /**
   * Manually reset rate limit for a client
   */
  resetClient(req: Request): void {
    const clientId = this.getClientId(req);
    this.clients.delete(clientId);

    logger.info('Rate limit reset for client', {
      clientId,
      ip: req.ip
    });
  }

  /**
   * Get rate limit status for a client
   */
  getClientStatus(req: Request): {
    requests: number;
    remaining: number;
    resetTime: number;
    blocked: boolean;
    blockedUntil?: number;
  } {
    const clientId = this.getClientId(req);
    const now = Date.now();
    const client = this.clients.get(clientId);

    if (!client) {
      return {
        requests: 0,
        remaining: this.config.maxRequests,
        resetTime: Math.ceil((now + this.config.windowMs) / 1000),
        blocked: false
      };
    }

    const windowStart = now - this.config.windowMs;
    const validRequests = client.requests.filter(timestamp => timestamp > windowStart);
    const remaining = Math.max(0, this.config.maxRequests - validRequests.length);

    return {
      requests: validRequests.length,
      remaining,
      resetTime: Math.ceil((windowStart + this.config.windowMs) / 1000),
      blocked: client.blocked,
      blockedUntil: client.blockedUntil
    };
  }

  /**
   * Get overall rate limiter statistics
   */
  getStats(): {
    totalClients: number;
    blockedClients: number;
    totalRequests: number;
    config: RateLimitConfig;
  } {
    let blockedClients = 0;
    let totalRequests = 0;

    for (const client of this.clients.values()) {
      if (client.blocked) {
        blockedClients++;
      }
      totalRequests += client.requests.length;
    }

    return {
      totalClients: this.clients.size,
      blockedClients,
      totalRequests,
      config: this.config
    };
  }

  /**
   * Update rate limit configuration
   */
  updateConfig(newConfig: Partial<RateLimitConfig>): void {
    this.config = { ...this.config, ...newConfig };

    logger.info('Rate limiter configuration updated', {
      config: this.config
    });
  }

  /**
   * Shutdown rate limiter
   */
  shutdown(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.clients.clear();

    logger.info('Rate limiter shutdown');
  }
}