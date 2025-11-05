'use client'

import { useMemo } from 'react';


import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Lightbulb, TrendingUp, AlertTriangle, DollarSign, Users, Target, Sparkles } from "lucide-react";
import { Creator, Campaign } from "../lib/types";
import { usePredictiveIntelligence } from "../hooks/usePredictiveIntelligence";

interface SmartRecommendationsProps {
  creators: Creator[];
  campaigns: Campaign[];
  currentCampaign?: Campaign;
  currentCreator?: Creator;
}

interface Recommendation {
  type: 'budget' | 'creator' | 'performance' | 'optimization';
  title: string;
  description: string;
  action?: string;
  actionHandler?: () => void;
  priority: 'high' | 'medium' | 'low';
  icon: React.ReactNode;
  data?: any;
}

export const SmartRecommendations = ({ 
  creators, 
  campaigns, 
  currentCampaign, 
  currentCreator 
}: SmartRecommendationsProps) => {
  const router = useRouter();
  const { creatorScores, predictCampaignSuccess, assessRisk } = usePredictiveIntelligence(creators, campaigns);
  
  const recommendations = useMemo(() => {
    const recs: Recommendation[] = [];

    // Budget optimization recommendations
    if (currentCampaign) {
      const remainingBudgetRaw = (currentCampaign as any).totals?.budget_remaining ?? (currentCampaign as any).budget ?? 0;
      const totalBudgetRaw = (currentCampaign as any).form_data?.total_budget ?? (currentCampaign as any).budget ?? 0;
      const remainingBudget = Number(remainingBudgetRaw) || 0;
      const totalBudget = Number(totalBudgetRaw) || 0;
      const utilizationRate = totalBudget > 0 ? ((totalBudget - remainingBudget) / totalBudget) * 100 : 0;

      if (utilizationRate < 70 && remainingBudget > 500) {
        const currentSelected = Array.isArray((currentCampaign as any).selected_creators) ? (currentCampaign as any).selected_creators : [];
        const currentGenres = (currentCampaign as any).form_data?.selected_genres || (currentCampaign as any).music_genres || [];
        const suggestedCreators = creators
          .filter(c => 
            !currentSelected.some((sc: any) => ((typeof sc === 'object' && sc !== null) ? sc.id : sc) === c.id) &&
            Array.isArray(c.music_genres) && c.music_genres.some((genre: string) => currentGenres.includes(genre)) &&
            c.reel_rate > 0 && c.reel_rate <= remainingBudget
          )
          .sort((a, b) => (b.engagement_rate * b.followers) - (a.engagement_rate * a.followers))
          .slice(0, 3);

        if (suggestedCreators.length > 0) {
          recs.push({
            type: 'budget',
            title: 'Optimize Budget Utilization',
            description: `You have $${remainingBudget.toLocaleString()} remaining. Add ${suggestedCreators.length} high-performing creators to maximize reach.`,
            action: 'View Suggestions',
            priority: 'high',
            icon: <DollarSign className="h-4 w-4 text-success" />,
            data: { suggestedCreators, remainingBudget }
          });
        }
      }
    }

    // Similar creators recommendation
    if (currentCreator) {
      const similarCreators = creators
        .filter(c => 
          c.id !== currentCreator.id &&
          c.music_genres.some(genre => currentCreator.music_genres.includes(genre)) &&
          Math.abs(c.engagement_rate - currentCreator.engagement_rate) < 2 &&
          Math.abs(Math.log10(c.followers) - Math.log10(currentCreator.followers)) < 0.5
        )
        .sort((a, b) => {
          const aScore = a.engagement_rate * Math.log10(a.followers);
          const bScore = b.engagement_rate * Math.log10(b.followers);
          return bScore - aScore;
        })
        .slice(0, 4);

      if (similarCreators.length > 0) {
        recs.push({
          type: 'creator',
          title: 'Similar High-Performing Creators',
          description: `Found ${similarCreators.length} creators with similar engagement and genre focus.`,
          action: 'View Similar',
          priority: 'medium',
          icon: <Users className="h-4 w-4 text-primary" />,
          data: { similarCreators }
        });
      }
    }

    // Underutilized creators alert
    const underutilizedCreators = creators.filter(creator => {
      const recentCampaigns = campaigns.filter((c: any) => {
        const selected = Array.isArray(c.selected_creators) ? c.selected_creators : [];
        const used = selected.some((sc: any) => ((typeof sc === 'object' && sc !== null) ? sc.id : sc) === creator.id);
        const createdVal = (c as any).date_created || (c as any).created_at;
        const createdDate = createdVal ? new Date(createdVal) : null;
        const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
        return used && !!createdDate && createdDate > sixtyDaysAgo;
      });
      return recentCampaigns.length === 0 && creator.engagement_rate >= 5; // 5%+ engagement
    });

    if (underutilizedCreators.length > 0) {
      recs.push({
        type: 'performance',
        title: 'Underutilized High Performers',
        description: `${underutilizedCreators.length} high-performing creators haven't been used in 60+ days.`,
        action: 'Review Creators',
        actionHandler: () => router.push('/instagram/creators?filter=underutilized&minEngagement=5'),
        priority: 'medium',
        icon: <AlertTriangle className="h-4 w-4 text-warning" />,
        data: { underutilizedCreators }
      });
    }

    // Genre-based recommendations
    const genreAnalysis = creators.reduce((acc, creator) => {
      creator.music_genres.forEach(genre => {
        if (!acc[genre]) {
          acc[genre] = { count: 0, totalEngagement: 0, avgFollowers: 0 };
        }
        acc[genre].count++;
        acc[genre].totalEngagement += creator.engagement_rate;
        acc[genre].avgFollowers += creator.followers;
      });
      return acc;
    }, {} as Record<string, { count: number; totalEngagement: number; avgFollowers: number }>);

    const topGenres = Object.entries(genreAnalysis)
      .map(([genre, data]) => ({
        genre,
        avgEngagement: data.totalEngagement / data.count,
        avgFollowers: data.avgFollowers / data.count,
        count: data.count
      }))
      .sort((a, b) => b.avgEngagement - a.avgEngagement)
      .slice(0, 3);

    if (topGenres.length > 0 && currentCampaign) {
      const currentGenres = (currentCampaign as any).form_data?.selected_genres || (currentCampaign as any).music_genres || [];
      const suggestedGenre = topGenres.find(g => !currentGenres.includes(g.genre));
      
      if (suggestedGenre) {
        recs.push({
          type: 'optimization',
          title: 'High-Performance Genre Opportunity',
          description: `${suggestedGenre.genre} creators have ${suggestedGenre.avgEngagement.toFixed(2)}% avg engagement with ${suggestedGenre.count} available creators.`,
          action: 'Explore Genre',
          priority: 'low',
          icon: <TrendingUp className="h-4 w-4 text-accent" />,
          data: { suggestedGenre }
        });
      }
    }

    // AI-powered predictive recommendations
    if (currentCampaign && creatorScores.length > 0) {
      const prediction = predictCampaignSuccess(currentCampaign);
      const risk = assessRisk(currentCampaign);
      
      if (prediction.successProbability < 70) {
        recs.push({
          type: 'optimization',
          title: 'Campaign Success Risk Detected',
          description: `Current success probability is ${prediction.successProbability}%. Consider optimizing creator selection or budget allocation.`,
          action: 'View Analysis',
          priority: 'high',
          icon: <Sparkles className="h-4 w-4 text-primary" />,
          data: { prediction, risk }
        });
      }

      if (risk.level === 'high') {
        recs.push({
          type: 'optimization',
          title: 'High Risk Campaign',
          description: `Risk score: ${risk.score}/100. Review risk factors and adjust strategy.`,
          action: 'Review Risks',
          priority: 'high',
          icon: <AlertTriangle className="h-4 w-4 text-destructive" />,
          data: { risk }
        });
      }
    }

    return recs.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }, [creators, campaigns, currentCampaign, currentCreator, router, creatorScores, predictCampaignSuccess, assessRisk]);

  if (recommendations.length === 0) return null;

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Lightbulb className="h-4 w-4 text-primary" />
          Smart Recommendations
        </CardTitle>
        <CardDescription className="text-sm">
          AI-powered insights to optimize your campaigns
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {recommendations.slice(0, 3).map((rec, index) => (
          <div key={index} className="flex items-start gap-2 p-2 rounded-lg bg-muted/20 border border-border/20">
            <div className="flex-shrink-0 mt-0.5">
              {rec.icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-medium text-foreground text-sm">{rec.title}</h4>
                <Badge 
                  variant={rec.priority === 'high' ? 'destructive' : rec.priority === 'medium' ? 'default' : 'secondary'}
                  className="text-xs py-0 px-1"
                >
                  {rec.priority}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mb-2">{rec.description}</p>
              {rec.action && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={rec.actionHandler}
                  className="text-xs h-6 px-2"
                >
                  {rec.action}
                </Button>
              )}
            </div>
          </div>
        ))}
        {recommendations.length > 3 && (
          <div className="text-center pt-2">
            <p className="text-xs text-muted-foreground">
              {recommendations.length - 3} more recommendations available
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};