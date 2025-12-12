import { FastifyInstance } from 'fastify';
import { healthRoutes } from './health';
import { authRoutes } from './auth';
import { webhookRoutes } from './webhooks';
import { providersRoutes } from './providers';
import { adminRoutes } from './admin';
import { insightsRoutes } from './insights';
import aiAnalyticsRoutes from './ai-analytics-simple'; // Using simple version for now
import { spotifyWebApiRoutes } from './spotify-web-api';
import { s4aIngestRoutes } from './s4a-ingest';
import { youtubeDataApiRoutes } from './youtube-data-api';
import { ratioFixerBridgeRoutes } from './ratio-fixer-bridge';
import instagramScraperRoutes from './instagram-scraper';
import { scraperControlRoutes } from './scraper-control';

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

  // Spotify Web API routes (metadata enrichment)
  await server.register(spotifyWebApiRoutes, { prefix: '/api' });

  // S4A Ingest routes (scraper data ingestion)
  await server.register(s4aIngestRoutes, { prefix: '/api' });

  // YouTube Data API routes (video stats fetching)
  await server.register(youtubeDataApiRoutes, { prefix: '/api' });

  // Ratio Fixer Bridge routes (Flask app integration)
  await server.register(ratioFixerBridgeRoutes, { prefix: '/api' });

  // Instagram Scraper routes (Apify integration)
  await server.register(instagramScraperRoutes, { prefix: '/api/instagram-scraper' });

  // Scraper Control routes (health check, manual trigger)
  await server.register(scraperControlRoutes, { prefix: '/api' });

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
