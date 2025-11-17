import winston from 'winston';
import path from 'path';

const logLevel = process.env.LOG_LEVEL || 'info';
const logFormat = process.env.LOG_FORMAT || 'json';

// Create logs directory if it doesn't exist
import { existsSync, mkdirSync } from 'fs';
const logsDir = path.join(process.cwd(), 'logs');
if (!existsSync(logsDir)) {
  mkdirSync(logsDir, { recursive: true });
}

// Custom format for console output
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ level, message, timestamp, ...meta }) => {
    let log = `${timestamp} [${level}]: ${message}`;

    if (Object.keys(meta).length > 0) {
      log += `\n${JSON.stringify(meta, null, 2)}`;
    }

    return log;
  })
);

// JSON format for file output
const fileFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Create the logger
export const logger = winston.createLogger({
  level: logLevel,
  format: logFormat === 'json' ? fileFormat : consoleFormat,
  defaultMeta: {
    service: 'xc-orchestrator',
    version: process.env.npm_package_version || '1.0.0'
  },
  transports: [
    // Console transport
    new winston.transports.Console({
      format: logFormat === 'json' ? fileFormat : consoleFormat
    }),

    // File transports
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      format: fileFormat,
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
      tailable: true
    }),

    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      format: fileFormat,
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 10,
      tailable: true
    }),

    // Separate file for XCM events
    new winston.transports.File({
      filename: path.join(logsDir, 'xcm-events.log'),
      level: 'info',
      format: fileFormat,
      maxsize: 50 * 1024 * 1024, // 50MB
      maxFiles: 20,
      tailable: true
    })
  ],

  // Handle uncaught exceptions
  exceptionHandlers: [
    new winston.transports.File({
      filename: path.join(logsDir, 'exceptions.log'),
      format: fileFormat
    })
  ],

  // Handle unhandled promise rejections
  rejectionHandlers: [
    new winston.transports.File({
      filename: path.join(logsDir, 'rejections.log'),
      format: fileFormat
    })
  ]
});

// Create child loggers for specific modules
export const createModuleLogger = (module: string) => {
  return logger.child({ module });
};

// Performance logging helpers
export const performanceLogger = {
  time: (label: string) => {
    logger.profile(label);
  },

  timeEnd: (label: string) => {
    logger.profile(label);
  },

  measure: <T>(label: string, fn: () => T): T => {
    const start = performance.now();
    try {
      const result = fn();
      const duration = performance.now() - start;
      logger.info(`Performance: ${label}`, { duration: `${duration.toFixed(2)}ms` });
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      logger.error(`Performance: ${label} (failed)`, {
        duration: `${duration.toFixed(2)}ms`,
        error
      });
      throw error;
    }
  },

  measureAsync: async <T>(label: string, fn: () => Promise<T>): Promise<T> => {
    const start = performance.now();
    try {
      const result = await fn();
      const duration = performance.now() - start;
      logger.info(`Performance: ${label}`, { duration: `${duration.toFixed(2)}ms` });
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      logger.error(`Performance: ${label} (failed)`, {
        duration: `${duration.toFixed(2)}ms`,
        error
      });
      throw error;
    }
  }
};

// XCM-specific logging helpers
export const xcmLogger = {
  transaction: (transactionId: string, action: string, data?: any) => {
    logger.info(`XCM Transaction: ${action}`, {
      transactionId,
      action,
      ...data
    });
  },

  route: (sourceChain: string, destinationChain: string, action: string, data?: any) => {
    logger.info(`XCM Route: ${action}`, {
      sourceChain,
      destinationChain,
      action,
      ...data
    });
  },

  fee: (estimation: any) => {
    logger.debug('Fee estimation', estimation);
  },

  event: (chainId: string, event: string, data?: any) => {
    logger.debug(`XCM Event: ${event}`, {
      chainId,
      event,
      ...data
    });
  }
};

// Structured logging for different event types
export const auditLogger = {
  userAction: (userId: string, action: string, details?: any) => {
    logger.info('User Action', {
      type: 'audit',
      userId,
      action,
      timestamp: new Date().toISOString(),
      ...details
    });
  },

  systemEvent: (event: string, details?: any) => {
    logger.info('System Event', {
      type: 'audit',
      event,
      timestamp: new Date().toISOString(),
      ...details
    });
  },

  security: (event: string, details?: any) => {
    logger.warn('Security Event', {
      type: 'security',
      event,
      timestamp: new Date().toISOString(),
      ...details
    });
  }
};

// Error classification
export const errorLogger = {
  network: (error: any, context?: any) => {
    logger.error('Network Error', {
      type: 'network',
      error: error.message || error,
      stack: error.stack,
      ...context
    });
  },

  blockchain: (chainId: string, error: any, context?: any) => {
    logger.error('Blockchain Error', {
      type: 'blockchain',
      chainId,
      error: error.message || error,
      stack: error.stack,
      ...context
    });
  },

  xcm: (error: any, transactionId?: string, context?: any) => {
    logger.error('XCM Error', {
      type: 'xcm',
      transactionId,
      error: error.message || error,
      stack: error.stack,
      ...context
    });
  },

  validation: (error: any, context?: any) => {
    logger.warn('Validation Error', {
      type: 'validation',
      error: error.message || error,
      ...context
    });
  }
};

// Metrics logging
export const metricsLogger = {
  gauge: (metric: string, value: number, labels?: Record<string, string>) => {
    logger.info('Metric', {
      type: 'metric',
      metricType: 'gauge',
      metric,
      value,
      labels,
      timestamp: Date.now()
    });
  },

  counter: (metric: string, value: number = 1, labels?: Record<string, string>) => {
    logger.info('Metric', {
      type: 'metric',
      metricType: 'counter',
      metric,
      value,
      labels,
      timestamp: Date.now()
    });
  },

  histogram: (metric: string, value: number, labels?: Record<string, string>) => {
    logger.info('Metric', {
      type: 'metric',
      metricType: 'histogram',
      metric,
      value,
      labels,
      timestamp: Date.now()
    });
  }
};

// Export default logger
export default logger;