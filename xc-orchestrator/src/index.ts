#!/usr/bin/env node

import dotenv from 'dotenv';
import { XCMOrchestrator } from './core/XCMOrchestrator';
import { APIServer } from './api/server';
import { logger } from './utils/logger';
import { uncaughtExceptionHandler, unhandledRejectionHandler } from './api/middleware/errorHandler';

// Load environment variables
dotenv.config();

// Global error handlers
process.on('uncaughtException', uncaughtExceptionHandler);
process.on('unhandledRejection', unhandledRejectionHandler);

class XCMOrchestratorApp {
  private orchestrator: XCMOrchestrator;
  private apiServer: APIServer;
  private isShuttingDown = false;

  constructor() {
    // Initialize orchestrator with configuration from environment
    this.orchestrator = new XCMOrchestrator({
      maxConcurrentTransactions: parseInt(process.env.MAX_CONCURRENT_TRANSACTIONS || '10'),
      enableAutoRetry: process.env.ENABLE_AUTO_RETRY !== 'false',
      enableFeeOptimization: process.env.AUTO_FEE_ESTIMATION !== 'false',
      enableRouteOptimization: process.env.ENABLE_ROUTE_OPTIMIZATION !== 'false',
      monitoringInterval: parseInt(process.env.MONITORING_INTERVAL || '5000'),
      cacheTimeout: parseInt(process.env.CACHE_TIMEOUT || '300000'),
      notifications: {
        webhook: process.env.WEBHOOK_URL,
        discord: process.env.DISCORD_WEBHOOK,
        slack: process.env.SLACK_WEBHOOK,
        telegram: process.env.TELEGRAM_CONFIG,
        email: process.env.EMAIL_CONFIG
      }
    });

    // Initialize API server
    this.apiServer = new APIServer(this.orchestrator);

    // Setup shutdown handlers
    this.setupGracefulShutdown();
  }

  /**
   * Start the application
   */
  async start(): Promise<void> {
    try {
      logger.info('Starting XCM Orchestrator', {
        version: process.env.npm_package_version || '1.0.0',
        nodeEnv: process.env.NODE_ENV || 'development',
        port: process.env.PORT || 3000
      });

      // Initialize orchestrator
      await this.orchestrator.initialize();

      // Start API server
      const port = parseInt(process.env.PORT || '3000');
      const host = process.env.HOST || 'localhost';
      await this.apiServer.start(port, host);

      logger.info('XCM Orchestrator started successfully', {
        apiUrl: `http://${host}:${port}`,
        healthCheck: `http://${host}:${port}/health`,
        apiDocs: `http://${host}:${port}/api`
      });

      // Log initial status
      const health = this.orchestrator.getHealthStatus();
      logger.info('Initial health status', health);

    } catch (error) {
      logger.error('Failed to start XCM Orchestrator', { error });
      process.exit(1);
    }
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    if (this.isShuttingDown) {
      logger.warn('Shutdown already in progress');
      return;
    }

    this.isShuttingDown = true;
    logger.info('Initiating graceful shutdown');

    try {
      // Stop API server first
      logger.info('Stopping API server');
      await this.apiServer.stop();

      // Shutdown orchestrator
      logger.info('Shutting down XCM orchestrator');
      await this.orchestrator.shutdown();

      logger.info('Graceful shutdown completed');
      process.exit(0);
    } catch (error) {
      logger.error('Error during shutdown', { error });
      process.exit(1);
    }
  }

  /**
   * Setup graceful shutdown handlers
   */
  private setupGracefulShutdown(): void {
    // Handle SIGTERM (docker stop, kubernetes)
    process.on('SIGTERM', () => {
      logger.info('Received SIGTERM signal');
      this.shutdown();
    });

    // Handle SIGINT (Ctrl+C)
    process.on('SIGINT', () => {
      logger.info('Received SIGINT signal');
      this.shutdown();
    });

    // Handle SIGUSR2 (nodemon restart)
    process.on('SIGUSR2', () => {
      logger.info('Received SIGUSR2 signal');
      this.shutdown();
    });
  }
}

// Start the application
async function main() {
  const app = new XCMOrchestratorApp();
  await app.start();
}

// Only run if this is the main module
if (require.main === module) {
  main().catch((error) => {
    logger.error('Failed to start application', { error });
    process.exit(1);
  });
}

export { XCMOrchestratorApp };