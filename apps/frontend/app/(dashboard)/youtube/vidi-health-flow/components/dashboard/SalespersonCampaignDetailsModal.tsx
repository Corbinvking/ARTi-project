import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Eye, Heart, MessageCircle, Users, CheckCircle, XCircle, ExternalLink, DollarSign } from "lucide-react";
import { format } from "date-fns";
import { supabase } from "../../integrations/supabase/client";
import { getCanonicalYouTubeUrl } from "../../lib/youtube";
import type { Database } from "../../integrations/supabase/types";

type Campaign = Database['public']['Tables']['campaigns']['Row'] & {
  clients?: { id: string; name: string; email: string | null; company: string | null } | null;
  salespersons?: { id: string; name: string; email: string | null; commission_rate?: number | null } | null;
};

interface DailyStats {
  date: string;
  views: number;
  likes: number;
  comments: number;
  total_subscribers: number;
  subscribers_gained: number;
}

interface SalespersonCampaignDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  campaign: Campaign;
}

export const SalespersonCampaignDetailsModal = ({ isOpen, onClose, campaign }: SalespersonCampaignDetailsModalProps) => {
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([]);
  const [loadingStats, setLoadingStats] = useState(false);
  const [ratioFixerStatus, setRatioFixerStatus] = useState<'loading' | 'on' | 'off'>('loading');

  useEffect(() => {
    if (isOpen && campaign) {
      fetchDailyStats();
      checkRatioFixerStatus();
    }
  }, [isOpen, campaign]);

  const fetchDailyStats = async () => {
    if (!campaign) return;
    
    setLoadingStats(true);
    try {
      const { data, error } = await supabase
        .from('campaign_stats_daily')
        .select('date, views, likes, comments, total_subscribers, subscribers_gained')
        .eq('campaign_id', campaign.id)
        .order('date', { ascending: true });

      if (error) throw error;
      setDailyStats(data || []);
    } catch (error) {
      console.error('Error fetching daily stats:', error);
    } finally {
      setLoadingStats(false);
    }
  };

  const checkRatioFixerStatus = async () => {
    try {
      // Check if campaign is in ratio fixer queue
      const { data, error } = await supabase
        .from('ratio_fixer_queue')
        .select('status')
        .eq('campaign_id', campaign.id)
        .eq('status', 'waiting')
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      
      // Campaign is in ratio fixer if it's in queue OR in_fixer flag is true
      setRatioFixerStatus(data || campaign.in_fixer ? 'on' : 'off');
    } catch (error) {
      console.error('Error checking ratio fixer status:', error);
      setRatioFixerStatus(campaign.in_fixer ? 'on' : 'off');
    }
  };

  const calculateCommission = (): { amount: number; rate: number } => {
    const salePrice = campaign.sale_price || 0;
    const commissionRate = campaign.salespersons?.commission_rate || 20; // Default to 20% if not set
    const commissionAmount = (salePrice * commissionRate) / 100;
    
    return {
      amount: commissionAmount,
      rate: commissionRate
    };
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toLocaleString();
  };

  // Get service types from new structure or fallback to legacy
  const serviceTypes = (campaign as any).service_types ? 
    (typeof (campaign as any).service_types === 'string' ? 
      JSON.parse((campaign as any).service_types) : 
      (campaign as any).service_types) : 
    [{
      service_type: campaign.service_type,
      custom_service_type: (campaign as any).custom_service_type,
      goal_views: campaign.goal_views || 0
    }];

  const totalGoalViews = serviceTypes.reduce((sum: number, st: any) => sum + (st.goal_views || 0), 0);
  const viewsProgress = totalGoalViews > 0 ? (campaign.current_views || 0) / totalGoalViews * 100 : 0;
  const commission = calculateCommission();

  // Calculate current metrics for overview cards
  const currentViews = campaign.current_views || 0;
  const currentLikes = campaign.current_likes || 0;
  const currentComments = campaign.current_comments || 0;
  const currentSubscribers = campaign.total_subscribers || 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {campaign.campaign_name}
            {campaign.youtube_url && (
              <a
                href={getCanonicalYouTubeUrl(campaign.youtube_url)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:text-primary/80"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            )}
          </DialogTitle>
          <DialogDescription>
            Campaign performance analytics and commission details
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Commission and Status Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Commission</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-success">
                  {formatCurrency(commission.amount)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {commission.rate}% of {formatCurrency(campaign.sale_price || 0)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Campaign Status</CardTitle>
                <Badge variant="outline">{campaign.status}</Badge>
              </CardHeader>
              <CardContent>
                <div className="text-sm font-medium">
                  Progress: {viewsProgress.toFixed(1)}%
                </div>
                <p className="text-xs text-muted-foreground">
                  {formatNumber(currentViews)} / {formatNumber(totalGoalViews)} views
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Ratio Fixer</CardTitle>
                {ratioFixerStatus === 'loading' ? (
                  <div className="h-4 w-4 animate-spin border-2 border-primary border-t-transparent rounded-full" />
                ) : ratioFixerStatus === 'on' ? (
                  <CheckCircle className="h-4 w-4 text-success" />
                ) : (
                  <XCircle className="h-4 w-4 text-muted-foreground" />
                )}
              </CardHeader>
              <CardContent>
                <div className="text-sm font-medium">
                  {ratioFixerStatus === 'loading' ? 'Checking...' : 
                   ratioFixerStatus === 'on' ? 'Active' : 'Inactive'}
                </div>
                <p className="text-xs text-muted-foreground">
                  {ratioFixerStatus === 'on' ? 
                    'Engagement optimization in progress' : 
                    'Standard engagement tracking'}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Current Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Views</CardTitle>
                <Eye className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatNumber(currentViews)}</div>
                <p className="text-xs text-muted-foreground">
                  +{formatNumber(campaign.views_7_days || 0)} this week
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Likes</CardTitle>
                <Heart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatNumber(currentLikes)}</div>
                <p className="text-xs text-muted-foreground">
                  +{formatNumber(campaign.likes_7_days || 0)} this week
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Comments</CardTitle>
                <MessageCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatNumber(currentComments)}</div>
                <p className="text-xs text-muted-foreground">
                  +{formatNumber(campaign.comments_7_days || 0)} this week
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Subscribers</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatNumber(currentSubscribers)}</div>
                <p className="text-xs text-muted-foreground">Total gained</p>
              </CardContent>
            </Card>
          </div>

          {/* Performance Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Performance Over Time</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingStats ? (
                <div className="h-80 flex items-center justify-center">
                  <div className="text-muted-foreground">Loading performance data...</div>
                </div>
              ) : dailyStats.length > 0 ? (
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={dailyStats}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(value) => format(new Date(value), 'MMM dd')}
                    />
                    <YAxis />
                    <Tooltip 
                      labelFormatter={(value) => format(new Date(value), 'MMM dd, yyyy')}
                      formatter={(value: number, name: string) => [
                        formatNumber(value),
                        name.charAt(0).toUpperCase() + name.slice(1)
                      ]}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="views" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={2}
                      name="views"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="likes" 
                      stroke="hsl(var(--success))" 
                      strokeWidth={2}
                      name="likes"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="comments" 
                      stroke="hsl(var(--warning))" 
                      strokeWidth={2}
                      name="comments"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="total_subscribers" 
                      stroke="hsl(var(--info))" 
                      strokeWidth={2}
                      name="subscribers"
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-80 flex items-center justify-center">
                  <div className="text-center text-muted-foreground">
                    <div className="text-lg font-medium mb-2">Performance trends will appear soon</div>
                    <div className="text-sm">Data is collected automatically 3 times daily to build historical trends</div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Campaign Details */}
          <Card>
            <CardHeader>
              <CardTitle>Campaign Details</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm font-medium text-muted-foreground">Client</div>
                <div className="font-medium">{campaign.clients?.name || 'No client assigned'}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground">Genre</div>
                <div className="font-medium">{campaign.genre || 'Not specified'}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground">Start Date</div>
                <div className="font-medium">
                  {campaign.start_date ? format(new Date(campaign.start_date), 'MMM dd, yyyy') : 'Not set'}
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground">Sale Price</div>
                <div className="font-medium">{formatCurrency(campaign.sale_price || 0)}</div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};