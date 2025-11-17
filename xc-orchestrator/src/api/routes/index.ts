import { Router } from 'express';
import { XCMOrchestrator } from '../../core/XCMOrchestrator';
import { transferRoutes } from './transfers';
import { monitoringRoutes } from './monitoring';
import { routesRoutes } from './routes';
import { analyticsRoutes } from './analytics';
import { configRoutes } from './config';

export function createRoutes(orchestrator: XCMOrchestrator): Router {
  const router = Router();

  // API version info
  router.get('/', (req, res) => {
    res.json({
      name: 'XCM Orchestrator API',
      version: process.env.npm_package_version || '1.0.0',
      description: 'Cross-chain orchestrator for seamless XCM message routing and execution',
      endpoints: {
        transfers: '/api/transfers',
        monitoring: '/api/monitoring',
        routes: '/api/routes',
        analytics: '/api/analytics',
        config: '/api/config'
      }
    });
  });

  // Mount sub-routers
  router.use('/transfers', transferRoutes(orchestrator));
  router.use('/monitoring', monitoringRoutes(orchestrator));
  router.use('/routes', routesRoutes(orchestrator));
  router.use('/analytics', analyticsRoutes(orchestrator));
  router.use('/config', configRoutes(orchestrator));

  return router;
}