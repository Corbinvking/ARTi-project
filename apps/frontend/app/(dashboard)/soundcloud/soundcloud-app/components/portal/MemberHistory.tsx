"use client"

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../integrations/supabase/client';
import { format } from 'date-fns';
import { ExternalLink, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Submission {
  id: string;
  track_url: string;
  artist_name: string;
  status: string;
  family: string;
  subgenres: string[];
  support_date: string;
  support_url: string;
  qa_flag: boolean;
  qa_reason: string;
  notes: string;
  submitted_at: string;
}

export const MemberHistory = () => {
  const { member } = useAuth();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (member) {
      fetchSubmissions();
    }
  }, [member]);

  const fetchSubmissions = async () => {
    if (!member) return;

    try {
      const { data, error } = await supabase
        .from('submissions')
        .select('*')
        .eq('member_id', member.id)
        .order('submitted_at', { ascending: false });

      if (error) throw error;
      setSubmissions(data || []);
    } catch (error) {
      console.error('Error fetching submissions:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'new':
      case 'in_review':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'needs_live_link':
        return <AlertCircle className="h-4 w-4 text-blue-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'rejected':
        return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'needs_live_link':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'new':
      case 'in_review':
        return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      default:
        return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: { [key: string]: string } = {
      'new': 'New',
      'in_review': 'In Review',
      'approved': 'Approved',
      'rejected': 'Rejected',
      'needs_live_link': 'Needs Live Link',
      'supported': 'Supported',
      'scheduled': 'Scheduled'
    };
    return labels[status] || status;
  };

  if (!member) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        Loading member data...
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        Loading your submission history...
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Submission History</h1>
          <p className="text-muted-foreground">Track the status of your submitted tracks</p>
        </div>
        <Badge variant="outline" className="px-3 py-1">
          {submissions.length} total submissions
        </Badge>
      </div>

      {submissions.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-medium mb-2">No submissions yet</h3>
            <p>Your track submissions will appear here once you start uploading.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {submissions.map((submission) => (
            <Card key={submission.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg flex items-center gap-2">
                      {getStatusIcon(submission.status)}
                      {submission.artist_name || member.name}
                    </CardTitle>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>Submitted {format(new Date(submission.submitted_at), 'MMM dd, yyyy')}</span>
                      {submission.support_date && (
                        <>
                          <span>•</span>
                          <span>Supported {format(new Date(submission.support_date), 'MMM dd, yyyy')}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <Badge className={getStatusColor(submission.status)}>
                    {getStatusLabel(submission.status)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {/* Track URL */}
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(submission.track_url, '_blank')}
                    >
                      <ExternalLink className="h-3 w-3 mr-1" />
                      View Track
                    </Button>
                    {submission.support_url && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(submission.support_url, '_blank')}
                      >
                        <ExternalLink className="h-3 w-3 mr-1" />
                        View Support
                      </Button>
                    )}
                  </div>

                  {/* Genre info */}
                  {(submission.family || submission.subgenres.length > 0) && (
                    <div className="flex flex-wrap gap-1">
                      {submission.family && (
                        <Badge variant="secondary" className="text-xs">
                          {submission.family}
                        </Badge>
                      )}
                      {submission.subgenres.map((subgenre) => (
                        <Badge key={subgenre} variant="outline" className="text-xs">
                          {subgenre}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {/* QA Flag */}
                  {submission.qa_flag && submission.qa_reason && (
                    <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                      <p className="text-sm text-yellow-600 dark:text-yellow-400">
                        <strong>QA Note:</strong> {submission.qa_reason}
                      </p>
                    </div>
                  )}

                  {/* Notes */}
                  {submission.client_notes && (
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <p className="text-sm">{submission.client_notes}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};