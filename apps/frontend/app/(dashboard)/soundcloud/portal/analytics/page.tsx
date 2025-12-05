"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useMyMember, useMySubmissions } from "../../soundcloud-app/hooks/useMyMember";
import { 
  BarChart3,
  TrendingUp,
  TrendingDown,
  Target,
  Award,
  Calendar,
  CheckCircle,
  XCircle,
  Clock
} from "lucide-react";

export default function AnalyticsPage() {
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

  // Calculate analytics from submissions
  const totalSubmissions = submissions?.length || 0;
  const approvedSubmissions = submissions?.filter(s => s.status === 'approved').length || 0;
  const rejectedSubmissions = submissions?.filter(s => s.status === 'rejected').length || 0;
  const pendingSubmissions = submissions?.filter(s => ['new', 'pending', 'qa_flag'].includes(s.status)).length || 0;
  
  const approvalRate = totalSubmissions > 0 ? ((approvedSubmissions / totalSubmissions) * 100).toFixed(1) : '0';
  
  // Monthly breakdown
  const now = new Date();
  const thisMonth = submissions?.filter(s => {
    const date = new Date(s.submitted_at || s.created_at);
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  }).length || 0;
  
  const lastMonth = submissions?.filter(s => {
    const date = new Date(s.submitted_at || s.created_at);
    const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return date.getMonth() === lastMonthDate.getMonth() && date.getFullYear() === lastMonthDate.getFullYear();
  }).length || 0;

  const monthlyChange = lastMonth > 0 ? (((thisMonth - lastMonth) / lastMonth) * 100).toFixed(0) : thisMonth > 0 ? '+100' : '0';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Analytics</h1>
        <p className="text-muted-foreground">
          Track your performance and submission statistics
        </p>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Submissions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalSubmissions}</div>
            <p className="text-xs text-muted-foreground mt-1">
              All time
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Approval Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{approvalRate}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              {approvedSubmissions} approved
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              This Month
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold">{thisMonth}</span>
              {parseInt(monthlyChange) !== 0 && (
                <Badge 
                  variant="secondary" 
                  className={parseInt(monthlyChange) > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}
                >
                  {parseInt(monthlyChange) > 0 ? '+' : ''}{monthlyChange}%
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              vs {lastMonth} last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Credits Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${(member.net_credits || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {(member.net_credits || 0) >= 0 ? '+' : ''}{member.net_credits || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Net balance
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Submission Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Submission Breakdown
          </CardTitle>
          <CardDescription>
            Status distribution of your submissions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 w-32">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-sm">Approved</span>
              </div>
              <div className="flex-1 bg-muted rounded-full h-4 overflow-hidden">
                <div 
                  className="bg-green-500 h-full rounded-full transition-all"
                  style={{ width: `${totalSubmissions > 0 ? (approvedSubmissions / totalSubmissions) * 100 : 0}%` }}
                />
              </div>
              <span className="text-sm font-medium w-16 text-right">{approvedSubmissions}</span>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 w-32">
                <Clock className="h-4 w-4 text-yellow-500" />
                <span className="text-sm">Pending</span>
              </div>
              <div className="flex-1 bg-muted rounded-full h-4 overflow-hidden">
                <div 
                  className="bg-yellow-500 h-full rounded-full transition-all"
                  style={{ width: `${totalSubmissions > 0 ? (pendingSubmissions / totalSubmissions) * 100 : 0}%` }}
                />
              </div>
              <span className="text-sm font-medium w-16 text-right">{pendingSubmissions}</span>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 w-32">
                <XCircle className="h-4 w-4 text-red-500" />
                <span className="text-sm">Rejected</span>
              </div>
              <div className="flex-1 bg-muted rounded-full h-4 overflow-hidden">
                <div 
                  className="bg-red-500 h-full rounded-full transition-all"
                  style={{ width: `${totalSubmissions > 0 ? (rejectedSubmissions / totalSubmissions) * 100 : 0}%` }}
                />
              </div>
              <span className="text-sm font-medium w-16 text-right">{rejectedSubmissions}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Target className="h-5 w-5" />
              Performance Metrics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Reach Factor</span>
                <span className="font-medium">{((member.reach_factor || 0.06) * 100).toFixed(1)}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Size Tier</span>
                <Badge variant="outline">{member.size_tier}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">SC Followers</span>
                <span className="font-medium">{(member.soundcloud_followers || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Monthly Limit</span>
                <span className="font-medium">{member.monthly_repost_limit || member.monthly_submission_limit || 0}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Award className="h-5 w-5" />
              Credit Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Credits Earned</span>
                <span className="font-medium text-green-600">+{member.credits_given || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Credits Used</span>
                <span className="font-medium text-red-600">-{member.credits_used || 0}</span>
              </div>
              <hr />
              <div className="flex justify-between items-center">
                <span className="font-medium">Net Balance</span>
                <span className={`font-bold ${(member.net_credits || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {(member.net_credits || 0) >= 0 ? '+' : ''}{member.net_credits || 0}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tips */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Tips to Improve</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <TrendingUp className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
              Submit high-quality original tracks for better approval rates
            </li>
            <li className="flex items-start gap-2">
              <TrendingUp className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
              Support other members' tracks to earn more credits
            </li>
            <li className="flex items-start gap-2">
              <TrendingUp className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
              Keep your SoundCloud profile active to maintain your tier
            </li>
            <li className="flex items-start gap-2">
              <TrendingUp className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
              Complete your daily support queue to maximize reach
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

