import { FastifyInstance } from 'fastify';
import { healthRoutes } from './health';
import { authRoutes } from './auth';
import { webhookRoutes } from './webhooks';

export async function setupRoutes(server: FastifyInstance) {
  // Health check routes (no auth required)
  await server.register(healthRoutes);

  // Auth routes
  await server.register(authRoutes, { prefix: '/auth' });

  // Webhook routes  
  await server.register(webhookRoutes, { prefix: '/webhooks' });

  // API routes (auth required)
  await server.register(async function protectedRoutes(server) {
    // All routes in this context require authentication
    server.addHook('preHandler', async (request) => {
      await request.jwtVerify();
    });

    // Add protected routes here as we build them
    server.get('/protected', async (request) => {
      return { 
        message: 'This is a protected route',
        user: request.user,
      };
    });
  }, { prefix: '/api' });
}
