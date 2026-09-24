import { createApp } from './app.js';
import { loadEnv } from './config/env.js';
import { logger } from './utils/logger.js';

function main(): void {
  const env = loadEnv();
  const app = createApp({ frontendDist: env.FRONTEND_DIST });

  const server = app.listen(env.PORT, env.HOST, () => {
    logger.info('Server listening', { host: env.HOST, port: env.PORT, nodeEnv: env.NODE_ENV });
  });

  const shutdown = (signal: NodeJS.Signals): void => {
    logger.info('Shutting down', { signal });
    server.close(() => process.exit(0));
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

try {
  main();
} catch (error) {
  logger.error('Failed to start server', { error });
  process.exit(1);
}
