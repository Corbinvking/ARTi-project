import 'dotenv/config';
import Fastify from 'fastify';
import { logger } from '@/lib/logger';
import { setupPlugins } from '@/lib/plugins';
import { setupRoutes } from '@/routes';
import { supabase } from '@/lib/supabase';
import { redis } from '@/lib/redis';
import { initializeEmbeddingModel } from '@/lib/query-embeddings';
import { randomUUID } from 'crypto';
import { startWorker } from './worker.js';

const server = Fastify({
  logger: true,
  requestIdHeader: 'x-request-id',
  requestIdLogLabel: 'reqId',
  genReqId: () => randomUUID(),
});

async function startServer() {
  try {
    // Initialize embedding model
    await initializeEmbeddingModel();

    // Test Redis connection (optional)
    if (redis) {
      logger.info('Testing Redis connection...');
      try {
        await redis.ping();
        logger.info('Redis connection successful');
      } catch (redisError) {
        logger.warn('Redis connection failed, continuing without Redis');
      }
    } else {
      logger.info('Redis not configured, continuing without Redis');
    }

    // Test database connection (non-blocking in production)
    if (process.env.NODE_ENV !== 'production') {
      logger.info('Testing database connection...');
      const { error: dbError } = await supabase.from('orgs').select('id').limit(1);
      if (dbError && !dbError.message.includes('relation "orgs" does not exist')) {
        logger.warn(`Database connection failed: ${dbError.message}`);
      }
    }

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

    // Start background worker (BullMQ cron jobs for YouTube 3x daily, etc.)
    await startWorker();

  } catch (err) {
    logger.error(err, 'Failed to start server');
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  await server.close();
  if (redis) {
    await redis.disconnect();
  }
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  await server.close();
  if (redis) {
    await redis.disconnect();
  }
  process.exit(0);
});

if (require.main === module) {
  startServer();
}
