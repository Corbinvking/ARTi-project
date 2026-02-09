"use client";

import React, { useState, useMemo } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Music,
  ExternalLink,
  TrendingUp,
  Play,
  Heart,
  Repeat,
  MessageCircle,
  Target,
  Calendar,
  Filter,
  BarChart3,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  useMemberCampaigns,
  MemberCampaign,
} from "../../hooks/useMemberCampaigns";

// ---------------------------------------------------------------------------
// Status helpers
// ---------------------------------------------------------------------------

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  intake: {
    label: "Intake",
    color: "text-gray-600 bg-gray-50 border-gray-200",
  },
  draft: {
    label: "Draft",
    color: "text-slate-600 bg-slate-50 border-slate-200",
  },
  scheduled: {
    label: "Scheduled",
    color: "text-blue-600 bg-blue-50 border-blue-200",
  },
  live: {
    label: "Live",
    color: "text-green-600 bg-green-50 border-green-200",
  },
  completed: {
    label: "Completed",
    color: "text-purple-600 bg-purple-50 border-purple-200",
  },
  paused: {
    label: "Paused",
    color: "text-amber-600 bg-amber-50 border-amber-200",
  },
  approved: {
    label: "Approved",
    color: "text-green-600 bg-green-50 border-green-200",
  },
  pending: {
    label: "Pending",
    color: "text-yellow-600 bg-yellow-50 border-yellow-200",
  },
  new: { label: "New", color: "text-blue-600 bg-blue-50 border-blue-200" },
  rejected: {
    label: "Rejected",
    color: "text-red-600 bg-red-50 border-red-200",
  },
};

function getStatusConfig(status: string) {
  return (
    STATUS_CONFIG[status] || {
      label: status.charAt(0).toUpperCase() + status.slice(1),
      color: "text-gray-600 bg-gray-50 border-gray-200",
    }
  );
}

// ---------------------------------------------------------------------------
// Metric Card
// ---------------------------------------------------------------------------

