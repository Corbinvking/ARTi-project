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

  // Fetch user data - tries database first, falls back to metadata
  const fetchUserData = async (userId: string, userEmail: string) => {
    try {
      // Get user from auth
      const { data: userData } = await supabase.auth.getUser();
      const authUser = userData.user;

      if (!authUser) {
        setUserRoles([]);
        setMember(null);
        return;
      }

      // Get roles from user metadata
      const metadataRoles = authUser.user_metadata?.roles || authUser.app_metadata?.roles || [];
      const role = authUser.user_metadata?.role || authUser.app_metadata?.role;
      
      // Combine single role and roles array
      const allRoles: string[] = [];
      if (role) allRoles.push(role);
      if (Array.isArray(metadataRoles)) allRoles.push(...metadataRoles);
      
      // Default to admin if no roles specified (for development)
      const finalRoles = allRoles.length > 0 ? allRoles : ['admin'];
      setUserRoles(finalRoles);

      // Try to fetch member from database
      let memberData: Member | null = null;
      
      // Method 1: Check soundcloud_member_users linking table
      try {
        const { data: linkData } = await supabase
          .from('soundcloud_member_users')
          .select('member_id')
          .eq('user_id', userId)
          .single();
        
        if (linkData?.member_id) {
          const { data: memberRecord } = await supabase
            .from('soundcloud_members')
            .select('*')
            .eq('id', linkData.member_id)
            .single();
          
          if (memberRecord) {
            memberData = {
              id: memberRecord.id,
              name: memberRecord.name,
              primary_email: memberRecord.primary_email || userEmail,
              emails: memberRecord.emails || [userEmail],
              status: memberRecord.status || 'active',
              size_tier: memberRecord.size_tier || 'T1',
              monthly_repost_limit: memberRecord.monthly_submission_limit || memberRecord.monthly_repost_limit || 10,
              submissions_this_month: memberRecord.submissions_this_month || 0,
              net_credits: memberRecord.net_credits || 0,
              soundcloud_url: memberRecord.soundcloud_url,
              spotify_url: memberRecord.spotify_url,
              families: memberRecord.families || [],
              soundcloud_followers: memberRecord.soundcloud_followers || memberRecord.followers,
            };
          }
        }
      } catch (e) {
        // Table might not exist, continue to next method
      }

      // Method 2: Direct user_id lookup on soundcloud_members
      if (!memberData) {
        try {
          const { data: memberRecord } = await supabase
            .from('soundcloud_members')
            .select('*')
            .eq('user_id', userId)
            .single();
          
          if (memberRecord) {
            memberData = {
              id: memberRecord.id,
              name: memberRecord.name,
              primary_email: memberRecord.primary_email || userEmail,
              emails: memberRecord.emails || [userEmail],
              status: memberRecord.status || 'active',
              size_tier: memberRecord.size_tier || 'T1',
              monthly_repost_limit: memberRecord.monthly_submission_limit || memberRecord.monthly_repost_limit || 10,
              submissions_this_month: memberRecord.submissions_this_month || 0,
              net_credits: memberRecord.net_credits || 0,
              soundcloud_url: memberRecord.soundcloud_url,
              spotify_url: memberRecord.spotify_url,
              families: memberRecord.families || [],
              soundcloud_followers: memberRecord.soundcloud_followers || memberRecord.followers,
            };
          }
        } catch (e) {
          // Column might not exist, continue to next method
        }
      }

      // Method 3: Email-based lookup
      if (!memberData && userEmail) {
        try {
          const { data: memberRecord } = await supabase
            .from('soundcloud_members')
            .select('*')
            .eq('primary_email', userEmail)
            .single();
          
          if (memberRecord) {
            memberData = {
              id: memberRecord.id,
              name: memberRecord.name,
              primary_email: memberRecord.primary_email || userEmail,
              emails: memberRecord.emails || [userEmail],
              status: memberRecord.status || 'active',
              size_tier: memberRecord.size_tier || 'T1',
              monthly_repost_limit: memberRecord.monthly_submission_limit || memberRecord.monthly_repost_limit || 10,
              submissions_this_month: memberRecord.submissions_this_month || 0,
              net_credits: memberRecord.net_credits || 0,
              soundcloud_url: memberRecord.soundcloud_url,
              spotify_url: memberRecord.spotify_url,
              families: memberRecord.families || [],
              soundcloud_followers: memberRecord.soundcloud_followers || memberRecord.followers,
            };
          }
        } catch (e) {
          // Continue to metadata fallback
        }
      }

      // Method 4: Fall back to metadata (legacy support)
      if (!memberData) {
        const isMemberFlag = authUser.user_metadata?.is_member || false;
        const metaMemberData = authUser.user_metadata?.member_data;

        if (isMemberFlag || metaMemberData) {
          memberData = {
            id: metaMemberData?.member_id || userId,
            name: metaMemberData?.name || authUser.user_metadata?.name || authUser.user_metadata?.full_name || 'Member',
            primary_email: userEmail,
            emails: metaMemberData?.emails || [userEmail],
            status: metaMemberData?.status || 'active',
            size_tier: metaMemberData?.size_tier || 'T1',
            monthly_repost_limit: metaMemberData?.monthly_repost_limit || 10,
            submissions_this_month: metaMemberData?.submissions_this_month || 0,
            net_credits: metaMemberData?.net_credits || 0,
            soundcloud_url: metaMemberData?.soundcloud_url,
            spotify_url: metaMemberData?.spotify_url,
            families: metaMemberData?.families || [],
            soundcloud_followers: metaMemberData?.soundcloud_followers,
          };
        }
      }

      setMember(memberData);
      
      // Add 'member' role if we found member data
      if (memberData && !finalRoles.includes('member')) {
        finalRoles.push('member');
        setUserRoles(finalRoles);
      }

      // Record login and update IP status if member found
      if (memberData) {
        try {
          await supabase.rpc('record_soundcloud_member_login', { p_user_id: userId });
          console.log('📊 IP status updated for member:', memberData.name);
        } catch (e) {
          // Function might not exist yet, that's okay
          console.log('Note: IP status tracking not available yet');
        }
      }
      
      console.log('✅ SoundCloud auth loaded:', userEmail, 'roles:', finalRoles, 'isMember:', !!memberData);
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
