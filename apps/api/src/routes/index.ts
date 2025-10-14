import { FastifyInstance } from 'fastify';
import { healthRoutes } from './health';
import { authRoutes } from './auth';
import { webhookRoutes } from './webhooks';
import { providersRoutes } from './providers';
import { adminRoutes } from './admin';
import { insightsRoutes } from './insights';
import aiAnalyticsRoutes from './ai-analytics';

export async function setupRoutes(server: FastifyInstance) {
  // Health check routes (no auth required) - available at both / and /api
  await server.register(healthRoutes);
  await server.register(healthRoutes, { prefix: '/api' });

  // Auth routes
  await server.register(authRoutes, { prefix: '/auth' });

  // Webhook routes  
  await server.register(webhookRoutes, { prefix: '/webhooks' });

  // Provider routes (Spotify OAuth, metrics, etc.)
  await server.register(providersRoutes, { prefix: '/api' });

  // Admin routes (user management, jobs, etc.)
  await server.register(adminRoutes, { prefix: '/api' });

  // Insights routes (LLM, RAG, vector search)
  await server.register(insightsRoutes, { prefix: '/api' });

  // AI Analytics routes (RAG-based analytics chat)
  await server.register(aiAnalyticsRoutes, { prefix: '/api' });

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
