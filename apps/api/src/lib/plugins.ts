import { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import fastifyJwt from '@fastify/jwt';

export async function setupPlugins(server: FastifyInstance) {
  // Security headers
  await server.register(helmet, {
    global: true,
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
  });

  // CORS configuration - Disabled since Caddy handles CORS
  // await server.register(cors, {
  //   origin: (origin, callback) => {
  //         // Production domains for artistinfluence.com
  //         const productionFrontend = process.env.FRONTEND_URL || 'https://app.artistinfluence.com';
  //         const productionDomain = process.env.PRODUCTION_DOMAIN || 'https://api.artistinfluence.com';

  //         const allowedOrigins = [
  //           // Production URLs
  //           'https://app.artistinfluence.com',
  //           'https://artistinfluence.com',
  //           'https://api.artistinfluence.com',
  //           productionFrontend,
  //           productionDomain,

  //           // Vercel preview deployments
  //           /^https:\/\/.*\.vercel\.app$/,

  //           // Local development
  //           'http://localhost:3000',    // Frontend dev server
  //           'http://localhost:3001',    // API dev server
  //           'http://localhost:8080',    // Caddy unified endpoint
  //         ];

  //     // Allow requests with no origin (mobile apps, curl, etc.)
  //     if (!origin) return callback(null, true);

  //     // Check if origin matches allowed patterns
  //     const isAllowed = allowedOrigins.some(allowed => {
  //       if (typeof allowed === 'string') {
  //         return allowed === origin;
  //       }
  //       return allowed.test(origin);
  //     });

  //     if (isAllowed) {
  //       callback(null, true);
  //     } else {
  //       server.log.warn({ origin }, 'CORS: Origin not allowed');
  //       callback(new Error(`CORS: Origin '${origin}' not allowed`), false);
  //     }
  //   },
  //   credentials: true,
  //   methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  //   allowedHeaders: [
  //     'Content-Type', 
  //     'Authorization', 
  //     'X-Requested-With',
  //     'Cache-Control',
  //     'X-User-Agent',
  //     // Supabase specific headers
  //     'x-supabase-api-version',
  //     'x-client-info',
  //     'apikey',
  //     'x-supabase-auth-token'
  //   ],
  // });

  // Rate limiting
  await server.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
    keyGenerator: (request) => {
      return request.ip || 'unknown';
    },
    errorResponseBuilder: (_request, context) => {
      return {
        code: 429,
        error: 'Too Many Requests',
        message: `Rate limit exceeded, retry in ${Math.round(context.ttl / 1000)} seconds`,
        expiresIn: Math.round(context.ttl / 1000),
      };
    },
  });

  // JWT handling - simplified for Day 1 build
  await server.register(fastifyJwt, {
    secret: process.env.JWT_SECRET || 'temporary-secret-for-day1',
    formatUser: (payload: any) => {
      return {
        id: payload.sub,
        email: payload.email,
        orgId: payload.org_id,
        role: payload.role,
      };
    },
  });
}
