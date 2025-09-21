import { FastifyRequest, FastifyReply } from 'fastify';

export async function requireAuth(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify();
    
    // User is set by the JWT plugin's formatUser function
    if (!request.user) {
      return reply.status(401).send({
        error: 'Unauthorized',
        message: 'Invalid token payload',
      });
    }

    // Log the authenticated request
    request.log.info({
      userId: request.user.id,
      orgId: request.user.orgId,
      role: request.user.role,
    }, 'Authenticated request');

  } catch (err) {
    request.log.warn({ err }, 'Authentication failed');
    return reply.status(401).send({
      error: 'Unauthorized',
      message: 'Invalid or expired token',
    });
  }
}

export function requireRole(allowedRoles: string[]) {
  return async function(request: FastifyRequest, reply: FastifyReply) {
    // Auth middleware should run first
    if (!request.user) {
      return reply.status(401).send({
        error: 'Unauthorized',
        message: 'Authentication required',
      });
    }

    if (!allowedRoles.includes(request.user.role)) {
      request.log.warn({
        userId: request.user.id,
        userRole: request.user.role,
        requiredRoles: allowedRoles,
      }, 'Insufficient permissions');

      return reply.status(403).send({
        error: 'Forbidden',
        message: 'Insufficient permissions',
        required: allowedRoles,
        current: request.user.role,
      });
    }
  };
}

export const requireAdmin = requireRole(['admin']);
export const requireManagerOrAdmin = requireRole(['admin', 'manager']);
