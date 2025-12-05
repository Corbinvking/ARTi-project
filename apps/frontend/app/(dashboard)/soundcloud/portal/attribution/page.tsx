"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useMyMember, useMySubmissions } from "../../soundcloud-app/hooks/useMyMember";
import { 
  Target,
  TrendingUp,
  Users,
  Music,
  Share2,
  BarChart3,
  Award
} from "lucide-react";

export default function AttributionPage() {
  const { data: member, isLoading: memberLoading } = useMyMember();
  const { data: submissions, isLoading: submissionsLoading } = useMySubmissions();

  const isLoading = memberLoading || submissionsLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!member) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">Member data not found</p>
      </div>
    );
  }

  // Calculate attribution stats
  const approvedSubmissions = submissions?.filter(s => s.status === 'approved') || [];
  const totalReach = approvedSubmissions.reduce((sum, s) => 
    sum + (s.expected_reach_planned || s.expected_reach_min || 0), 0
  );
  const avgReach = approvedSubmissions.length > 0 
    ? Math.round(totalReach / approvedSubmissions.length) 
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Attribution Dashboard</h1>
        <p className="text-muted-foreground">
          Track your reach and impact across the network
        </p>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <Target className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="text-2xl font-bold">{totalReach.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">Total Reach</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{avgReach.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">Avg Reach/Track</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{(member.soundcloud_followers || 0).toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">Your Followers</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Share2 className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{((member.reach_factor || 0.06) * 100).toFixed(1)}%</div>
                <p className="text-xs text-muted-foreground">Reach Factor</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Your Network Impact */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Your Network Impact
          </CardTitle>
          <CardDescription>
            How your participation contributes to the network
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-muted rounded-lg">
              <Music className="h-8 w-8 mx-auto text-primary mb-3" />
              <div className="text-3xl font-bold">{approvedSubmissions.length}</div>
              <p className="text-sm text-muted-foreground">Tracks Promoted</p>
            </div>
            
            <div className="text-center p-4 bg-muted rounded-lg">
              <Share2 className="h-8 w-8 mx-auto text-green-600 mb-3" />
              <div className="text-3xl font-bold">{member.credits_given || 0}</div>
              <p className="text-sm text-muted-foreground">Support Given</p>
            </div>
            
            <div className="text-center p-4 bg-muted rounded-lg">
              <Award className="h-8 w-8 mx-auto text-amber-600 mb-3" />
              <div className="text-3xl font-bold">{member.size_tier}</div>
              <p className="text-sm text-muted-foreground">Your Tier</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reach Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">How Reach is Calculated</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 text-sm">
            <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
              <div className="w-8 h-8 bg-primary/10 rounded flex items-center justify-center flex-shrink-0">
                <span className="text-primary font-bold">1</span>
              </div>
              <div>
                <p className="font-medium">Your Follower Count</p>
                <p className="text-muted-foreground">
                  Your SoundCloud followers ({(member.soundcloud_followers || 0).toLocaleString()}) form the base of your reach potential.
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
              <div className="w-8 h-8 bg-primary/10 rounded flex items-center justify-center flex-shrink-0">
                <span className="text-primary font-bold">2</span>
              </div>
              <div>
                <p className="font-medium">Reach Factor Applied</p>
                <p className="text-muted-foreground">
                  Your {((member.reach_factor || 0.06) * 100).toFixed(1)}% reach factor estimates what portion of followers will see the repost.
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
              <div className="w-8 h-8 bg-primary/10 rounded flex items-center justify-center flex-shrink-0">
                <span className="text-primary font-bold">3</span>
              </div>
              <div>
                <p className="font-medium">Network Multiplier</p>
                <p className="text-muted-foreground">
                  Multiple members supporting the same track compound the total reach.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Campaign Attributions */}
      {approvedSubmissions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent Promoted Tracks</CardTitle>
            <CardDescription>
              Your tracks that received network support
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {approvedSubmissions.slice(0, 5).map((submission: any) => (
                <div 
                  key={submission.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-orange-600 rounded-lg flex items-center justify-center">
                      <Music className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">
                        {submission.artist_name || 'Your Track'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {submission.support_date 
                          ? `Supported on ${new Date(submission.support_date).toLocaleDateString()}`
                          : 'Pending support date'
                        }
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-sm">
                      {(submission.expected_reach_planned || submission.expected_reach_min || 0).toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">est. reach</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

