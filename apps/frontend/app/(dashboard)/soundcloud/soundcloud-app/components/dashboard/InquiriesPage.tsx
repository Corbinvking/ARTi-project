"use client"

import React, { useState, useEffect } from 'react';
import { MessageSquare, User, ExternalLink, Check, X, Clock, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '../../integrations/supabase/client';
import { useToast } from '../../hooks/use-toast';
import { format } from 'date-fns';

interface Inquiry {
  id: string;
  name: string;
  email: string;
  soundcloud_url?: string;
  status: string;
  notes?: string;
  admitted_group?: string;
  admitted_at?: string;
  ip_join_confirmed: boolean;
  created_at: string;
  updated_at: string;
}

interface InquiryStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
}

export const InquiriesPage: React.FC = () => {
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [stats, setStats] = useState<InquiryStats>({ total: 0, pending: 0, approved: 0, rejected: 0 });
  const [loading, setLoading] = useState(true);
  const [selectedInquiry, setSelectedInquiry] = useState<Inquiry | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [decisionNotes, setDecisionNotes] = useState('');
  const [admittedGroup, setAdmittedGroup] = useState('');
  const [updating, setUpdating] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchInquiries();
  }, [statusFilter]);

  const fetchInquiries = async () => {
    try {
      let query = supabase
        .from('inquiries')
        .select('*')
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter as any);
      }

      const { data, error } = await query;
      if (error) throw error;

      setInquiries(data || []);

      // Calculate stats
      const total = data?.length || 0;
      const pending = data?.filter(i => i.status === 'undecided').length || 0;
      const approved = data?.filter(i => i.status === 'admitted').length || 0;
      const rejected = data?.filter(i => i.status === 'rejected').length || 0;

      setStats({ total, pending, approved, rejected });
    } catch (error) {
      console.error('Error fetching inquiries:', error);
      toast({
        title: "Error",
        description: "Failed to load inquiries",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateInquiryStatus = async (inquiryId: string, status: string) => {
    if (!selectedInquiry) return;

    setUpdating(true);
    try {
      const updates: any = { 
        status,
        notes: decisionNotes || selectedInquiry.notes
      };

      if (status === 'admitted') {
        updates.admitted_at = new Date().toISOString();
        updates.admitted_group = admittedGroup || 'General';
      }

      const { error } = await supabase
        .from('inquiries')
        .update(updates)
        .eq('id', inquiryId);

      if (error) throw error;

      // Send email notification for status changes
      if (status === 'admitted' || status === 'rejected') {
        try {
          const { error: emailError } = await supabase.functions.invoke('send-notification-email', {
            body: {
              to: selectedInquiry.email,
              template: status === 'admitted' ? 'welcome-admission' : 'inquiry-rejection',
              data: {
                firstName: selectedInquiry.name.split(' ')[0],
                submissionFormUrl: status === 'admitted' ? '/portal/submit' : undefined
              },
              notificationData: {
                title: status === 'admitted' ? 'Welcome to SoundCloud Groups' : 'Inquiry Status Update',
                message: status === 'admitted' 
                  ? 'Congratulations! You have been accepted to our SoundCloud groups.' 
                  : 'Thank you for your interest. We are unable to accept your application at this time.',
                type: status === 'admitted' ? 'success' : 'info'
              },
              relatedObjectType: 'inquiry',
              relatedObjectId: inquiryId
            }
          });
          
          if (emailError) {
            console.error('Email sending failed:', emailError);
          }
        } catch (emailError) {
          console.error('Email function call failed:', emailError);
        }
      }

      toast({
        title: "Success",
        description: `Inquiry ${status} successfully`,
      });

      setSelectedInquiry(null);
      setDecisionNotes('');
      setAdmittedGroup('');
      await fetchInquiries();
    } catch (error) {
      console.error('Error updating inquiry:', error);
      toast({
        title: "Error",
        description: "Failed to update inquiry",
        variant: "destructive",
      });
    } finally {
      setUpdating(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'undecided':
        return <Badge variant="outline">Pending</Badge>;
      case 'admitted':
        return <Badge variant="default">Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const filteredInquiries = inquiries.filter(inquiry =>
    inquiry.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    inquiry.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground">Loading inquiries...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Member Inquiries</h1>
        <p className="text-muted-foreground">
          Manage new member applications and admissions
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <MessageSquare className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Total Inquiries</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="w-5 h-5 text-orange-500" />
              <div>
                <p className="text-sm font-medium">Pending Review</p>
                <p className="text-2xl font-bold">{stats.pending}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Check className="w-5 h-5 text-green-500" />
              <div>
                <p className="text-sm font-medium">Approved</p>
                <p className="text-2xl font-bold">{stats.approved}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <X className="w-5 h-5 text-red-500" />
              <div>
                <p className="text-sm font-medium">Rejected</p>
                <p className="text-2xl font-bold">{stats.rejected}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <Input
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="undecided">Pending</SelectItem>
            <SelectItem value="admitted">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Inquiries Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Inquiries</CardTitle>
          <CardDescription>
            Review and process new member applications
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredInquiries.length === 0 ? (
            <Alert>
              <MessageSquare className="h-4 w-4" />
              <AlertDescription>
                No inquiries found matching your criteria.
              </AlertDescription>
            </Alert>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Applicant</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Applied</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInquiries.map((inquiry) => (
                  <TableRow key={inquiry.id}>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-gradient-primary rounded-full flex items-center justify-center">
                          <span className="text-white text-xs font-medium">
                            {inquiry.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium">{inquiry.name}</p>
                          {inquiry.soundcloud_url && (
                            <Button
                              variant="link"
                              size="sm"
                              className="p-0 h-auto text-xs"
                              onClick={() => window.open(inquiry.soundcloud_url, '_blank')}
                            >
                              <ExternalLink className="w-3 h-3 mr-1" />
                              SoundCloud
                            </Button>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Mail className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm">{inquiry.email}</span>
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(inquiry.status)}</TableCell>
                    <TableCell className="text-sm">
                      {format(new Date(inquiry.created_at), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedInquiry(inquiry);
                              setDecisionNotes(inquiry.notes || '');
                              setAdmittedGroup(inquiry.admitted_group || '');
                            }}
                          >
                            <User className="w-4 h-4 mr-1" />
                            Review
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>Review Application</DialogTitle>
                            <DialogDescription>
                              Review and make a decision on this membership application
                            </DialogDescription>
                          </DialogHeader>
                          {selectedInquiry && (
                            <div className="space-y-4">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <label className="text-sm font-medium">Name</label>
                                  <p className="text-sm">{selectedInquiry.name}</p>
                                </div>
                                <div>
                                  <label className="text-sm font-medium">Email</label>
                                  <p className="text-sm">{selectedInquiry.email}</p>
                                </div>
                              </div>

                              {selectedInquiry.soundcloud_url && (
                                <div>
                                  <label className="text-sm font-medium">SoundCloud Profile</label>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="mt-1"
                                    onClick={() => window.open(selectedInquiry.soundcloud_url, '_blank')}
                                  >
                                    <ExternalLink className="w-4 h-4 mr-2" />
                                    View Profile
                                  </Button>
                                </div>
                              )}

                              <div>
                                <label className="text-sm font-medium">Decision Notes</label>
                                <Textarea
                                  value={decisionNotes}
                                  onChange={(e) => setDecisionNotes(e.target.value)}
                                  placeholder="Add notes about your decision..."
                                  className="mt-1"
                                />
                              </div>

                              <div>
                                <label className="text-sm font-medium">Admission Group (if approved)</label>
                                <Input
                                  value={admittedGroup}
                                  onChange={(e) => setAdmittedGroup(e.target.value)}
                                  placeholder="e.g., Electronic, Hip-Hop, General"
                                  className="mt-1"
                                />
                              </div>

                              <div className="flex space-x-2 pt-4">
                                <Button
                                  onClick={() => updateInquiryStatus(selectedInquiry.id, 'admitted')}
                                  disabled={updating}
                                  className="flex-1"
                                >
                                  {updating ? (
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                                  ) : (
                                    <Check className="w-4 h-4 mr-2" />
                                  )}
                                  Approve
                                </Button>
                                <Button
                                  variant="destructive"
                                  onClick={() => updateInquiryStatus(selectedInquiry.id, 'rejected')}
                                  disabled={updating}
                                  className="flex-1"
                                >
                                  <X className="w-4 h-4 mr-2" />
                                  Reject
                                </Button>
                              </div>
                            </div>
                          )}
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};