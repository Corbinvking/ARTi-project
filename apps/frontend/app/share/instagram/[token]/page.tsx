'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Instagram, Calendar, FileText, CheckCircle } from "lucide-react";
import { createClient } from '@supabase/supabase-js';

// Create a public Supabase client for unauthenticated access
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const publicSupabase = createClient(supabaseUrl, supabaseAnonKey);

interface CampaignPost {
  id: string;
  post_url: string;
  post_type: string;
  instagram_handle: string;
  status: string;
  posted_at?: string;
  created_at: string;
}

interface Campaign {
  id: string;
  campaign?: string;
  name?: string;
  client_notes?: string;
  status?: string;
  public_access_enabled?: boolean;
  public_token?: string;
  posting_window_start?: string;
  posting_window_end?: string;
  created_at: string;
}

export default function InstagramClientPortalPage() {
  const params = useParams();
  const token = params.token as string;
  
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [posts, setPosts] = useState<CampaignPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);
      
      try {
        // First try to fetch by public_token
        let { data: campaignData, error: campaignError } = await publicSupabase
          .from('instagram_campaigns')
          .select('id, campaign, name, client_notes, status, public_access_enabled, public_token, posting_window_start, posting_window_end, created_at')
          .eq('public_token', token)
          .eq('public_access_enabled', true)
          .single();

        // If not found by token, try by ID (for backwards compatibility)
        if (campaignError || !campaignData) {
          const { data: byIdData, error: byIdError } = await publicSupabase
            .from('instagram_campaigns')
            .select('id, campaign, name, client_notes, status, public_access_enabled, public_token, posting_window_start, posting_window_end, created_at')
            .eq('id', token)
            .single();
          
          if (byIdError || !byIdData) {
            setError('Campaign not found or access denied');
            setLoading(false);
            return;
          }
          
          campaignData = byIdData;
        }

        setCampaign(campaignData);

        // Fetch campaign posts (only live ones)
        const { data: postsData, error: postsError } = await publicSupabase
          .from('campaign_posts')
          .select('id, post_url, post_type, instagram_handle, status, posted_at, created_at')
          .eq('campaign_id', campaignData.id)
          .eq('status', 'live')
          .order('created_at', { ascending: false });

        if (!postsError && postsData) {
          setPosts(postsData);
        }
      } catch (err) {
        setError('Failed to load campaign data');
      } finally {
        setLoading(false);
      }
    }

    if (token) {
      fetchData();
    }
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <Instagram className="h-12 w-12 text-pink-500 animate-pulse mx-auto mb-4" />
          <p className="text-muted-foreground">Loading campaign...</p>
        </div>
      </div>
    );
  }

  if (error || !campaign) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-purple-50 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <Instagram className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Campaign Not Found</h2>
            <p className="text-muted-foreground">
              {error || 'This campaign link may have expired or the campaign is not publicly accessible.'}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const campaignName = campaign.campaign || campaign.name || 'Instagram Campaign';

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-purple-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container max-w-4xl mx-auto py-4 px-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center">
              <Instagram className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-800">{campaignName}</h1>
              <p className="text-sm text-muted-foreground">Instagram Seeding Campaign</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container max-w-4xl mx-auto py-8 px-4 space-y-6">
        {/* Campaign Status */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span className="font-medium">Campaign Status</span>
              </div>
              <Badge 
                className={
                  campaign.status === 'complete' ? 'bg-green-500' :
                  campaign.status === 'active' ? 'bg-blue-500' :
                  'bg-yellow-500'
                }
              >
                {(campaign.status || 'Active').charAt(0).toUpperCase() + (campaign.status || 'active').slice(1)}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Client Notes */}
        {campaign.client_notes && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5 text-purple-500" />
                Campaign Notes
              </CardTitle>
              <CardDescription>
                Important information about your campaign
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm max-w-none">
                <p className="text-gray-700 whitespace-pre-wrap">{campaign.client_notes}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Posting Window */}
        {(campaign.posting_window_start || campaign.posting_window_end) && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="h-5 w-5 text-blue-500" />
                Posting Window
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 text-sm">
                {campaign.posting_window_start && (
                  <div>
                    <span className="text-muted-foreground">Start: </span>
                    <span className="font-medium">{new Date(campaign.posting_window_start).toLocaleDateString()}</span>
                  </div>
                )}
                {campaign.posting_window_end && (
                  <div>
                    <span className="text-muted-foreground">End: </span>
                    <span className="font-medium">{new Date(campaign.posting_window_end).toLocaleDateString()}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Posts Grid */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Instagram className="h-5 w-5 text-pink-500" />
              Campaign Posts ({posts.length})
            </CardTitle>
            <CardDescription>
              Live posts from this campaign
            </CardDescription>
          </CardHeader>
          <CardContent>
            {posts.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Instagram className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p>No posts have been published yet.</p>
                <p className="text-sm mt-1">Check back soon for updates!</p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {posts.map((post) => (
                  <a
                    key={post.id}
                    href={post.post_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group block p-4 rounded-lg border hover:border-pink-300 hover:bg-pink-50/50 transition-all"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline" className="shrink-0">
                            {post.post_type || 'post'}
                          </Badge>
                          {post.instagram_handle && post.instagram_handle !== 'pending' && (
                            <span className="text-sm font-medium text-gray-700">
                              @{post.instagram_handle}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground truncate">
                          {post.post_url}
                        </p>
                        {post.posted_at && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Posted {new Date(post.posted_at).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                      <ExternalLink className="h-4 w-4 text-gray-400 group-hover:text-pink-500 transition-colors shrink-0" />
                    </div>
                  </a>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center py-8 text-sm text-muted-foreground">
          <p>Powered by Artist Influence</p>
        </div>
      </main>
    </div>
  );
}
