import { FastifyInstance } from 'fastify';
import { supabase } from '@/lib/supabase';
import { redis } from '@/lib/redis';

export async function healthRoutes(server: FastifyInstance) {
  // Basic health check - always returns 200
  server.get('/healthz', async () => {
    return { 
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
    };
  });

  // Readiness check - tests dependencies
  server.get('/readyz', async (request, reply) => {
    const checks = {
      database: 'unknown',
      redis: 'unknown',
      jwks: 'unknown',
    };

    let allHealthy = true;

    try {
      // Test database connection
      const { error: dbError } = await supabase
        .from('orgs')
        .select('id')
        .limit(1);
      
      if (dbError && !dbError.message.includes('relation "orgs" does not exist')) {
        checks.database = 'error';
        allHealthy = false;
      } else {
        checks.database = 'ok';
      }
    } catch (err) {
      request.log.error({ err }, 'Database health check failed');
      checks.database = 'error';
      allHealthy = false;
    }

    try {
      // Test Redis connection
      const pong = await redis.ping();
      checks.redis = pong === 'PONG' ? 'ok' : 'error';
      if (checks.redis === 'error') allHealthy = false;
    } catch (err) {
      request.log.error({ err }, 'Redis health check failed');
      checks.redis = 'error';
      allHealthy = false;
    }

    try {
      // Test JWKS endpoint accessibility
      const jwksUrl = `${process.env.JWT_ISSUER}/jwks`;
      const response = await fetch(jwksUrl);
      checks.jwks = response.ok ? 'ok' : 'error';
      if (checks.jwks === 'error') allHealthy = false;
    } catch (err) {
      request.log.error({ err }, 'JWKS health check failed');
      checks.jwks = 'error';
      allHealthy = false;
    }

    const status = allHealthy ? 200 : 503;
    
    return reply.status(status).send({
      status: allHealthy ? 'ready' : 'not ready',
      timestamp: new Date().toISOString(),
      checks,
    });
  });
}
