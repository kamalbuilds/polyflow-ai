import { Request, Response, NextFunction } from 'express';
import { logger } from '../../utils/logger';

interface ErrorResponse {
  error: string;
  message: string;
  details?: any;
  timestamp: string;
  requestId?: string;
}

/**
 * Global error handler middleware
 */
export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Generate unique request ID for tracking
  const requestId = req.headers['x-request-id'] || generateRequestId();

  logger.error('API Error', {
    error: err.message || 'Unknown error',
    stack: err.stack,
    requestId,
    method: req.method,
    url: req.url,
    body: req.body,
    query: req.query,
    params: req.params,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  // Prepare error response
  const errorResponse: ErrorResponse = {
    error: 'Internal Server Error',
    message: 'An unexpected error occurred',
    timestamp: new Date().toISOString(),
    requestId: requestId.toString()
  };

  let statusCode = 500;

  // Handle specific error types
  if (err.name === 'ValidationError') {
    statusCode = 400;
    errorResponse.error = 'Validation Error';
    errorResponse.message = err.message;
    errorResponse.details = err.details;
  } else if (err.name === 'UnauthorizedError') {
    statusCode = 401;
    errorResponse.error = 'Unauthorized';
    errorResponse.message = 'Authentication required';
  } else if (err.name === 'ForbiddenError') {
    statusCode = 403;
    errorResponse.error = 'Forbidden';
    errorResponse.message = 'Insufficient permissions';
  } else if (err.name === 'NotFoundError') {
    statusCode = 404;
    errorResponse.error = 'Not Found';
    errorResponse.message = err.message || 'Resource not found';
  } else if (err.name === 'ConflictError') {
    statusCode = 409;
    errorResponse.error = 'Conflict';
    errorResponse.message = err.message;
  } else if (err.name === 'RateLimitError') {
    statusCode = 429;
    errorResponse.error = 'Rate Limit Exceeded';
    errorResponse.message = err.message || 'Too many requests';

    if (err.retryAfter) {
      res.set('Retry-After', err.retryAfter.toString());
      errorResponse.details = { retryAfter: err.retryAfter };
    }
  } else if (err.name === 'PayloadTooLargeError') {
    statusCode = 413;
    errorResponse.error = 'Payload Too Large';
    errorResponse.message = 'Request payload exceeds size limit';
  } else if (err.status || err.statusCode) {
    // Express-style errors with status codes
    statusCode = err.status || err.statusCode;

    if (statusCode >= 400 && statusCode < 500) {
      errorResponse.error = 'Client Error';
      errorResponse.message = err.message || 'Bad request';
    }
  }

  // Handle specific XCM/Polkadot errors
  if (err.message && typeof err.message === 'string') {
    if (err.message.includes('No connection')) {
      statusCode = 503;
      errorResponse.error = 'Service Unavailable';
      errorResponse.message = 'Blockchain connection unavailable';
    } else if (err.message.includes('Invalid transfer parameters')) {
      statusCode = 400;
      errorResponse.error = 'Invalid Parameters';
      errorResponse.message = err.message;
    } else if (err.message.includes('Insufficient balance')) {
      statusCode = 400;
      errorResponse.error = 'Insufficient Balance';
      errorResponse.message = 'Insufficient balance for transfer';
    } else if (err.message.includes('Route not found') || err.message.includes('No routes found')) {
      statusCode = 404;
      errorResponse.error = 'Route Not Found';
      errorResponse.message = 'No available route for this transfer';
    }
  }

  // Don't expose sensitive error details in production
  if (process.env.NODE_ENV === 'production') {
    if (statusCode === 500) {
      errorResponse.message = 'An internal server error occurred';
    }
    // Don't include stack traces or sensitive details
    delete errorResponse.details;
  } else {
    // In development, include more details
    errorResponse.details = {
      stack: err.stack,
      name: err.name,
      cause: err.cause
    };
  }

  // Set CORS headers for error responses
  res.set({
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key'
  });

  // Send error response
  res.status(statusCode).json(errorResponse);
}

/**
 * 404 Not Found handler
 */
export function notFoundHandler(req: Request, res: Response): void {
  const requestId = req.headers['x-request-id'] || generateRequestId();

  logger.warn('404 Not Found', {
    requestId,
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  res.status(404).json({
    error: 'Not Found',
    message: `The endpoint ${req.method} ${req.originalUrl} does not exist`,
    timestamp: new Date().toISOString(),
    requestId: requestId.toString()
  });
}

/**
 * Async error handler wrapper
 */
export function asyncHandler(fn: Function) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Create custom error classes
 */
export class ValidationError extends Error {
  details: any;

  constructor(message: string, details?: any) {
    super(message);
    this.name = 'ValidationError';
    this.details = details;
  }
}

export class UnauthorizedError extends Error {
  constructor(message: string = 'Authentication required') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends Error {
  constructor(message: string = 'Insufficient permissions') {
    super(message);
    this.name = 'ForbiddenError';
  }
}

export class NotFoundError extends Error {
  constructor(message: string = 'Resource not found') {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConflictError';
  }
}

export class RateLimitError extends Error {
  retryAfter: number;

  constructor(message: string, retryAfter: number) {
    super(message);
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
  }
}

/**
 * Generate unique request ID
 */
function generateRequestId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

/**
 * Express error handler for unhandled promise rejections
 */
export function unhandledRejectionHandler(reason: any, promise: Promise<any>): void {
  logger.error('Unhandled Promise Rejection', {
    reason: reason?.message || reason,
    stack: reason?.stack,
    promise: promise.toString()
  });

  // In production, you might want to gracefully shutdown
  if (process.env.NODE_ENV === 'production') {
    logger.error('Shutting down due to unhandled promise rejection');
    process.exit(1);
  }
}

/**
 * Express error handler for uncaught exceptions
 */
export function uncaughtExceptionHandler(error: Error): void {
  logger.error('Uncaught Exception', {
    error: error.message,
    stack: error.stack
  });

  // Always shutdown on uncaught exceptions
  logger.error('Shutting down due to uncaught exception');
  process.exit(1);
}