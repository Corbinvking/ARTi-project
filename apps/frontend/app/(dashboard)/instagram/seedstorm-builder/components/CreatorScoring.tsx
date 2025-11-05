import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Users, 
  TrendingUp, 
  Star, 
  Target, 
  Search,
  Filter,
  BarChart3,
  Trophy,
  AlertTriangle,
  Info
} from "lucide-react";
import { Creator } from "../lib/types";
import { useCampaignManagementMetrics, CreatorTierScore } from "../hooks/useCampaignManagementMetrics";

interface CreatorScoringProps {
  creators: Creator[];
  campaigns: any[];
}

export const CreatorScoring = ({ creators, campaigns }: CreatorScoringProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'performance' | 'reliability' | 'efficiency' | 'tier'>('performance');
  const [filterBy, setFilterBy] = useState<'all' | 'high' | 'medium' | 'developing'>('all');
  
  const { creatorTierScores } = useCampaignManagementMetrics(creators, campaigns);

  const filteredAndSortedScores = useMemo(() => {
    let filtered = creatorTierScores;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(score => {
        const creator = creators.find(c => c.id === score.id);
        return creator?.instagram_handle.toLowerCase().includes(searchTerm.toLowerCase());
      });
    }

    // Filter by tier
    if (filterBy !== 'all') {
      filtered = filtered.filter(score => {
        return score.tierLevel === filterBy;
      });
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'performance':
          return b.performanceScore - a.performanceScore;
        case 'reliability':
          return b.reliabilityScore - a.reliabilityScore;
        case 'efficiency':
          return b.costEfficiencyScore - a.costEfficiencyScore;
        case 'tier':
          const tierOrder = { 'high': 3, 'medium': 2, 'developing': 1 };
          return tierOrder[b.tierLevel] - tierOrder[a.tierLevel];
        default:
          return b.performanceScore - a.performanceScore;
      }
    });

    return filtered;
  }, [creatorTierScores, creators, searchTerm, sortBy, filterBy]);

  const getTierColor = (tierLevel: string) => {
    switch (tierLevel) {
      case 'high': return 'text-success';
      case 'medium': return 'text-warning';
      default: return 'text-muted-foreground';
    }
  };

  const getTierBadgeVariant = (tierLevel: string) => {
    switch (tierLevel) {
      case 'high': return 'default';
      case 'medium': return 'secondary';
      default: return 'outline';
    }
  };

  const averagePerformance = useMemo(() => {
    const sum = creatorTierScores.reduce((acc, score) => acc + score.performanceScore, 0);
    return creatorTierScores.length > 0 ? Math.round(sum / creatorTierScores.length) : 0;
  }, [creatorTierScores]);

  const topTierCreators = useMemo(() => {
    return creatorTierScores.filter(score => score.tierLevel === 'high').length;
  }, [creatorTierScores]);

  // Temporarily removed tooltips to fix infinite loop - TODO: Add back with different library
  const InfoTooltip = ({ content }: { content: string }) => (
    <Info className="h-4 w-4 text-muted-foreground" title={content} />
  );

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-border/50 bg-card/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Creators</p>
                <p className="text-2xl font-bold text-foreground">{creators.length}</p>
              </div>
              <Users className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-medium text-muted-foreground">Avg Performance</p>
                    <InfoTooltip content="Average performance score based on engagement rate and view metrics. Higher scores indicate better content performance." />
                  </div>
                  <p className="text-2xl font-bold text-foreground">{averagePerformance}%</p>
                </div>
              </div>
              <BarChart3 className="h-8 w-8 text-accent" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-medium text-muted-foreground">High-Tier Creators</p>
                    <InfoTooltip content="Creators classified as high-tier based on performance (70%+) and reliability (70%+) scores." />
                  </div>
                  <p className="text-2xl font-bold text-success">{topTierCreators}</p>
                </div>
              </div>
              <Trophy className="h-8 w-8 text-success" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Filtered Results</p>
                <p className="text-2xl font-bold text-foreground">{filteredAndSortedScores.length}</p>
              </div>
              <Filter className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card className="border-border/50 bg-card/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 text-primary" />
            Creator Tier Analysis
          </CardTitle>
          <CardDescription>
            Practical creator classification and performance metrics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search creators..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Sort by..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="performance">Performance Score</SelectItem>
                <SelectItem value="reliability">Reliability Score</SelectItem>
                <SelectItem value="efficiency">Cost Efficiency</SelectItem>
                <SelectItem value="tier">Tier Level</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterBy} onValueChange={(value: any) => setFilterBy(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by score..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tiers</SelectItem>
                <SelectItem value="high">High Tier</SelectItem>
                <SelectItem value="medium">Medium Tier</SelectItem>
                <SelectItem value="developing">Developing Tier</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Creator Scores List */}
      <div className="space-y-4 max-h-[800px] overflow-y-auto">
        {filteredAndSortedScores.slice(0, 4).map((score, index) => {
          const creator = creators.find(c => c.id === score.id);
          if (!creator) return null;

          return (
            <Card key={score.id} className="border-border/50 bg-card/50 hover:bg-card/70 transition-colors">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-lg font-bold text-primary">#{index + 1}</span>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-foreground">@{creator.instagram_handle}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant={getTierBadgeVariant(score.tierLevel)} className="capitalize">
                          {score.tierLevel} Tier
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {creator.followers.toLocaleString()} followers
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-2">
                      <Target className="h-4 w-4 text-accent" />
                      <span className="font-medium text-foreground">{score.performanceScore}% Performance</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      ${creator.reel_rate?.toLocaleString() || 0} per post
                    </p>
                  </div>
                </div>

                {/* Score Breakdown */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Performance</span>
                        <InfoTooltip content="Based on engagement rate (weighted 15x) and view score (weighted 0.6x). Measures content performance quality." />
                      </div>
                      <span className="text-sm font-medium text-foreground">
                        {score.performanceScore}%
                      </span>
                    </div>
                    <Progress value={score.performanceScore} className="h-2" />
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Reliability</span>
                        <InfoTooltip content="Based on campaign history, account size stability, and engagement consistency. Indicates creator dependability." />
                      </div>
                      <span className="text-sm font-medium text-foreground">
                        {score.reliabilityScore}%
                      </span>
                    </div>
                    <Progress value={score.reliabilityScore} className="h-2" />
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Cost Efficiency</span>
                        <InfoTooltip content="Cost per thousand views calculation. Lower cost per view = higher efficiency score." />
                      </div>
                      <span className="text-sm font-medium text-foreground">
                        {score.costEfficiencyScore}%
                      </span>
                    </div>
                    <Progress value={score.costEfficiencyScore} className="h-2" />
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Execution Risk</span>
                        <InfoTooltip content="Potential delivery issues based on engagement rate, account size, campaign history, and contact info completeness." />
                      </div>
                      <span className={`text-sm font-medium ${
                        score.executionRiskScore > 30 ? 'text-destructive' : 
                        score.executionRiskScore > 15 ? 'text-warning' : 'text-success'
                      }`}>
                        {score.executionRiskScore > 30 ? 'High' : score.executionRiskScore > 15 ? 'Medium' : 'Low'}
                      </span>
                    </div>
                    <Progress 
                      value={100 - score.executionRiskScore} 
                      className="h-2" 
                    />
                  </div>
                </div>

                {/* Creator Details */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm border-t border-border/50 pt-4">
                  <div>
                    <p className="text-muted-foreground">Engagement Rate</p>
                    <p className="font-medium text-foreground">{creator.engagement_rate?.toFixed(2)}%</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Avg Views</p>
                    <p className="font-medium text-foreground">
                      {creator.median_views_per_video?.toLocaleString() || 0}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Genres</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {creator.music_genres?.slice(0, 3).map((genre, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {genre}
                        </Badge>
                      ))}
                      {creator.music_genres && creator.music_genres.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{creator.music_genres.length - 3}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
        
        {filteredAndSortedScores.length > 4 && (
          <Card className="border-border/50 bg-card/50">
            <CardContent className="p-6 text-center">
              <p className="text-muted-foreground mb-4">
                Showing 4 of {filteredAndSortedScores.length} creators
              </p>
              <Button 
                variant="outline" 
                onClick={() => {
                  // This could navigate to a dedicated creators page or expand the view
                  window.location.href = '/creators';
                }}
              >
                View All Creators
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};