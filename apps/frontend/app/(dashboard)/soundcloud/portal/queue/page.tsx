"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useMyMember, useMyQueueAssignments } from "../../soundcloud-app/hooks/useMyMember";
import { 
  Calendar,
  Music,
  ExternalLink,
  CheckCircle,
  Clock,
  Users,
  Share2
} from "lucide-react";

export default function QueuePage() {
  const { data: member, isLoading: memberLoading } = useMyMember();
  const { data: queueAssignments, isLoading: queueLoading } = useMyQueueAssignments();

  const isLoading = memberLoading || queueLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Group assignments by date
  const groupedByDate = (queueAssignments || []).reduce((acc: Record<string, any[]>, assignment) => {
    const date = assignment.support_date || 'Unscheduled';
    if (!acc[date]) acc[date] = [];
    acc[date].push(assignment);
    return acc;
  }, {});

  const sortedDates = Object.keys(groupedByDate).sort();

  const extractTrackName = (url: string): string => {
    if (!url) return "Track";
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Support Queue</h1>
        <p className="text-muted-foreground">
          Tracks assigned to you for repost support
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <Calendar className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="text-2xl font-bold">{queueAssignments?.length || 0}</div>
                <p className="text-sm text-muted-foreground">Upcoming Reposts</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">
                  {queueAssignments?.filter(a => new Date(a.support_date) <= new Date()).length || 0}
                </div>
                <p className="text-sm text-muted-foreground">Due Today</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">
                  {queueAssignments?.filter(a => new Date(a.support_date) > new Date()).length || 0}
                </div>
                <p className="text-sm text-muted-foreground">Coming Up</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Queue List */}
      {sortedDates.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No Support Assignments</h3>
              <p className="text-muted-foreground">
                You don't have any tracks assigned for repost support right now.
                New assignments will appear here when available.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {sortedDates.map(date => {
            const isToday = new Date(date).toDateString() === new Date().toDateString();
            const isPast = new Date(date) < new Date(new Date().toDateString());
            
            return (
              <Card key={date}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    {date === 'Unscheduled' ? 'Unscheduled' : new Date(date).toLocaleDateString('en-US', {
                      weekday: 'long',
                      month: 'long',
                      day: 'numeric'
                    })}
                    {isToday && <Badge className="bg-green-500">Today</Badge>}
                    {isPast && !isToday && <Badge variant="secondary">Past Due</Badge>}
                  </CardTitle>
                  <CardDescription>
                    {groupedByDate[date].length} track{groupedByDate[date].length !== 1 ? 's' : ''} to support
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {groupedByDate[date].map((assignment: any) => (
                      <div 
                        key={assignment.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-orange-600 rounded-lg flex items-center justify-center">
                            <Music className="h-6 w-6 text-white" />
                          </div>
                          <div>
                            <h4 className="font-medium">
                              {assignment.artist_name || extractTrackName(assignment.track_url)}
                            </h4>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Users className="h-3 w-3" />
                              <span>by {assignment.submitter?.name || 'Member'}</span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <a 
                            href={assignment.track_url}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Button variant="outline" size="sm">
                              <ExternalLink className="h-4 w-4 mr-2" />
                              Open Track
                            </Button>
                          </a>
                          <Button size="sm" className="bg-orange-500 hover:bg-orange-600">
                            <Share2 className="h-4 w-4 mr-2" />
                            Repost
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">How to Support</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="space-y-3 text-sm text-muted-foreground list-decimal list-inside">
            <li>Click "Open Track" to view the track on SoundCloud</li>
            <li>Repost the track from your SoundCloud account</li>
            <li>Credits will be automatically added to your balance</li>
            <li>Complete your daily support to maintain good standing</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}

