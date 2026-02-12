import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  FileText, 
  Users, 
  Calendar, 
  CheckCircle, 
  Award,
  ArrowRight,
  TrendingUp
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../integrations/supabase/client";

interface PipelineStage {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  count: number;
  percentage: number;
  color: string;
}

export const ProgressTrackingPipeline = () => {
  // Fetch campaign creators data (separate queries - no JOIN)
  const { data: campaignCreators = [], isLoading } = useQuery({
    queryKey: ['pipeline-progress'],
    queryFn: async () => {
      // First get active campaign IDs from instagram_campaigns
      const { data: campaigns, error: campaignsError } = await supabase
        .from('instagram_campaigns')
        .select('id')
        .eq('status', 'active');

      if (campaignsError) throw campaignsError;
      const activeCampaignIds = (campaigns || []).map(c => String(c.id));

      if (activeCampaignIds.length === 0) return [];

      const { data, error } = await supabase
        .from('instagram_campaign_creators')
        .select(`
          id,
          payment_status,
          post_status,
          approval_status
        `)
        .in('campaign_id', activeCampaignIds);

      if (error) throw error;
      return data || [];
    }
  });

  // Calculate pipeline stages
  const pipelineStages = useMemo((): PipelineStage[] => {
    const total = campaignCreators.length;
    
    if (total === 0) {
      return [
        {
          id: 'draft',
          title: 'Draft & Planning',
          description: 'Campaign setup and creator selection',
          icon: <FileText className="h-4 w-4" />,
          count: 0,
          percentage: 0,
          color: 'text-muted-foreground'
        },
        {
          id: 'outreach',
          title: 'Creator Outreach',
          description: 'Contacting and confirming creators',
          icon: <Users className="h-4 w-4" />,
          count: 0,
          percentage: 0,
          color: 'text-primary'
        },
        {
          id: 'scheduled',
          title: 'Content Scheduled',
          description: 'Posts planned and scheduled',
          icon: <Calendar className="h-4 w-4" />,
          count: 0,
          percentage: 0,
          color: 'text-warning'
        },
        {
          id: 'posted',
          title: 'Content Posted',
          description: 'Content live on platforms',
          icon: <CheckCircle className="h-4 w-4" />,
          count: 0,
          percentage: 0,
          color: 'text-accent'
        },
        {
          id: 'completed',
          title: 'Campaign Complete',
          description: 'Approved and payments processed',
          icon: <Award className="h-4 w-4" />,
          count: 0,
          percentage: 0,
          color: 'text-success'
        }
      ];
    }

    // Count items in each stage
    const draftCount = campaignCreators.filter(c => 
      c.post_status === 'not_posted' && c.payment_status === 'unpaid'
    ).length;
    
    const outreachCount = campaignCreators.filter(c => 
      c.post_status === 'not_posted' && c.approval_status === 'pending'
    ).length;
    
    const scheduledCount = campaignCreators.filter(c => 
      c.post_status === 'scheduled'
    ).length;
    
    const postedCount = campaignCreators.filter(c => 
      c.post_status === 'posted' && c.approval_status !== 'approved'
    ).length;
    
    const completedCount = campaignCreators.filter(c => 
      c.post_status === 'posted' && 
      c.approval_status === 'approved' && 
      c.payment_status === 'paid'
    ).length;

    return [
      {
        id: 'draft',
        title: 'Draft & Planning',
        description: 'Campaign setup and creator selection',
        icon: <FileText className="h-4 w-4" />,
        count: draftCount,
        percentage: (draftCount / total) * 100,
        color: 'text-muted-foreground'
      },
      {
        id: 'outreach',
        title: 'Creator Outreach',
        description: 'Contacting and confirming creators',
        icon: <Users className="h-4 w-4" />,
        count: outreachCount,
        percentage: (outreachCount / total) * 100,
        color: 'text-primary'
      },
      {
        id: 'scheduled',
        title: 'Content Scheduled',
        description: 'Posts planned and scheduled',
        icon: <Calendar className="h-4 w-4" />,
        count: scheduledCount,
        percentage: (scheduledCount / total) * 100,
        color: 'text-warning'
      },
      {
        id: 'posted',
        title: 'Content Posted',
        description: 'Content live on platforms',
        icon: <CheckCircle className="h-4 w-4" />,
        count: postedCount,
        percentage: (postedCount / total) * 100,
        color: 'text-accent'
      },
      {
        id: 'completed',
        title: 'Campaign Complete',
        description: 'Approved and payments processed',
        icon: <Award className="h-4 w-4" />,
        count: completedCount,
        percentage: (completedCount / total) * 100,
        color: 'text-success'
      }
    ];
  }, [campaignCreators]);

  // Calculate overall progress
  const overallProgress = useMemo(() => {
    const total = campaignCreators.length;
    if (total === 0) return 0;
    
    const completed = campaignCreators.filter(c => 
      c.post_status === 'posted' && 
      c.approval_status === 'approved' && 
      c.payment_status === 'paid'
    ).length;
    
    return (completed / total) * 100;
  }, [campaignCreators]);

  if (isLoading) {
    return (
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Campaign Progress Pipeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-full"></div>
            <div className="grid grid-cols-5 gap-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-24 bg-muted rounded"></div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          Campaign Progress Pipeline
          <Badge variant="outline" className="ml-auto">
            {campaignCreators.length} active items
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Overall Progress */}
        <div className="mb-6 p-4 bg-muted/30 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-foreground">Overall Campaign Progress</span>
            <span className="text-sm text-muted-foreground">
              {overallProgress.toFixed(1)}% Complete
            </span>
          </div>
          <Progress value={overallProgress} className="h-3" />
        </div>

        {/* Pipeline Stages */}
        <div className="space-y-4">
          {pipelineStages.map((stage, index) => (
            <div key={stage.id} className="relative">
              {/* Connector Line */}
              {index < pipelineStages.length - 1 && (
                <div className="absolute left-8 top-12 w-0.5 h-8 bg-border/50 z-0"></div>
              )}
              
              {/* Stage Card */}
              <div className="flex items-center gap-4 p-4 bg-muted/20 rounded-lg border border-border/30 hover:bg-muted/30 transition-colors relative z-10">
                <div className={`${stage.color} bg-background border-2 border-border rounded-full p-2`}>
                  {stage.icon}
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="font-medium text-foreground">{stage.title}</h4>
                    <div className="flex items-center gap-2">
                      <Badge variant={stage.count > 0 ? 'default' : 'outline'}>
                        {stage.count} items
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {stage.percentage.toFixed(0)}%
                      </span>
                    </div>
                  </div>
                  
                  <p className="text-sm text-muted-foreground mb-2">
                    {stage.description}
                  </p>
                  
                  <Progress value={stage.percentage} className="h-2" />
                </div>
                
                {index < pipelineStages.length - 1 && (
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Pipeline Statistics */}
        <div className="mt-6 pt-4 border-t border-border/30">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-lg font-semibold text-primary">
                {campaignCreators.length}
              </div>
              <div className="text-xs text-muted-foreground">Total Active</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-success">
                {pipelineStages[4].count}
              </div>
              <div className="text-xs text-muted-foreground">Completed</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-warning">
                {pipelineStages[2].count + pipelineStages[3].count}
              </div>
              <div className="text-xs text-muted-foreground">In Progress</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-accent">
                {overallProgress.toFixed(0)}%
              </div>
              <div className="text-xs text-muted-foreground">Success Rate</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};