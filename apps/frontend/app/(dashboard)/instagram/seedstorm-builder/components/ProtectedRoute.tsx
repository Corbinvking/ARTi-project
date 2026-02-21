"use client"

import { ReactNode, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext';

const PERMISSION_ROLE_MAP: Record<string, string[]> = {
  view_instagram: ['admin', 'manager', 'operator'],
};

interface ProtectedRouteProps {
  children: ReactNode;
  requiredPermissions?: string[];
  fallbackPath?: string;
}

export function ProtectedRoute({ 
  children, 
  requiredPermissions, 
  fallbackPath = '/login' 
}: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.push(fallbackPath);
      return;
    }

    if (requiredPermissions && requiredPermissions.length > 0) {
      const userRole = (
        user.user_metadata?.role ||
        user.app_metadata?.role ||
        ''
      ).toLowerCase();

      const hasPermission = requiredPermissions.every((perm) => {
        const allowed = PERMISSION_ROLE_MAP[perm];
        return allowed ? allowed.includes(userRole) : true;
      });

      if (!hasPermission) {
        setDenied(true);
      }
    }
  }, [user, loading, requiredPermissions, router, fallbackPath]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (denied) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-2">
          <h2 className="text-xl font-semibold">Access Denied</h2>
          <p className="text-muted-foreground text-sm">You do not have permission to view this page.</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

export default ProtectedRoute;
