import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Loader2, AlertTriangle, TrendingUp, Calendar, Users } from 'lucide-react';
import { usePublicCampaign } from '../hooks/usePublicCampaign';
import { usePublicCampaignPosts } from '../hooks/usePublicCampaignPosts';
import PublicLayout from '../components/PublicLayout';
import CampaignOverview from '../components/CampaignOverview';
import PerformanceMetrics from '../components/PerformanceMetrics';
import PostPreviewCard from '../components/PostPreviewCard';
import EngagementChart from '../components/EngagementChart';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatNumber } from '../lib/localStorage';

const ClientDashboard = () => {
  const { campaignToken } = useParams<{ campaignToken: string }>();
  const { campaign, loading, error } = usePublicCampaign(campaignToken);
  const { posts, chartData, loading: postsLoading } = usePublicCampaignPosts(campaignToken);
  const [timeRange, setTimeRange] = useState('30d');

  if (loading) {
    return (
      <PublicLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Loading campaign dashboard...</p>
          </div>
        </div>
      </PublicLayout>
    );
  }

  if (error || !campaign) {
    return (
      <PublicLayout>
        <div className="max-w-2xl mx-auto mt-12">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {error || 'Campaign not found or access denied. Please check your link and try again.'}
            </AlertDescription>
          </Alert>
        </div>
      </PublicLayout>
    );
  }

  // Calculate total metrics from posts
  const totalMetrics = posts.reduce((acc, post) => {
    if (post.latest_analytics) {
      acc.views += post.latest_analytics.views;
      acc.likes += post.latest_analytics.likes;
      acc.comments += post.latest_analytics.comments;
      acc.shares += post.latest_analytics.shares;
      acc.totalPosts += 1;
    }
    return acc;
  }, { views: 0, likes: 0, comments: 0, shares: 0, totalPosts: 0 });

  const avgEngagement = totalMetrics.totalPosts > 0 
    ? posts.reduce((sum, post) => sum + (post.latest_analytics?.engagement_rate || 0), 0) / totalMetrics.totalPosts
    : 0;

  return (
    <PublicLayout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">
                {campaign.name}
              </h1>
              <p className="text-muted-foreground">
                Real-time campaign performance dashboard
              </p>
            </div>
            <Badge variant="secondary" className="bg-success/10 text-success border-success/20">
              <div className="w-2 h-2 bg-success rounded-full mr-2 animate-pulse"></div>
              Live Dashboard
            </Badge>
          </div>
        </div>

        {/* Key Metrics Grid */}
        {campaign.client_notes && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Client Notes</CardTitle>
              <CardDescription>Updates from your ops team</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-wrap">{campaign.client_notes}</p>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Views</p>
                  <p className="text-2xl font-bold text-primary">
                    {formatNumber(totalMetrics.views)}
                  </p>
                </div>
                <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Live Posts</p>
                  <p className="text-2xl font-bold text-success">
                    {posts.length}
                  </p>
                </div>
                <div className="w-8 h-8 bg-success/10 rounded-lg flex items-center justify-center">
                  <Calendar className="w-4 h-4 text-success" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Engagement</p>
                  <p className="text-2xl font-bold text-accent">
                    {formatNumber(totalMetrics.likes + totalMetrics.comments + totalMetrics.shares)}
                  </p>
                </div>
                <div className="w-8 h-8 bg-accent/10 rounded-lg flex items-center justify-center">
                  <Users className="w-4 h-4 text-accent" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Avg Engagement Rate</p>
                  <p className="text-2xl font-bold text-warning">
                    {avgEngagement.toFixed(1)}%
                  </p>
                </div>
                <div className="w-8 h-8 bg-warning/10 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-warning" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Posts Content */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="w-3 h-3 bg-success rounded-full animate-pulse"></div>
              Live Posts ({posts.length})
            </CardTitle>
            <CardDescription>
              Real-time posts from campaign creators with engagement metrics
            </CardDescription>
          </CardHeader>
          <CardContent>
            {postsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-2 text-muted-foreground">Loading posts...</span>
              </div>
            ) : posts.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {posts.map((post) => (
                  <PostPreviewCard 
                    key={post.id} 
                    post={{
                      ...post,
                      analytics: post.latest_analytics
                    }} 
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-muted/50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Calendar className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">No Live Posts Yet</h3>
                <p className="text-muted-foreground">
                  Posts will appear here once creators start publishing content for this campaign.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PublicLayout>
  );
};

export default ClientDashboard;