function MetricCard({
  icon: Icon,
  label,
  value,
  className,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  className?: string;
}) {
  return (
    <div className={`flex items-center gap-2 p-3 rounded-lg border ${className || ""}`}>
      <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-lg font-bold">{value.toLocaleString()}</p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Campaign Card
// ---------------------------------------------------------------------------

function CampaignCard({ campaign }: { campaign: MemberCampaign }) {
  const [expanded, setExpanded] = useState(false);
  const statusConfig = getStatusConfig(campaign.status);

  const chartData = useMemo(() => {
    if (!campaign.metrics?.snapshots) return [];
    return campaign.metrics.snapshots.map((s) => ({
      day: `Day ${s.day_index}`,
      date: s.snapshot_date,
      plays: s.plays,
      likes: s.likes,
      reposts: s.reposts,
      comments: s.comments,
    }));
  }, [campaign.metrics?.snapshots]);

  const hasMetrics =
    campaign.metrics &&
    (campaign.metrics.plays > 0 ||
      campaign.metrics.likes > 0 ||
      campaign.metrics.reposts > 0 ||
      campaign.metrics.comments > 0);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <Music className="h-5 w-5 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <CardTitle className="text-base truncate">
                {campaign.track_name}
              </CardTitle>
              <CardDescription className="truncate">
                {campaign.artist_name}
              </CardDescription>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <Badge
              variant="outline"
              className={`text-xs capitalize ${
                campaign.role === "submitter"
                  ? "bg-primary/10 text-primary border-primary/20"
                  : "bg-secondary text-secondary-foreground"
              }`}
            >
              {campaign.role}
            </Badge>
            <Badge variant="outline" className={statusConfig.color}>
              {statusConfig.label}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Info Row */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
          {campaign.start_date && (
            <div className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              <span>
                {new Date(campaign.start_date).toLocaleDateString()}
                {campaign.end_date &&
                  ` - ${new Date(campaign.end_date).toLocaleDateString()}`}
              </span>
            </div>
          )}
          {campaign.goal_reposts != null && campaign.goal_reposts > 0 && (
            <div className="flex items-center gap-1">
              <Target className="h-3.5 w-3.5" />
              <span>Goal: {campaign.goal_reposts} reposts</span>
            </div>
          )}
          {campaign.track_url && (
            <a
              href={campaign.track_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 hover:text-primary transition-colors"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span>View Track</span>
            </a>
          )}
        </div>

        {/* Metric Summary */}
        {hasMetrics && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <MetricCard icon={Play} label="Plays" value={campaign.metrics!.plays} />
            <MetricCard icon={Heart} label="Likes" value={campaign.metrics!.likes} />
            <MetricCard
              icon={Repeat}
              label="Reposts"
              value={campaign.metrics!.reposts}
            />
            <MetricCard
              icon={MessageCircle}
              label="Comments"
              value={campaign.metrics!.comments}
            />
          </div>
        )}

        {/* Goal progress bar */}
        {campaign.goal_reposts != null &&
          campaign.goal_reposts > 0 &&
          campaign.metrics && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Repost Progress</span>
                <span>
                  {campaign.metrics.reposts} / {campaign.goal_reposts}
                </span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-orange-500 to-orange-600 rounded-full transition-all"
                  style={{
                    width: `${Math.min(
                      100,
                      (campaign.metrics.reposts / campaign.goal_reposts) * 100
                    )}%`,
                  }}
                />
              </div>
            </div>
          )}

        {/* Expand for chart */}
        {chartData.length > 1 && (
          <>
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-muted-foreground"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? (
                <>
                  <ChevronUp className="h-4 w-4 mr-1" /> Hide Chart
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4 mr-1" /> Show Performance Chart
                </>
              )}
            </Button>

            {expanded && (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis
                      dataKey="day"
                      tick={{ fontSize: 11 }}
                      className="text-muted-foreground"
                    />
                    <YAxis tick={{ fontSize: 11 }} className="text-muted-foreground" />
                    <Tooltip
                      contentStyle={{
                        borderRadius: "8px",
                        border: "1px solid hsl(var(--border))",
                        backgroundColor: "hsl(var(--popover))",
                        color: "hsl(var(--popover-foreground))",
                      }}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="plays"
                      stroke="#f97316"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      name="Plays"
                    />
                    <Line
                      type="monotone"
                      dataKey="likes"
                      stroke="#ef4444"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      name="Likes"
                    />
                    <Line
                      type="monotone"
                      dataKey="reposts"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      name="Reposts"
                    />
                    <Line
                      type="monotone"
                      dataKey="comments"
                      stroke="#8b5cf6"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      name="Comments"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function MemberCampaignView() {
  const { data: campaigns, isLoading, error } = useMemberCampaigns();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("newest");

  // Derive unique statuses for the filter
  const uniqueStatuses = useMemo(() => {
    if (!campaigns) return [];
    const statuses = [...new Set(campaigns.map((c) => c.status))];
    return statuses.sort();
  }, [campaigns]);

  // Apply filters and sorting
  const filteredCampaigns = useMemo(() => {
    if (!campaigns) return [];

    let result = [...campaigns];

    if (statusFilter !== "all") {
      result = result.filter((c) => c.status === statusFilter);
    }
    if (roleFilter !== "all") {
      result = result.filter((c) => c.role === roleFilter);
    }

    // Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case "newest":
          return (
            new Date(b.start_date || "1970-01-01").getTime() -
            new Date(a.start_date || "1970-01-01").getTime()
          );
        case "oldest":
          return (
            new Date(a.start_date || "1970-01-01").getTime() -
            new Date(b.start_date || "1970-01-01").getTime()
          );
        case "status":
          return a.status.localeCompare(b.status);
        case "plays":
          return (b.metrics?.plays || 0) - (a.metrics?.plays || 0);
        default:
          return 0;
      }
    });

    return result;
  }, [campaigns, statusFilter, roleFilter, sortBy]);

  // Aggregate stats
  const stats = useMemo(() => {
    if (!campaigns) return { total: 0, live: 0, completed: 0, totalPlays: 0 };
    return {
      total: campaigns.length,
      live: campaigns.filter((c) => c.status === "live" || c.status === "approved").length,
      completed: campaigns.filter((c) => c.status === "completed").length,
      totalPlays: campaigns.reduce((sum, c) => sum + (c.metrics?.plays || 0), 0),
    };
  }, [campaigns]);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-muted-foreground">Loading campaigns...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <BarChart3 className="w-12 h-12 mx-auto text-muted-foreground" />
          <h2 className="text-lg font-semibold">Failed to load campaigns</h2>
          <p className="text-sm text-muted-foreground">
            Please try again later or contact support.
          </p>
        </div>
      </div>
    );
  }

  // Empty state
  if (!campaigns || campaigns.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <Music className="w-16 h-16 mx-auto text-muted-foreground" />
          <h2 className="text-xl font-semibold">No Campaigns Yet</h2>
          <p className="text-muted-foreground max-w-md">
            You don&apos;t have any campaigns to display yet. Campaigns will
            appear here once you submit tracks or are assigned as a supporter.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">My Campaigns</h1>
        <p className="text-muted-foreground">
          Track the status and performance of your campaigns
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Total Campaigns</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">{stats.live}</div>
            <p className="text-xs text-muted-foreground">Active / Live</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-purple-600">
              {stats.completed}
            </div>
            <p className="text-xs text-muted-foreground">Completed</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-orange-600">
              {stats.totalPlays.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">Total Plays</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Filters:</span>
        </div>

        <Tabs
          value={roleFilter}
          onValueChange={setRoleFilter}
          className="w-auto"
        >
          <TabsList className="h-8">
            <TabsTrigger value="all" className="text-xs px-3 h-7">
              All Roles
            </TabsTrigger>
            <TabsTrigger value="submitter" className="text-xs px-3 h-7">
              Submitter
            </TabsTrigger>
            <TabsTrigger value="supporter" className="text-xs px-3 h-7">
              Supporter
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px] h-8 text-xs">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {uniqueStatuses.map((s) => (
              <SelectItem key={s} value={s}>
                {getStatusConfig(s).label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-[140px] h-8 text-xs">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest First</SelectItem>
            <SelectItem value="oldest">Oldest First</SelectItem>
            <SelectItem value="status">By Status</SelectItem>
            <SelectItem value="plays">Most Plays</SelectItem>
          </SelectContent>
        </Select>

        {(statusFilter !== "all" || roleFilter !== "all") && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setStatusFilter("all");
              setRoleFilter("all");
            }}
            className="text-xs h-8"
          >
            Clear Filters
          </Button>
        )}
      </div>

      {/* Results count */}
      <p className="text-sm text-muted-foreground">
        Showing {filteredCampaigns.length} of {campaigns.length} campaigns
      </p>

      {/* Campaign Cards */}
      <div className="space-y-4">
        {filteredCampaigns.map((campaign) => (
          <CampaignCard key={campaign.id} campaign={campaign} />
        ))}
      </div>

      {filteredCampaigns.length === 0 && campaigns.length > 0 && (
        <div className="text-center py-12">
          <Filter className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">No matching campaigns</h3>
          <p className="text-sm text-muted-foreground">
            Try adjusting your filters to see more results.
          </p>
        </div>
      )}
    </div>
  );
}
