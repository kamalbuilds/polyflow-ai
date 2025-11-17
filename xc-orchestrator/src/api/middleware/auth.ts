import { Request, Response, NextFunction } from 'express';
import { logger } from '../../utils/logger';

interface AuthRequest extends Request {
  user?: {
    id: string;
    role: string;
    permissions: string[];
  };
}

/**
 * Simple API key authentication middleware
 */
export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction): void {
  const apiKey = req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '');

  // Skip auth for health checks and public endpoints
  if (req.path === '/health' || req.path === '/' || req.path.startsWith('/docs')) {
    return next();
  }

  if (!apiKey) {
    logger.warn('Unauthorized access attempt', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      url: req.url
    });

    return res.status(401).json({
      error: 'Unauthorized',
      message: 'API key is required. Provide it in X-API-Key header or Authorization Bearer token.'
    });
  }

  // Simple API key validation
  const validApiKey = process.env.API_KEY || 'your-api-key-here';

  if (apiKey !== validApiKey) {
    logger.warn('Invalid API key used', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      url: req.url,
      apiKey: apiKey.substring(0, 8) + '...' // Log partial key for debugging
    });

    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid API key provided.'
    });
  }

  // Set user context (in a real app, this would come from a database)
  req.user = {
    id: 'api-user',
    role: 'admin',
    permissions: ['transfer', 'read', 'admin']
  };

  logger.debug('Authenticated API request', {
    userId: req.user.id,
    role: req.user.role,
    url: req.url
  });

  next();
}

/**
 * Role-based authorization middleware
 */
export function requireRole(role: string) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required'
      });
    }

    if (req.user.role !== role && req.user.role !== 'admin') {
      logger.warn('Insufficient permissions', {
        userId: req.user.id,
        userRole: req.user.role,
        requiredRole: role,
        url: req.url
      });

      return res.status(403).json({
        error: 'Forbidden',
        message: `Role '${role}' is required for this operation`
      });
    }

    next();
  };
}

/**
 * Permission-based authorization middleware
 */
export function requirePermission(permission: string) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required'
      });
    }

    if (!req.user.permissions.includes(permission) && req.user.role !== 'admin') {
      logger.warn('Insufficient permissions', {
        userId: req.user.id,
        userPermissions: req.user.permissions,
        requiredPermission: permission,
        url: req.url
      });

      return res.status(403).json({
        error: 'Forbidden',
        message: `Permission '${permission}' is required for this operation`
      });
    }

    next();
  };
}

/**
 * JWT authentication middleware (placeholder for more advanced auth)
 */
export function jwtAuth(req: AuthRequest, res: Response, next: NextFunction): void {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'JWT token is required'
    });
  }

  try {
    // In a real implementation, verify JWT token here
    // const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // req.user = decoded as any;

    // For now, just a placeholder
    req.user = {
      id: 'jwt-user',
      role: 'user',
      permissions: ['transfer', 'read']
    };

    next();
  } catch (error) {
    logger.warn('Invalid JWT token', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid JWT token'
    });
  }
}