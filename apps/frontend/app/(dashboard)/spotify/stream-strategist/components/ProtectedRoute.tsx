"use client"

import { ReactNode, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../hooks/useAuth';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRoles?: ('admin' | 'manager' | 'salesperson' | 'vendor')[];
  fallbackPath?: string;
}

export function ProtectedRoute({ 
  children, 
  requiredRoles, 
  fallbackPath = '/login' 
}: ProtectedRouteProps) {
  const { user, loading, currentRole, hasRole } = useAuth();
  const router = useRouter();

  console.log('ProtectedRoute - user:', user?.email, 'currentRole:', currentRole, 'requiredRoles:', requiredRoles, 'loading:', loading);

  useEffect(() => {
    if (loading) return; // Wait for auth state to load

    if (!user) {
      console.log('No user found, redirecting to auth');
      router.push(fallbackPath);
      return;
    }

    if (requiredRoles && requiredRoles.length > 0) {
      const hasRequiredRole = requiredRoles.some(role => hasRole(role));
      
      if (!hasRequiredRole) {
        console.log('Access denied - currentRole:', currentRole, 'required:', requiredRoles);
        router.push('/dashboard'); // Redirect to dashboard instead of showing error
        return;
      }
    }
  }, [user, loading, currentRole, requiredRoles, hasRole, router, fallbackPath]);

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

  if (requiredRoles && requiredRoles.length > 0) {
    const hasRequiredRole = requiredRoles.some(role => hasRole(role));
    
    if (!hasRequiredRole) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-destructive">Access Denied</h1>
            <p className="text-muted-foreground">You don't have permission to access this page.</p>
            <p className="text-xs text-muted-foreground mt-2">
              Current role: {currentRole || 'none'} | Required: {requiredRoles?.join(', ')}
            </p>
          </div>
        </div>
      );
    }
  }

  console.log('Access granted');
  return <>{children}</>;
}








