"use client"

import { ReactNode, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext';

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

  console.log('ProtectedRoute - user:', user?.email, 'requiredPermissions:', requiredPermissions, 'loading:', loading);

  useEffect(() => {
    if (loading) return; // Wait for auth state to load

    if (!user) {
      console.log('No user found, redirecting to auth');
      router.push(fallbackPath);
      return;
    }

    // TODO: Add permission checking if needed
    if (requiredPermissions && requiredPermissions.length > 0) {
      // For now, just allow authenticated users
      console.log('Permissions check would go here:', requiredPermissions);
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

  console.log('Access granted');
  return <>{children}</>;
}

export default ProtectedRoute;
