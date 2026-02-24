"use client";

import { Suspense, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { useAuth } from "../soundcloud-app/contexts/AuthContext";
import { useMyMember, useMySubmissions } from "../soundcloud-app/hooks/useMyMember";
import Link from "next/link";
import {
  Upload,
  Coins,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Calendar,
  WifiOff,
  Layers,
  Rocket,
  ExternalLink,
} from "lucide-react";

const TIER_REACH_DEFAULTS: Record<string, string> = {
  T1: "500 - 2K",
  T2: "2K - 10K",
  T3: "10K - 50K",
  T4: "50K+",
};

function DashboardContent() {
  const { member: authMember } = useAuth();
  const { data: dbMember, isLoading: memberLoading } = useMyMember();
  const { data: submissions, isLoading: subsLoading } = useMySubmissions();

  const member = dbMember || authMember;

  const isDisconnected =
    member &&
    ["disconnected", "INVALID", "UNLINKED", "needs_reconnect"].includes(
      (member as any).influence_planner_status
    );

  const stats = useMemo(() => {
    if (!submissions || !member) return null;
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const todayStr = now.toISOString().split("T")[0];

    const isApproved = (s: string) =>
      ["ready", "active", "approved", "complete"].includes(s);
    const isRejected = (s: string) => s === "on_hold" || s === "rejected";
    const isPending = (s: string) => ["pending", "new", "qa_flag"].includes(s);

    const thisMonth = submissions.filter((s: any) => {
      const d = s.submitted_at || s.created_at;
      return d && new Date(d) >= startOfMonth;
    }).length;

    const remaining =
      (member.monthly_repost_limit || member.monthly_submission_limit || 0) -
      thisMonth;

    const pending = submissions.filter((s: any) => isPending(s.status)).length;
    const approved = submissions.filter((s: any) => isApproved(s.status)).length;

    const upcoming = submissions
      .filter(
        (s: any) =>
          isApproved(s.status) && s.support_date && s.support_date >= todayStr
      )
      .sort((a: any, b: any) =>
        (a.support_date || "").localeCompare(b.support_date || "")
      );

    const recentActivity = submissions
      .filter(
        (s: any) =>
          isApproved(s.status) || isRejected(s.status)
      )
      .slice(0, 5);

    return {
      remaining: Math.max(0, remaining),
      limit: member.monthly_repost_limit || member.monthly_submission_limit || 0,
      thisMonth,
      pending,
      approved,
      upcoming,
      recentActivity,
    };
  }, [submissions, member]);

  if (memberLoading || subsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!member || !stats) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <h2 className="text-xl font-semibold">Member Data Not Found</h2>
          <p className="text-muted-foreground">
            Please contact support if this persists.
          </p>
        </div>
      </div>
    );
  }

  const submissionProgress =
    stats.limit > 0 ? (stats.thisMonth / stats.limit) * 100 : 0;
  const tierReach = TIER_REACH_DEFAULTS[member.size_tier] || "N/A";

  const getStatusIcon = (status: string) => {
    if (["ready", "active", "approved"].includes(status))
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    if (status === "on_hold" || status === "rejected")
      return <XCircle className="h-4 w-4 text-red-500" />;
    if (status === "qa_flag")
      return <AlertTriangle className="h-4 w-4 text-orange-500" />;
    return <Clock className="h-4 w-4 text-yellow-500" />;
  };

  const friendlyStatus = (status: string) => {
    if (["ready", "active", "approved"].includes(status)) return "Approved";
    if (status === "on_hold" || status === "rejected") return "Rejected";
    if (status === "complete") return "Completed";
    if (status === "qa_flag") return "Under Review";
    return "Pending";
  };

  const supportStatus = (supportDate: string | null) => {
    if (!supportDate) return "Scheduled";
    const today = new Date().toISOString().split("T")[0];
    if (supportDate > today) return "Scheduled";
    return "Active";
  };

  return (
    <div className="space-y-6">
      {/* Connection Status Banner */}
      {isDisconnected && (
        <div className="rounded-lg bg-destructive/10 border border-destructive/30 p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <WifiOff className="h-5 w-5 text-destructive flex-shrink-0" />
            <div>
              <p className="font-semibold text-destructive">
                Your SoundCloud account is disconnected
              </p>
              <p className="text-sm text-muted-foreground">
                Reposts and support are paused until you reconnect.
              </p>
            </div>
          </div>
          <Link href="/soundcloud/portal/profile">
            <Button variant="destructive" size="sm">
              Reconnect
            </Button>
          </Link>
        </div>
      )}

      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold">Welcome back, {member.name}!</h1>
        <p className="text-muted-foreground">
          Here's your submission overview.
        </p>
      </div>

      {/* 4 Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Remaining This Month
            </CardTitle>
            <Upload className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {stats.remaining}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.thisMonth}/{stats.limit} used
            </p>
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
              {stats.pending}
            </div>
            <p className="text-xs text-muted-foreground">awaiting review</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Approved (Upcoming)
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {stats.approved}
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

      {/* Upcoming Support Schedule */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Upcoming Support
          </CardTitle>
        </CardHeader>
        <CardContent>
          {stats.upcoming.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No upcoming support scheduled. Submit a track to get started!
            </p>
          ) : (
            <div className="space-y-3">
              {stats.upcoming.slice(0, 8).map((sub: any) => (
                <div
                  key={sub.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">
                        {sub.track_name ||
                          sub.artist_name ||
                          sub.track_url?.split("/").pop() ||
                          "Track"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Starts{" "}
                        {new Date(sub.support_date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge variant="outline" className="text-xs">
                      {supportStatus(sub.support_date)}
                    </Badge>
                    {(sub.expected_reach_min || sub.expected_reach_max) && (
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {(sub.expected_reach_min || 0).toLocaleString()} –{" "}
                        {(sub.expected_reach_max || 0).toLocaleString()} reach
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tier + Expected Reach */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
              <Layers className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="font-medium">
                Member Tier:{" "}
                <Badge variant="secondary" className="ml-1">
                  {member.size_tier}
                </Badge>
              </p>
              <p className="text-sm text-muted-foreground">
                Estimated reach per approved song: {tierReach}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      {stats.recentActivity.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Recent Activity</CardTitle>
              <Link href="/soundcloud/portal/history">
                <Button variant="ghost" size="sm">
                  View All
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stats.recentActivity.map((sub: any) => (
                <div
                  key={sub.id}
                  className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {getStatusIcon(sub.status)}
                    <div>
                      <p className="text-sm font-medium">
                        {sub.track_name ||
                          sub.artist_name ||
                          sub.track_url?.split("/").pop() ||
                          "Track"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(
                          sub.submitted_at || sub.created_at
                        ).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {friendlyStatus(sub.status)}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upsell */}
      <Card className="border-dashed">
        <CardContent className="pt-6">
          <div className="text-center space-y-3">
            <Rocket className="h-8 w-8 mx-auto text-muted-foreground" />
            <h3 className="font-semibold">
              Want to push this release further?
            </h3>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <a
                href="https://artistinfluence.io/campaign-builder"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="default">
                  Build a Campaign
                  <ExternalLink className="h-4 w-4 ml-2" />
                </Button>
              </a>
              <a
                href="https://calendly.com/artistinfluence"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="outline">
                  Talk to Artist Influence Team
                  <ExternalLink className="h-4 w-4 ml-2" />
                </Button>
              </a>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function PortalDashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
