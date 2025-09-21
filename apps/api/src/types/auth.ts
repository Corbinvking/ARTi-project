export interface User {
  id: string;
  email: string;
  orgId: string;
  role: 'admin' | 'manager' | 'analyst' | 'creator';
}

export interface JWTPayload {
  sub: string;
  email: string;
  org_id: string;
  role: 'admin' | 'manager' | 'analyst' | 'creator';
  aud: string;
  iss: string;
  iat: number;
  exp: number;
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    user: User;
  }
}
