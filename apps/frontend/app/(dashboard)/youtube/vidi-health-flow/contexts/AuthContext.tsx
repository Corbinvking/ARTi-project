import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from "../integrations/supabase/client";
import { useToast } from '@/hooks/use-toast';

type UserRole = 'admin' | 'manager' | 'salesperson';

interface UserProfile {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  role?: UserRole;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string, selectedRole?: UserRole) => Promise<{ error: any }>;
  signUp: (email: string, password: string, firstName?: string, lastName?: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  hasRole: (role: UserRole) => boolean;
  isAdmin: boolean;
  isManager: boolean;
  isSalesperson: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchUserProfile = async (userId: string, preferredRole?: UserRole) => {
    try {
      // Use auth metadata only (matches Instagram integration pattern)
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      
      if (!user) {
        setProfile(null);
        return;
      }

      // Get role from user metadata (set during login)
      const userRole = user.user_metadata?.role || user.app_metadata?.role || 'admin';

      // Map role names to expected types
      let mappedRole: UserRole = 'admin'; // Default to admin for compatibility
      if (userRole === 'admin' || userRole === 'manager' || userRole === 'salesperson') {
        mappedRole = userRole as UserRole;
      } else if (preferredRole) {
        mappedRole = preferredRole;
      }

      // Build profile from user metadata (no database query needed)
      setProfile({
        id: userId,
        email: user.email ?? '',
        first_name: user.user_metadata?.first_name || user.user_metadata?.full_name?.split(' ')[0],
        last_name: user.user_metadata?.last_name || user.user_metadata?.full_name?.split(' ').slice(1).join(' '),
        role: mappedRole,
      });
      
      console.log('✅ YouTube profile loaded:', user.email, 'role:', mappedRole);
    } catch (error) {
      console.error('❌ Error in fetchUserProfile:', error);
      // Set minimal fallback profile
      setProfile({
        id: userId,
        email: 'user@example.com',
        role: 'admin', // Default to admin to allow all access
      });
    }
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        // Defer profile fetching to avoid deadlock
        if (session?.user) {
          setTimeout(() => {
            fetchUserProfile(session.user.id);
          }, 0);
        } else {
          setProfile(null);
        }
        
        setLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        setTimeout(() => {
          fetchUserProfile(session.user.id);
        }, 0);
      }
      
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string, selectedRole?: UserRole) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        toast({
          title: "Sign In Failed",
          description: error.message,
          variant: "destructive",
        });
      } else if (selectedRole) {
        // If a role was selected, fetch profile with that preferred role
        const session = await supabase.auth.getSession();
        if (session.data.session?.user) {
          await fetchUserProfile(session.data.session.user.id, selectedRole);
        }
      }
      
      return { error };
    } catch (error) {
      console.error('Sign in error:', error);
      return { error };
    }
  };

  const signUp = async (email: string, password: string, firstName?: string, lastName?: string) => {
    try {
      const redirectUrl = `${window.location.origin}/`;
      
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            first_name: firstName,
            last_name: lastName,
          }
        }
      });
      
      if (error) {
        toast({
          title: "Sign Up Failed",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Account Created",
          description: "Your account has been created successfully! You can now sign in.",
        });
      }
      
      return { error };
    } catch (error) {
      console.error('Sign up error:', error);
      return { error };
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        toast({
          title: "Sign Out Failed", 
          description: error.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const hasRole = (role: UserRole): boolean => {
    return profile?.role === role;
  };

  const isAdmin = hasRole('admin');
  const isManager = hasRole('manager');  
  const isSalesperson = hasRole('salesperson');

  const value: AuthContextType = {
    user,
    session,
    profile,
    loading,
    signIn,
    signUp,
    signOut,
    hasRole,
    isAdmin,
    isManager,
    isSalesperson,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};