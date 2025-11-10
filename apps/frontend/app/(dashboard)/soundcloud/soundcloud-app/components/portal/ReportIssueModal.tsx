"use client"

import React, { useState } from 'react';
import { AlertTriangle, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '../../hooks/use-toast';
import { supabase } from '../../integrations/supabase/client';
import { useAuth } from '../../contexts/AuthContext';

interface ReportIssueModalProps {
  isOpen: boolean;
  onClose: () => void;
  assignment: {
    id: string;
    submissions: {
      id: string;
      track_url: string;
      artist_name: string;
    };
  };
}

export const ReportIssueModal: React.FC<ReportIssueModalProps> = ({
  isOpen,
  onClose,
  assignment
}) => {
  const [issueType, setIssueType] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { member } = useAuth();
  const { toast } = useToast();

  const issueTypes = [
    { value: 'content_violation', label: 'Content Policy Violation' },
    { value: 'copyright', label: 'Copyright Issue' },
    { value: 'broken_link', label: 'Broken or Invalid Link' },
    { value: 'inappropriate', label: 'Inappropriate Content' },
    { value: 'spam', label: 'Spam or Low Quality' },
    { value: 'other', label: 'Other Issue' }
  ];

  const handleSubmit = async () => {
    if (!issueType || !description.trim()) {
      toast({
        title: "Missing Information",
        description: "Please select an issue type and provide a description.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Create a complaint record
      const { error } = await supabase
        .from('complaints')
        .insert({
          email: member?.primary_email || '',
          song_url: assignment.submissions.track_url,
          notes: `Issue Type: ${issueTypes.find(t => t.value === issueType)?.label}\n\nDescription: ${description}\n\nReported by member: ${member?.name}\nAssignment ID: ${assignment.id}`,
          status: 'todo'
        });

      if (error) throw error;

      toast({
        title: "Issue Reported",
        description: "Your issue report has been submitted successfully. We'll review it shortly.",
      });

      // Reset form and close modal
      setIssueType('');
      setDescription('');
      onClose();
    } catch (error) {
      console.error('Error reporting issue:', error);
      toast({
        title: "Error",
        description: "Failed to submit issue report. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Report Issue
          </DialogTitle>
          <DialogDescription>
            Report a problem with the track "{assignment.submissions.artist_name}"
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Issue Type</Label>
            <Select value={issueType} onValueChange={setIssueType}>
              <SelectTrigger>
                <SelectValue placeholder="Select the type of issue" />
              </SelectTrigger>
              <SelectContent>
                {issueTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              placeholder="Please describe the issue in detail..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
            />
          </div>
          
          <div className="flex gap-2 pt-4">
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || !issueType || !description.trim()}
              className="flex-1"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Submit Report
                </>
              )}
            </Button>
            <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};