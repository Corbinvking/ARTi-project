"use client";

import { Suspense } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { useAuth } from "../soundcloud-app/contexts/AuthContext";
import { useMyMember } from "../soundcloud-app/hooks/useMyMember";
import { useMemberSubmissions } from "../soundcloud-app/hooks/useMemberSubmissions";
import Link from "next/link";
import { 
  Music, 
  Upload, 
  TrendingUp, 
  Coins, 
  ArrowRight, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Users,
  Calendar
} from "lucide-react";

function DashboardContent() {
  const { member: authMember } = useAuth();
  const { data: dbMember, isLoading: memberLoading } = useMyMember();
  const { stats, loading: statsLoading } = useMemberSubmissions();
  
  // Use database member if available, fallback to auth member
  const member = dbMember || authMember;

  if (memberLoading || statsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!member) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <Music className="w-16 h-16 mx-auto text-muted-foreground" />
          <h2 className="text-xl font-semibold">Member Data Not Found</h2>
          <p className="text-muted-foreground">Please contact support if this persists.</p>
        </div>
      </div>
    );
  }

  const submissionProgress = member.monthly_repost_limit 
    ? (stats.thisMonthSubmissions / member.monthly_repost_limit) * 100 
    : 0;
  const remainingSubmissions = (member.monthly_repost_limit || 0) - stats.thisMonthSubmissions;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'rejected': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'pending': 
      case 'new': return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'qa_flag': return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      default: return <Clock className="h-4 w-4 text-blue-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'text-green-600 bg-green-50 border-green-200';
      case 'rejected': return 'text-red-600 bg-red-50 border-red-200';
      case 'pending':
      case 'new': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'qa_flag': return 'text-orange-600 bg-orange-50 border-orange-200';
      default: return 'text-blue-600 bg-blue-50 border-blue-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            Welcome back, {member.name}!
          </h1>
          <p className="text-muted-foreground">
            Track your submissions and performance
          </p>
        </div>
        <Badge 
          variant={member.status === 'active' ? 'default' : 'secondary'}
          className="px-3 py-1"
        >
          {(member.status || 'active').charAt(0).toUpperCase() + (member.status || 'active').slice(1)}
        </Badge>
      </div>

      {/* Key Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <Upload className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {stats.thisMonthSubmissions}/{member.monthly_repost_limit || 0}
            </div>
            <p className="text-xs text-muted-foreground">submissions used</p>
            <Progress value={submissionProgress} className="mt-2 h-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">
              {stats.pendingSubmissions}
            </div>
            <p className="text-xs text-muted-foreground">awaiting review</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {stats.approvedSubmissions}
            </div>
            <p className="text-xs text-muted-foreground">total approved</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Credits</CardTitle>
            <Coins className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {member.net_credits || 0}
            </div>
            <p className="text-xs text-muted-foreground">available balance</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Link href="/soundcloud/portal/submit">
            <Button 
              variant="outline" 
              className="w-full justify-between h-auto p-4"
              disabled={remainingSubmissions <= 0}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Upload className="h-5 w-5 text-primary" />
                </div>
                <div className="text-left">
                  <h3 className="font-medium">Submit New Track</h3>
                  <p className="text-sm text-muted-foreground">Upload your latest SoundCloud link</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">
                  {remainingSubmissions > 0 ? `${remainingSubmissions} left` : 'Limit reached'}
                </Badge>
                <ArrowRight className="h-4 w-4" />
              </div>
            </Button>
          </Link>

          <Link href="/soundcloud/portal/history">
            <Button variant="outline" className="w-full justify-between h-auto p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-secondary/10 rounded-lg flex items-center justify-center">
                  <Music className="h-5 w-5 text-secondary-foreground" />
                </div>
                <div className="text-left">
                  <h3 className="font-medium">View History</h3>
                  <p className="text-sm text-muted-foreground">Check your submission status</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">{stats.totalSubmissions} total</Badge>
                <ArrowRight className="h-4 w-4" />
              </div>
            </Button>
          </Link>

          <Link href="/soundcloud/portal/queue">
            <Button variant="outline" className="w-full justify-between h-auto p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center">
                  <Calendar className="h-5 w-5 text-accent-foreground" />
                </div>
                <div className="text-left">
                  <h3 className="font-medium">Support Queue</h3>
                  <p className="text-sm text-muted-foreground">View your support assignments</p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </CardContent>
      </Card>

      {/* Recent Submissions */}
      {stats.recentSubmissions && stats.recentSubmissions.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Recent Submissions</CardTitle>
              <Link href="/soundcloud/portal/history">
                <Button variant="ghost" size="sm">
                  View All <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.recentSubmissions.slice(0, 5).map((submission: any) => (
                <div 
                  key={submission.id} 
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {getStatusIcon(submission.status)}
                    <div>
                      <h4 className="font-medium text-sm">
                        {submission.artist_name || submission.track_url?.split('/').pop() || 'Track'}
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        {new Date(submission.submitted_at || submission.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <Badge 
                    variant="outline" 
                    className={getStatusColor(submission.status)}
                  >
                    {(submission.status || 'new').replace('_', ' ')}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function PortalDashboardPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <DashboardContent />
    </Suspense>
  );
}

