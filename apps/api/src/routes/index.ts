import { FastifyInstance } from 'fastify';
import { healthRoutes } from './health';
import { authRoutes } from './auth';
import { webhookRoutes } from './webhooks';
import { providersRoutes } from './providers';
import { adminRoutes } from './admin';
import { insightsRoutes } from './insights';
import aiAnalyticsRoutes from './ai-analytics-llm'; // LLM-powered version with Claude/OpenAI
import { spotifyWebApiRoutes } from './spotify-web-api';
import { s4aIngestRoutes } from './s4a-ingest';
import { youtubeDataApiRoutes } from './youtube-data-api';
import { ratioFixerBridgeRoutes } from './ratio-fixer-bridge';
import instagramScraperRoutes from './instagram-scraper';
import { scraperControlRoutes } from './scraper-control';
import { statusNotifyRoutes } from './status-notify';
import { weeklyUpdatesRoutes } from './weekly-updates';
import { scraperNotifyRoutes } from './scraper-notify';
import { invoiceCampaignRoutes } from './invoice-campaign';
import { soundcloudMemberRoutes } from './soundcloud-members';
import { quickbooksRoutes } from './quickbooks';
import { slackNotifyRoutes } from './slack-notify';

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

  // Status notification routes
  await server.register(statusNotifyRoutes, { prefix: '/api' });

  // Weekly updates routes (client email reports)
  await server.register(weeklyUpdatesRoutes, { prefix: '/api' });

  // Scraper notification routes (comment scraper integration)
  await server.register(scraperNotifyRoutes, { prefix: '/api' });

  // Invoice-to-campaign routes (external invoice system integration)
  await server.register(invoiceCampaignRoutes, { prefix: '/api' });

  // Instagram Scraper routes (Apify integration)
  await server.register(instagramScraperRoutes, { prefix: '/api/instagram-scraper' });

  // Scraper Control routes (health check, manual trigger)
  await server.register(scraperControlRoutes, { prefix: '/api' });

  // SoundCloud member auth lifecycle routes (provision/deprovision)
  await server.register(soundcloudMemberRoutes, { prefix: '/api' });

  // QuickBooks Online integration routes (OAuth, sync, webhooks, metrics)
  await server.register(quickbooksRoutes, { prefix: '/api' });

  // Slack notification routes (webhook integration)
  await server.register(slackNotifyRoutes, { prefix: '/api' });

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
