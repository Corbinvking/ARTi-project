"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMyMember, useMySubmissions } from "../../soundcloud-app/hooks/useMyMember";
import { 
  Music, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Search,
  ExternalLink,
  Calendar,
  Filter
} from "lucide-react";
import Link from "next/link";

export default function HistoryPage() {
  const { data: member } = useMyMember();
  const { data: submissions, isLoading } = useMySubmissions();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const getStatusConfig = (status: string) => {
    const configs: Record<string, { icon: any; label: string; color: string }> = {
      new: { icon: Clock, label: "Pending", color: "bg-yellow-100 text-yellow-700 border-yellow-200" },
      pending: { icon: Clock, label: "Pending", color: "bg-yellow-100 text-yellow-700 border-yellow-200" },
      approved: { icon: CheckCircle, label: "Approved", color: "bg-green-100 text-green-700 border-green-200" },
      rejected: { icon: XCircle, label: "Rejected", color: "bg-red-100 text-red-700 border-red-200" },
      qa_flag: { icon: AlertTriangle, label: "Under Review", color: "bg-orange-100 text-orange-700 border-orange-200" },
    };
    return configs[status] || configs.pending;
  };

  const extractTrackName = (url: string): string => {
    if (!url) return "Unknown Track";
    try {
      const parts = url.split('/');
      const trackSlug = parts[parts.length - 1] || '';
      return trackSlug
        .replace(/[-_]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ') || "Track";
    } catch {
      return "Track";
    }
  };

  // Filter submissions
  const filteredSubmissions = (submissions || []).filter(sub => {
    const matchesSearch = searchTerm === "" || 
      sub.track_url?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sub.artist_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || sub.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Calculate stats
  const stats = {
    total: submissions?.length || 0,
    pending: submissions?.filter(s => ['new', 'pending', 'qa_flag'].includes(s.status)).length || 0,
    approved: submissions?.filter(s => s.status === 'approved').length || 0,
    rejected: submissions?.filter(s => s.status === 'rejected').length || 0,
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Submission History</h1>
          <p className="text-muted-foreground">
            View and track all your submitted tracks
          </p>
        </div>
        <Link href="/soundcloud/portal/submit">
          <Button>Submit New Track</Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-sm text-muted-foreground">Total Submissions</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
            <p className="text-sm text-muted-foreground">Pending</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-green-600">{stats.approved}</div>
            <p className="text-sm text-muted-foreground">Approved</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-red-600">{stats.rejected}</div>
            <p className="text-sm text-muted-foreground">Rejected</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by track or artist..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="new">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="qa_flag">Under Review</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Submissions List */}
      <Card>
        <CardHeader>
          <CardTitle>Your Submissions</CardTitle>
          <CardDescription>
            {filteredSubmissions.length} submission{filteredSubmissions.length !== 1 ? 's' : ''} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredSubmissions.length === 0 ? (
            <div className="text-center py-12">
              <Music className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No submissions found</h3>
              <p className="text-muted-foreground mb-4">
                {submissions?.length === 0 
                  ? "You haven't submitted any tracks yet"
                  : "No submissions match your filters"
                }
              </p>
              {submissions?.length === 0 && (
                <Link href="/soundcloud/portal/submit">
                  <Button>Submit Your First Track</Button>
                </Link>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredSubmissions.map((submission) => {
                const statusConfig = getStatusConfig(submission.status);
                const StatusIcon = statusConfig.icon;
                
                return (
                  <div 
                    key={submission.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center flex-shrink-0">
                        <Music className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="font-medium truncate">
                          {submission.artist_name || extractTrackName(submission.track_url)}
                        </h4>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          <span>
                            {new Date(submission.submitted_at || submission.created_at).toLocaleDateString()}
                          </span>
                          {submission.support_date && (
                            <>
                              <span>•</span>
                              <span>Support: {new Date(submission.support_date).toLocaleDateString()}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className={statusConfig.color}>
                        <StatusIcon className="h-3 w-3 mr-1" />
                        {statusConfig.label}
                      </Badge>
                      
                      <a 
                        href={submission.track_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

