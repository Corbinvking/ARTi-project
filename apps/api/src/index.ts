import 'dotenv/config';
import Fastify from 'fastify';
import { logger } from '@/lib/logger';
import { setupPlugins } from '@/lib/plugins';
import { setupRoutes } from '@/routes';
import { supabase } from '@/lib/supabase';
import { redis } from '@/lib/redis';
import { randomUUID } from 'crypto';

const server = Fastify({
  logger: true,
  requestIdHeader: 'x-request-id',
  requestIdLogLabel: 'reqId',
  genReqId: () => randomUUID(),
});

async function startServer() {
  try {
    // Test connections
    logger.info('Testing database connection...');
    const { error: dbError } = await supabase.from('orgs').select('id').limit(1);
    if (dbError && !dbError.message.includes('relation "orgs" does not exist')) {
      throw new Error(`Database connection failed: ${dbError.message}`);
    }

    logger.info('Testing Redis connection...');
    await redis.ping();

    // Setup plugins and routes
    await setupPlugins(server);
    await setupRoutes(server);

    const port = parseInt(process.env.PORT || '3001', 10);
    const host = process.env.NODE_ENV === 'production' ? '0.0.0.0' : 'localhost';

    await server.listen({ port, host });
    
    logger.info({
      port,
      host,
      nodeEnv: process.env.NODE_ENV,
    }, 'Server started successfully');

  } catch (err) {
    logger.error(err, 'Failed to start server');
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  await server.close();
  await redis.disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  await server.close();
  await redis.disconnect();
  process.exit(0);
});

if (require.main === module) {
  startServer();
}
