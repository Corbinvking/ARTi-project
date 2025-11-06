"use client"

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import { useRouter } from 'next/navigation';
import { useCampaigns } from "../hooks/useCampaigns";
import { useAuth } from "../contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { 
  ArrowLeft, 
  ExternalLink, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  Eye,
  ThumbsUp,
  MessageCircle,
  Users,
  Calendar,
  DollarSign,
  Target,
  Play,
  Edit
} from 'lucide-react';
import { format } from 'date-fns';
import { SERVICE_TYPES } from "../lib/constants";
import { YouTubePlayerDialog } from "../components/youtube/YouTubePlayerDialog";

import type { Database } from "../integrations/supabase/types";
type Campaign = Database['public']['Tables']['campaigns']['Row'] & {
  clients?: { id: string; name: string; email: string | null; company: string | null } | null;
  salespersons?: { id: string; name: string; email: string | null } | null;
};

const CampaignDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useRouter();
  const { profile } = useAuth();
  const { campaigns, loading, updateCampaign } = useCampaigns();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [youtubeDialogOpen, setYoutubeDialogOpen] = useState(false);
  const [editData, setEditData] = useState<Partial<Campaign>>({});

  const campaign = campaigns.find(c => c.id === id);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-muted-foreground">Loading campaign...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-destructive">Campaign Not Found</h1>
          <p className="text-muted-foreground mt-2">The campaign you're looking for doesn't exist or you don't have access to it.</p>
          <Button 
            variant="outline" 
            className="mt-4"
            onClick={() => router.push('/youtube/')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  // Get service types from new structure or fallback to legacy
  const serviceTypes = campaign.service_types ? 
    (typeof campaign.service_types === 'string' ? 
      JSON.parse(campaign.service_types) : 
      campaign.service_types) : 
    [{
      service_type: campaign.service_type,
      custom_service_type: campaign.custom_service_type,
      goal_views: campaign.goal_views || 0
    }];

  const totalGoalViews = serviceTypes.reduce((sum: number, st: any) => sum + (st.goal_views || 0), 0);
  const viewsProgress = totalGoalViews > 0 ? (campaign.current_views || 0) / totalGoalViews * 100 : 0;

  const calculateHealthScore = (): number => {
    let score = 50;
    score += viewsProgress * 0.3;
    if (campaign.status === 'active') score += 10;
    if (!campaign.views_stalled) score += 10;
    if (!campaign.in_fixer) score += 5;
    return Math.min(100, Math.max(0, Math.round(score)));
  };

  const healthScore = calculateHealthScore();
  const getHealthColor = (score: number) => {
    if (score >= 90) return "text-health-excellent";
    if (score >= 75) return "text-health-good";
    if (score >= 60) return "text-health-moderate";
    if (score >= 40) return "text-health-poor";
    return "text-health-critical";
  };

  const handleSave = async () => {
    try {
      await updateCampaign(campaign.id, editData);
      setIsEditing(false);
      setEditData({});
      toast({
        title: "Campaign updated",
        description: "Campaign details have been successfully updated.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update campaign. Please try again.",
        variant: "destructive",
      });
    }
  };

  const canEdit = profile?.role === 'admin' || profile?.role === 'manager';

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => router.push('/youtube/')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-3xl font-bold">{campaign.campaign_name}</h1>
          <Badge 
            variant={campaign.status === 'active' ? 'default' : 'secondary'}
          >
            {campaign.status}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          {campaign.youtube_url && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setYoutubeDialogOpen(true)}
            >
              <Play className="h-4 w-4 mr-2" />
              Watch Video
            </Button>
          )}
          {canEdit && (
            <Button
              variant={isEditing ? "default" : "outline"}
              size="sm"
              onClick={() => {
                if (isEditing) {
                  handleSave();
                } else {
                  setIsEditing(true);
                  setEditData({});
                }
              }}
            >
              <Edit className="h-4 w-4 mr-2" />
              {isEditing ? 'Save Changes' : 'Edit Campaign'}
            </Button>
          )}
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Health Score</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getHealthColor(healthScore)}`}>
              {healthScore}%
            </div>
            <Progress value={healthScore} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Views</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(campaign.current_views || 0).toLocaleString()}</div>
            <div className="text-xs text-muted-foreground">
              of {totalGoalViews.toLocaleString()} goal
            </div>
            <Progress value={viewsProgress} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Engagement</CardTitle>
            <MessageCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {((campaign.current_likes || 0) + (campaign.current_comments || 0)).toLocaleString()}
            </div>
            <div className="text-xs text-muted-foreground">
              👍 {(campaign.current_likes || 0).toLocaleString()} • 💬 {(campaign.current_comments || 0).toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${(campaign.sale_price || 0).toLocaleString()}
            </div>
            <div className="text-xs text-muted-foreground">
              Sale price
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Campaign Details Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="technical">Technical Setup</TabsTrigger>
          {canEdit && <TabsTrigger value="edit">Edit Details</TabsTrigger>}
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Campaign Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">Client</Label>
                  <p className="text-sm">{campaign.clients?.name || 'No client assigned'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Salesperson</Label>
                  <p className="text-sm">{campaign.salespersons?.name || 'No salesperson assigned'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Service Types</Label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {serviceTypes.map((st: any, index: number) => (
                      <Badge key={index} variant="outline">
                        {SERVICE_TYPES.find(type => type.value === st.service_type)?.label || st.custom_service_type || st.service_type}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium">Genre</Label>
                  <p className="text-sm">{campaign.genre || 'Not specified'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Start Date</Label>
                  <p className="text-sm">
                    {campaign.start_date ? format(new Date(campaign.start_date), 'PPP') : 'Not set'}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>YouTube Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">Video URL</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-sm flex-1 truncate">{campaign.youtube_url}</p>
                    {campaign.youtube_url && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(campaign.youtube_url, '_blank')}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium">Video ID</Label>
                  <p className="text-sm font-mono">{campaign.video_id || 'Not extracted'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">YouTube API</Label>
                  <Badge variant={campaign.youtube_api_enabled ? 'default' : 'secondary'}>
                    {campaign.youtube_api_enabled ? 'Enabled' : 'Disabled'}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Performance Metrics</CardTitle>
              <CardDescription>View detailed performance analytics for this campaign</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Detailed performance analytics coming soon</p>
                <p className="text-sm">This will include charts, trends, and detailed metrics</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="technical" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Technical Configuration</CardTitle>
              <CardDescription>Server and technical setup details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label className="text-sm font-medium">Setup Complete</Label>
                  <Badge variant={campaign.technical_setup_complete ? 'default' : 'destructive'}>
                    {campaign.technical_setup_complete ? 'Complete' : 'Incomplete'}
                  </Badge>
                </div>
                <div>
                  <Label className="text-sm font-medium">Artist Tier</Label>
                  <p className="text-sm">{campaign.artist_tier || 'Not set'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Like Server</Label>
                  <p className="text-sm">{campaign.like_server || 'Not specified'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Comment Server</Label>
                  <p className="text-sm">{campaign.comment_server || 'Not specified'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {canEdit && (
          <TabsContent value="edit" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Edit Campaign Details</CardTitle>
                <CardDescription>Update campaign information and settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center py-8 text-muted-foreground">
                  <Edit className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Campaign editing interface coming soon</p>
                  <p className="text-sm">This will include form fields for updating campaign details</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      {campaign.youtube_url && (
        <YouTubePlayerDialog
          isOpen={youtubeDialogOpen}
          onClose={() => setYoutubeDialogOpen(false)}
          youtubeUrl={campaign.youtube_url}
          title={campaign.campaign_name}
        />
      )}
    </div>
  );
};

export default CampaignDetail;