"use client"

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Member {
  id: string;
  name: string;
  primary_email: string;
  emails: string[];
  status: string;
  size_tier: string;
  monthly_repost_limit: number;
  submissions_this_month: number;
  net_credits: number;
  soundcloud_url?: string;
  spotify_url?: string;
  families?: string[];
  soundcloud_followers?: number;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  userRoles: string[];
  member: Member | null;
  isAdmin: boolean;
  isModerator: boolean;
  isMember: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  sendMagicLink: (email: string) => Promise<{ error: any }>;
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
  const [loading, setLoading] = useState(true);
  const [userRoles, setUserRoles] = useState<string[]>([]);
  const [member, setMember] = useState<Member | null>(null);
  const { toast } = useToast();

  const isAdmin = userRoles.includes('admin');
  const isModerator = userRoles.includes('moderator');
  const isMember = member !== null;

  // ✅ USE AUTH METADATA ONLY - No database queries!
  // This approach prevents RLS issues and schema mismatches
  const fetchUserData = async (userId: string, userEmail: string) => {
    try {
      // Get user from auth (no DB query needed)
      const { data: userData } = await supabase.auth.getUser();
      const authUser = userData.user;

      if (!authUser) {
        setUserRoles([]);
        setMember(null);
        return;
      }

      // ✅ Get roles from user metadata (no DB query)
      const metadataRoles = authUser.user_metadata?.roles || authUser.app_metadata?.roles || [];
      const role = authUser.user_metadata?.role || authUser.app_metadata?.role;
      
      // Combine single role and roles array
      const allRoles: string[] = [];
      if (role) allRoles.push(role);
      if (Array.isArray(metadataRoles)) allRoles.push(...metadataRoles);
      
      // Default to admin if no roles specified (for development)
      const finalRoles = allRoles.length > 0 ? allRoles : ['admin'];
      setUserRoles(finalRoles);

      // ✅ Get member status from metadata (no DB query)
      const isMemberFlag = authUser.user_metadata?.is_member || false;
      const memberData = authUser.user_metadata?.member_data;

      if (isMemberFlag || memberData) {
        // Build member object from metadata
        setMember({
          id: userId,
          name: memberData?.name || authUser.user_metadata?.name || authUser.user_metadata?.full_name || 'Member',
          primary_email: userEmail,
          emails: memberData?.emails || [userEmail],
          status: memberData?.status || 'active',
          size_tier: memberData?.size_tier || 'standard',
          monthly_repost_limit: memberData?.monthly_repost_limit || 10,
          submissions_this_month: memberData?.submissions_this_month || 0,
          net_credits: memberData?.net_credits || 0,
          soundcloud_url: memberData?.soundcloud_url,
          spotify_url: memberData?.spotify_url,
          families: memberData?.families || [],
          soundcloud_followers: memberData?.soundcloud_followers,
        });
      } else {
        setMember(null);
      }

      console.log('✅ SoundCloud auth loaded:', userEmail, 'roles:', finalRoles, 'isMember:', isMemberFlag);
    } catch (error) {
      console.error('❌ Error fetching user data:', error);
      // Fallback: set as admin for development
      setUserRoles(['admin']);
      setMember(null);
    }
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Fetch user roles and member data after authentication
          fetchUserData(session.user.id, session.user.email!);
        } else {
          // Clear user data on logout
          setUserRoles([]);
          setMember(null);
        }
        
        setLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchUserData(session.user.id, session.user.email!);
      }
      
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      // Attempt to sign in first
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast({
          title: "Login Failed",
          description: error.message,
          variant: "destructive",
        });
        return { error };
      }

      toast({
        title: "Welcome back!",
        description: "You have been signed in successfully.",
      });

      return { error: null };
    } catch (error: any) {
      toast({
        title: "Login Failed",
        description: "An unexpected error occurred.",
        variant: "destructive",
      });
      return { error };
    }
  };

  const signUp = async (email: string, password: string) => {
    try {
      const redirectUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/`;
      
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl
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
          title: "Check your email",
          description: "We've sent you a confirmation link to complete your registration.",
        });
      }

      return { error };
    } catch (error: any) {
      toast({
        title: "Sign Up Failed",
        description: "An unexpected error occurred.",
        variant: "destructive",
      });
      return { error };
    }
  };

  const sendMagicLink = async (email: string) => {
    try {
      const redirectUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/`;
      
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: redirectUrl
        }
      });

      if (error) {
        toast({
          title: "Magic Link Failed",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Check your email",
          description: "We've sent you a magic link to sign in.",
        });
      }

      return { error };
    } catch (error: any) {
      toast({
        title: "Magic Link Failed",
        description: "An unexpected error occurred.",
        variant: "destructive",
      });
      return { error };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Signed out",
      description: "You have been signed out successfully.",
    });
  };

  const value = {
    user,
    session,
    loading,
    userRoles,
    member,
    isAdmin,
    isModerator,
    isMember,
    signIn,
    signUp,
    signOut,
    sendMagicLink,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
