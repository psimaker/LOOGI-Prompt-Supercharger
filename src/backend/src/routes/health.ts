import { Router } from 'express';

const router = Router();

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
  dependencies: {
    database: 'connected' | 'disconnected';
    aiService: 'available' | 'unavailable';
  };
}

router.get('/', (_req, res) => {
  const healthStatus: HealthStatus = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    dependencies: {
      database: 'connected', // TODO: Implement actual database check
      aiService: 'available', // TODO: Implement actual AI service check
    },
  };

  // Determine overall status based on dependencies
  if (healthStatus.dependencies.database === 'disconnected' || 
      healthStatus.dependencies.aiService === 'unavailable') {
    healthStatus.status = 'degraded';
  }

  const statusCode = healthStatus.status === 'healthy' ? 200 : 503;
  
  res.status(statusCode).json(healthStatus);
});

router.get('/ready', (_req, res) => {
  // Readiness probe - check if the service is ready to accept requests
  const isReady = true; // TODO: Implement actual readiness checks
  
  res.status(isReady ? 200 : 503).json({
    ready: isReady,
    timestamp: new Date().toISOString(),
  });
});

router.get('/live', (_req, res) => {
  // Liveness probe - check if the service is alive
  res.status(200).json({
    alive: true,
    timestamp: new Date().toISOString(),
  });
});

export { router as healthRouter };