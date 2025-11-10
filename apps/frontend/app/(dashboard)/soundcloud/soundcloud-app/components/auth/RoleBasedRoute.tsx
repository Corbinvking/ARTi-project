"use client"

import React, { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '../../contexts/AuthContext';

interface RoleBasedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
  requireMember?: boolean;
  requireAuth?: boolean;
}

export const RoleBasedRoute: React.FC<RoleBasedRouteProps> = ({ 
  children, 
  allowedRoles = [],
  requireMember = false,
  requireAuth = true 
}) => {
  const { user, loading, userRoles, member } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  
  useEffect(() => {
    if (loading) return;

    // Require authentication
    if (requireAuth && !user) {
      router.push(`/login?redirect=${encodeURIComponent(pathname || '/soundcloud')}`);
      return;
    }
    
    // Require member status
    if (requireMember && !member) {
      router.push('/login');
      return;
    }
    
    // Check allowed roles
    if (allowedRoles.length > 0) {
      const hasAllowedRole = allowedRoles.some(role => userRoles.includes(role));
      if (!hasAllowedRole) {
        // Redirect based on user type
        if (member && !userRoles.includes('admin') && !userRoles.includes('moderator')) {
          router.push('/soundcloud/portal');
        } else if (userRoles.includes('admin') || userRoles.includes('moderator')) {
          router.push('/soundcloud/dashboard');
        } else {
          router.push('/login');
        }
      }
    }
  }, [user, loading, member, userRoles, allowedRoles, requireMember, requireAuth, router, pathname]);
  
  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }
  
  // Don't render children if auth checks are failing (let useEffect handle redirect)
  if (requireAuth && !user) return null;
  if (requireMember && !member) return null;
  
  if (allowedRoles.length > 0) {
    const hasAllowedRole = allowedRoles.some(role => userRoles.includes(role));
    if (!hasAllowedRole) return null;
  }
  
  return <>{children}</>;
};

// Export both for compatibility
export { RoleBasedRoute as default };
