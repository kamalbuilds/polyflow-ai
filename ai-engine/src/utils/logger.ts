/**
 * Enhanced Logger with structured logging and multiple transports
 */

import winston from 'winston';
import path from 'path';

export class Logger {
  private logger: winston.Logger;
  private static instance: Logger;

  constructor() {
    const logLevel = process.env.LOG_LEVEL || 'info';
    const logDir = process.env.LOG_DIR || path.join(__dirname, '../../logs');

    // Create custom format for structured logging
    const customFormat = winston.format.combine(
      winston.format.timestamp({
        format: 'YYYY-MM-DD HH:mm:ss'
      }),
      winston.format.errors({ stack: true }),
      winston.format.json(),
      winston.format.printf((info) => {
        const { timestamp, level, message, ...meta } = info;

        // Handle different log structures
        if (typeof message === 'string') {
          return JSON.stringify({
            timestamp,
            level: level.toUpperCase(),
            message,
            ...meta
          });
        }

        return JSON.stringify({
          timestamp,
          level: level.toUpperCase(),
          message,
          ...meta
        });
      })
    );

    // Console format for development
    const consoleFormat = winston.format.combine(
      winston.format.colorize(),
      winston.format.timestamp({
        format: 'HH:mm:ss'
      }),
      winston.format.printf((info) => {
        const { timestamp, level, message, service, requestId, ...meta } = info;

        let logMessage = `${timestamp} [${level.toUpperCase()}]`;

        if (service) {
          logMessage += ` [${service}]`;
        }

        if (requestId) {
          logMessage += ` [${requestId}]`;
        }

        logMessage += `: ${message}`;

        // Add metadata if present
        const metaKeys = Object.keys(meta);
        if (metaKeys.length > 0 && !meta.stack) {
          logMessage += ` ${JSON.stringify(meta)}`;
        }

        // Add stack trace for errors
        if (meta.stack) {
          logMessage += `\n${meta.stack}`;
        }

        return logMessage;
      })
    );

    // Configure transports
    const transports: winston.transport[] = [
      // Console transport
      new winston.transports.Console({
        level: logLevel,
        format: process.env.NODE_ENV === 'production' ? customFormat : consoleFormat
      })
    ];

    // File transports for production
    if (process.env.NODE_ENV === 'production') {
      // General log file
      transports.push(
        new winston.transports.File({
          filename: path.join(logDir, 'app.log'),
          level: logLevel,
          format: customFormat,
          maxsize: 50 * 1024 * 1024, // 50MB
          maxFiles: 10,
          tailable: true
        })
      );

      // Error log file
      transports.push(
        new winston.transports.File({
          filename: path.join(logDir, 'error.log'),
          level: 'error',
          format: customFormat,
          maxsize: 50 * 1024 * 1024,
          maxFiles: 5,
          tailable: true
        })
      );

      // Performance log file
      transports.push(
        new winston.transports.File({
          filename: path.join(logDir, 'performance.log'),
          level: 'info',
          format: customFormat,
          maxsize: 50 * 1024 * 1024,
          maxFiles: 5,
          tailable: true
        })
      );
    }

    this.logger = winston.createLogger({
      level: logLevel,
      format: customFormat,
      transports,
      // Don't exit on handled exceptions
      exitOnError: false,
      // Handle uncaught exceptions
      exceptionHandlers: [
        new winston.transports.Console({
          format: consoleFormat
        })
      ],
      // Handle unhandled rejections
      rejectionHandlers: [
        new winston.transports.Console({
          format: consoleFormat
        })
      ]
    });

    // Suppress winston's own error messages in test environment
    if (process.env.NODE_ENV === 'test') {
      this.logger.silent = true;
    }
  }

  // Singleton pattern for consistent logger instance
  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  // Standard logging methods
  debug(message: string, meta?: any): void {
    this.logger.debug(message, { service: 'ai-engine', ...meta });
  }

  info(message: string, meta?: any): void {
    this.logger.info(message, { service: 'ai-engine', ...meta });
  }

  warn(message: string, meta?: any): void {
    this.logger.warn(message, { service: 'ai-engine', ...meta });
  }

  error(message: string, error?: Error | any, meta?: any): void {
    if (error instanceof Error) {
      this.logger.error(message, {
        service: 'ai-engine',
        error: error.message,
        stack: error.stack,
        ...meta
      });
    } else if (typeof error === 'object') {
      this.logger.error(message, {
        service: 'ai-engine',
        ...error,
        ...meta
      });
    } else {
      this.logger.error(message, {
        service: 'ai-engine',
        error,
        ...meta
      });
    }
  }

  fatal(message: string, error?: Error | any, meta?: any): void {
    this.error(`FATAL: ${message}`, error, meta);
  }

  // Request-specific logging with request ID
  requestInfo(requestId: string, message: string, meta?: any): void {
    this.logger.info(message, { service: 'ai-engine', requestId, ...meta });
  }

