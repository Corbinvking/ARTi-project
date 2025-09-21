import { FastifyInstance } from 'fastify';
import { requireAuth } from '@/middleware/auth';

export async function authRoutes(server: FastifyInstance) {
  // Debug endpoint to echo JWT claims
  server.get('/me', {
    preHandler: [requireAuth],
  }, async (request) => {
    return {
      user: request.user,
      timestamp: new Date().toISOString(),
    };
  });

  // Test endpoint for cross-org isolation verification
  server.get('/test-isolation', {
    preHandler: [requireAuth],
  }, async (request, reply) => {
    const { supabase } = await import('@/lib/supabase');
    
    // This query should only return data for the user's org
    const { data, error } = await supabase
      .from('orgs')
      .select('id, name')
      .eq('id', request.user!.orgId);

    if (error) {
      request.log.error({ error }, 'Database query failed');
      return reply.status(500).send({
        error: 'Database query failed',
        details: error.message,
      });
    }

    return {
      message: 'Cross-org isolation test',
      userOrg: request.user!.orgId,
      accessibleOrgs: data,
      isolation: data.length <= 1 ? 'SECURE' : 'BREACH',
    };
  });
}
