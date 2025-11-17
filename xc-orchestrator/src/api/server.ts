import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { XCMOrchestrator } from '../core/XCMOrchestrator';
import { createRoutes } from './routes';
import { WebSocketHandler } from './websocket';
import { logger } from '../utils/logger';
import { RateLimiter } from './middleware/rateLimiter';
import { errorHandler } from './middleware/errorHandler';
import { authMiddleware } from './middleware/auth';

export class APIServer {
  private app: express.Application;
  private server: any;
  private io: SocketIOServer;
  private orchestrator: XCMOrchestrator;
  private wsHandler: WebSocketHandler;
  private rateLimiter: RateLimiter;

  constructor(orchestrator: XCMOrchestrator) {
    this.orchestrator = orchestrator;
    this.app = express();
    this.server = createServer(this.app);
    this.io = new SocketIOServer(this.server, {
      cors: {
        origin: process.env.CORS_ORIGIN || "*",
        methods: ["GET", "POST"]
      }
    });

    this.rateLimiter = new RateLimiter();
    this.wsHandler = new WebSocketHandler(this.io, this.orchestrator);
    this.setupMiddleware();
    this.setupRoutes();
    this.setupWebSocket();
  }

  /**
   * Setup Express middleware
   */
  private setupMiddleware(): void {
    // Security middleware
    this.app.use(helmet({
      crossOriginResourcePolicy: { policy: "cross-origin" }
    }));

    // CORS
    this.app.use(cors({
      origin: process.env.CORS_ORIGIN || "*",
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key']
    }));

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));

    // Rate limiting
    this.app.use(this.rateLimiter.middleware());

    // Request logging
    this.app.use((req, res, next) => {
      logger.info('HTTP Request', {
        method: req.method,
        url: req.url,
        userAgent: req.get('User-Agent'),
        ip: req.ip
      });
      next();
    });
  }

  /**
   * Setup API routes
   */
  private setupRoutes(): void {
    // Health check
    this.app.get('/health', (req, res) => {
      const health = this.orchestrator.getHealthStatus();
      res.status(health.overall === 'healthy' ? 200 : 503).json(health);
    });

    // API routes with authentication
    this.app.use('/api', authMiddleware, createRoutes(this.orchestrator));

    // Error handling
    this.app.use(errorHandler);

    // 404 handler
    this.app.use('*', (req, res) => {
      res.status(404).json({
        error: 'Endpoint not found',
        message: `The endpoint ${req.method} ${req.originalUrl} does not exist`
      });
    });
  }

  /**
   * Setup WebSocket handling
   */
  private setupWebSocket(): void {
    this.wsHandler.initialize();
  }

  /**
   * Start the server
   */
  async start(port: number = 3000, host: string = 'localhost'): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server.listen(port, host, () => {
        logger.info('XCM Orchestrator API server started', {
          port,
          host,
          environment: process.env.NODE_ENV || 'development'
        });
        resolve();
      });

      this.server.on('error', (error: Error) => {
        logger.error('Server startup error', { error });
        reject(error);
      });
    });
  }

  /**
   * Stop the server
   */
  async stop(): Promise<void> {
    return new Promise((resolve) => {
      this.server.close(() => {
        logger.info('API server stopped');
        resolve();
      });
    });
  }

  /**
   * Get Express app instance
   */
  getApp(): express.Application {
    return this.app;
  }

  /**
   * Get Socket.IO instance
   */
  getIO(): SocketIOServer {
    return this.io;
  }
}