  requestError(requestId: string, message: string, error?: Error | any, meta?: any): void {
    if (error instanceof Error) {
      this.logger.error(message, {
        service: 'ai-engine',
        requestId,
        error: error.message,
        stack: error.stack,
        ...meta
      });
    } else {
      this.logger.error(message, {
        service: 'ai-engine',
        requestId,
        error,
        ...meta
      });
    }
  }

  // Performance logging
  performance(operation: string, duration: number, meta?: any): void {
    this.logger.info(`Performance: ${operation}`, {
      service: 'ai-engine',
      operation,
      duration,
      category: 'performance',
      ...meta
    });
  }

  // Metrics logging
  metric(name: string, value: number, unit?: string, meta?: any): void {
    this.logger.info(`Metric: ${name}`, {
      service: 'ai-engine',
      metric: name,
      value,
      unit,
      category: 'metric',
      ...meta
    });
  }

  // Security logging
  security(event: string, details: any, meta?: any): void {
    this.logger.warn(`Security Event: ${event}`, {
      service: 'ai-engine',
      securityEvent: event,
      details,
      category: 'security',
      ...meta
    });
  }

  // Audit logging
  audit(action: string, userId?: string, details?: any, meta?: any): void {
    this.logger.info(`Audit: ${action}`, {
      service: 'ai-engine',
      action,
      userId,
      details,
      category: 'audit',
      timestamp: new Date().toISOString(),
      ...meta
    });
  }

  // Business logic logging
  business(event: string, data: any, meta?: any): void {
    this.logger.info(`Business Event: ${event}`, {
      service: 'ai-engine',
      businessEvent: event,
      data,
      category: 'business',
      ...meta
    });
  }

  // AI/ML specific logging
  aiOperation(operation: string, data: any, meta?: any): void {
    this.logger.info(`AI Operation: ${operation}`, {
      service: 'ai-engine',
      aiOperation: operation,
      data,
      category: 'ai',
      ...meta
    });
  }

  // Code generation logging
  codeGeneration(requestId: string, phase: string, data: any): void {
    this.logger.info(`Code Generation - ${phase}`, {
      service: 'ai-engine',
      requestId,
      phase,
      data,
      category: 'code-generation'
    });
  }

  // Code analysis logging
  codeAnalysis(requestId: string, phase: string, data: any): void {
    this.logger.info(`Code Analysis - ${phase}`, {
      service: 'ai-engine',
      requestId,
      phase,
      data,
      category: 'code-analysis'
    });
  }

  // Learning system logging
  learning(event: string, data: any): void {
    this.logger.info(`Learning: ${event}`, {
      service: 'ai-engine',
      learningEvent: event,
      data,
      category: 'learning'
    });
  }

  // Timer utility for measuring execution time
  timer(label: string): () => void {
    const start = Date.now();

    return () => {
      const duration = Date.now() - start;
      this.performance(label, duration);
      return duration;
    };
  }

  // Async timer for promises
  async timeAsync<T>(label: string, operation: Promise<T>): Promise<T> {
    const start = Date.now();

    try {
      const result = await operation;
      const duration = Date.now() - start;
      this.performance(label, duration, { success: true });
      return result;
    } catch (error) {
      const duration = Date.now() - start;
      this.performance(label, duration, { success: false, error: (error as Error).message });
      throw error;
    }
  }

  // Create child logger with consistent metadata
  child(meta: any): Logger {
    const childLogger = new Logger();

    // Override the logger to always include the child metadata
    const originalLogger = childLogger.logger;
    childLogger.logger = {
      ...originalLogger,
      debug: (message: string, additionalMeta?: any) =>
        originalLogger.debug(message, { ...meta, ...additionalMeta }),
      info: (message: string, additionalMeta?: any) =>
        originalLogger.info(message, { ...meta, ...additionalMeta }),
      warn: (message: string, additionalMeta?: any) =>
        originalLogger.warn(message, { ...meta, ...additionalMeta }),
      error: (message: string, additionalMeta?: any) =>
        originalLogger.error(message, { ...meta, ...additionalMeta }),
    } as any;

    return childLogger;
  }

  // Log structured data for analytics
  analytics(event: string, properties: any): void {
    this.logger.info('Analytics Event', {
      service: 'ai-engine',
      category: 'analytics',
      event,
      properties,
      timestamp: new Date().toISOString()
    });
  }

  // Health check logging
  healthCheck(component: string, status: 'healthy' | 'degraded' | 'unhealthy', details?: any): void {
    const level = status === 'healthy' ? 'info' : status === 'degraded' ? 'warn' : 'error';

    this.logger.log(level, `Health Check: ${component}`, {
      service: 'ai-engine',
      component,
      status,
      details,
      category: 'health'
    });
  }

  // Get the underlying Winston logger if needed
  getWinstonLogger(): winston.Logger {
    return this.logger;
  }
}

// Export singleton instance
export const logger = Logger.getInstance();

// Export class for dependency injection
export default Logger;