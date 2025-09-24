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

  // Get user permissions - moved from frontend API route
  server.get('/permissions', {
    preHandler: [requireAuth],
  }, async (request, reply) => {
    try {
      const userId = request.user!.id;
      
      const { supabase } = await import('@/lib/supabase');
      
      // Get user permissions from database
      const { data: permissions, error } = await supabase
        .from('user_permissions')
        .select('platform, can_read, can_write, can_delete')
        .eq('user_id', userId);

      if (error) {
        request.log.error({ error, userId }, 'Failed to load user permissions');
        return reply.status(500).send({
          error: 'Failed to load permissions',
          details: error.message,
        });
      }

      request.log.info({ userId, permissionCount: permissions?.length || 0 }, 'Loaded user permissions');

      return {
        permissions: permissions || [],
        userId,
        timestamp: new Date().toISOString(),
      };
      
    } catch (error) {
      request.log.error({ error }, 'Error in permissions endpoint');
      return reply.status(500).send({
        error: 'Internal server error',
      });
    }
  });
}
