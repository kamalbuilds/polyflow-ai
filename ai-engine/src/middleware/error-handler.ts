/**
 * Global Error Handler Middleware
 */

import { Request, Response, NextFunction } from 'express';
import { Logger } from '../utils/logger';

const logger = new Logger();

export interface CustomError extends Error {
  status?: number;
  code?: string;
  details?: any;
  requestId?: string;
}

export const errorHandler = (
  error: CustomError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Set default error values
  const status = error.status || 500;
  const message = error.message || 'Internal Server Error';
  const requestId = req['requestId'] || 'unknown';

  // Log the error with context
  logger.requestError(requestId, 'Request failed with error', error, {
    method: req.method,
    path: req.originalUrl,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    body: req.body,
    params: req.params,
    query: req.query,
    status,
    stack: error.stack
  });

  // Prepare error response
  const errorResponse: any = {
    error: true,
    message,
    requestId,
    timestamp: new Date().toISOString()
  };

  // Add additional details based on error type and environment
  if (process.env.NODE_ENV === 'development') {
    errorResponse.stack = error.stack;
    errorResponse.details = error.details;
  }

  // Handle specific error types
  switch (error.code) {
    case 'VALIDATION_ERROR':
      errorResponse.type = 'validation';
      errorResponse.fields = error.details;
      break;

    case 'AUTHENTICATION_ERROR':
      errorResponse.type = 'authentication';
      break;

    case 'AUTHORIZATION_ERROR':
      errorResponse.type = 'authorization';
      break;

    case 'RATE_LIMIT_ERROR':
      errorResponse.type = 'rate_limit';
      errorResponse.retryAfter = error.details?.retryAfter;
      break;

    case 'AI_SERVICE_ERROR':
      errorResponse.type = 'ai_service';
      errorResponse.service = error.details?.service;
      break;

    case 'KNOWLEDGE_BASE_ERROR':
      errorResponse.type = 'knowledge_base';
      break;

    case 'DATABASE_ERROR':
      errorResponse.type = 'database';
      break;

    case 'EXTERNAL_API_ERROR':
      errorResponse.type = 'external_api';
      errorResponse.api = error.details?.api;
      break;

    default:
      errorResponse.type = 'internal';
  }

  // Handle specific HTTP status codes
  switch (status) {
    case 400:
      errorResponse.type = errorResponse.type || 'bad_request';
      break;

    case 401:
      errorResponse.type = errorResponse.type || 'unauthorized';
      break;

    case 403:
      errorResponse.type = errorResponse.type || 'forbidden';
      break;

    case 404:
      errorResponse.type = errorResponse.type || 'not_found';
      break;

    case 429:
      errorResponse.type = errorResponse.type || 'too_many_requests';
      break;

    case 500:
      errorResponse.type = errorResponse.type || 'internal_server_error';
      break;

    case 502:
      errorResponse.type = errorResponse.type || 'bad_gateway';
      break;

    case 503:
      errorResponse.type = errorResponse.type || 'service_unavailable';
      break;

    default:
      errorResponse.type = errorResponse.type || 'unknown';
  }

  // Set appropriate headers
  res.set({
    'Content-Type': 'application/json',
    'X-Request-ID': requestId
  });

  // Send error response
  res.status(status).json(errorResponse);
};

// Custom error classes for different error types
export class ValidationError extends Error {
  public status = 400;
  public code = 'VALIDATION_ERROR';

  constructor(message: string, public details?: any) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends Error {
  public status = 401;
  public code = 'AUTHENTICATION_ERROR';

  constructor(message: string = 'Authentication required') {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends Error {
  public status = 403;
  public code = 'AUTHORIZATION_ERROR';

  constructor(message: string = 'Insufficient permissions') {
    super(message);
    this.name = 'AuthorizationError';
  }
}

export class NotFoundError extends Error {
  public status = 404;
  public code = 'NOT_FOUND_ERROR';

  constructor(message: string = 'Resource not found') {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class RateLimitError extends Error {
  public status = 429;
  public code = 'RATE_LIMIT_ERROR';

  constructor(message: string = 'Rate limit exceeded', public details?: { retryAfter?: number }) {
    super(message);
    this.name = 'RateLimitError';
  }
}

export class AIServiceError extends Error {
  public status = 503;
  public code = 'AI_SERVICE_ERROR';

  constructor(message: string, public details?: { service?: string; originalError?: any }) {
    super(message);
    this.name = 'AIServiceError';
  }
}

export class KnowledgeBaseError extends Error {
  public status = 503;
  public code = 'KNOWLEDGE_BASE_ERROR';

  constructor(message: string, public details?: any) {
    super(message);
    this.name = 'KnowledgeBaseError';
  }
}

export class DatabaseError extends Error {
  public status = 503;
  public code = 'DATABASE_ERROR';

  constructor(message: string, public details?: any) {
    super(message);
    this.name = 'DatabaseError';
  }
}

export class ExternalAPIError extends Error {
  public status = 503;
  public code = 'EXTERNAL_API_ERROR';

  constructor(message: string, public details?: { api?: string; originalError?: any }) {
    super(message);
    this.name = 'ExternalAPIError';
  }
}

// Helper function to create custom errors
export const createError = (
  status: number,
  message: string,
  code?: string,
  details?: any
): CustomError => {
  const error = new Error(message) as CustomError;
  error.status = status;
  error.code = code;
  error.details = details;
  return error;
};

// Async error handler for catching promise rejections in route handlers
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Error handler for uncaught promise rejections
process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
  logger.fatal('Unhandled Promise Rejection', {
    reason,
    promise,
    stack: reason?.stack
  });

  // Gracefully close the server
  process.exit(1);
});

// Error handler for uncaught exceptions
process.on('uncaughtException', (error: Error) => {
  logger.fatal('Uncaught Exception', error);

  // Gracefully close the server
  process.exit(1);
});

// Graceful shutdown on SIGTERM
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');

  // Close server and clean up resources
  process.exit(0);
});

// Graceful shutdown on SIGINT
process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');

  // Close server and clean up resources
  process.exit(0);
});