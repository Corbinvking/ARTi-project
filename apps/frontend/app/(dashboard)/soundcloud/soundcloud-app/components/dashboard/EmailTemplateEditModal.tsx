"use client"

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useToast } from '../../hooks/use-toast';
import { Save, X } from 'lucide-react';

interface EmailTemplate {
  id: string;
  name: string;
  description: string;
  subject: string;
  content: string;
  category: string;
  enabled: boolean;
  lastSent?: string;
}

interface EmailTemplateEditModalProps {
  template: EmailTemplate | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (template: EmailTemplate) => void;
}

export const EmailTemplateEditModal: React.FC<EmailTemplateEditModalProps> = ({
  template,
  open,
  onOpenChange,
  onSave
}) => {
  const [formData, setFormData] = useState<EmailTemplate>({
    id: template?.id || '',
    name: template?.name || '',
    description: template?.description || '',
    subject: template?.subject || '',
    content: template?.content || '',
    category: template?.category || '',
    enabled: template?.enabled || false,
    lastSent: template?.lastSent
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  React.useEffect(() => {
    if (template) {
      setFormData({
        id: template.id,
        name: template.name,
        description: template.description,
        subject: template.subject || '',
        content: template.content || '',
        category: template.category,
        enabled: template.enabled,
        lastSent: template.lastSent
      });
    }
  }, [template]);

  const handleSave = async () => {
    if (!formData.name.trim() || !formData.subject.trim() || !formData.content.trim()) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      onSave(formData);
      onOpenChange(false);
      
      toast({
        title: "Template Updated",
        description: "Email template has been successfully updated"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update template",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof EmailTemplate, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const getDefaultContent = (category: string) => {
    switch (category) {
      case 'submission':
        return `Hi {{member_name}},

Thank you for your track submission! We've received "{{track_name}}" and it's now in our review queue.

Next steps:
- Our team will review your submission within 2-3 business days
- You'll receive an email notification with the outcome
- If approved, your track will be added to our promotional queue

Track Details:
- Title: {{track_name}}
- Artist: {{artist_name}}
- Submitted: {{submission_date}}

Best regards,
The Team`;

      case 'approval':
        return `Congratulations {{member_name}}!

Great news! Your track "{{track_name}}" has been approved for our promotional support.

What happens next:
- Your track is now in our active promotion queue
- We'll begin featuring it across our channels
- You'll receive regular updates on performance metrics

Track Details:
- Title: {{track_name}}
- Artist: {{artist_name}}
- Approved: {{approval_date}}

Thanks for being part of our community!

Best regards,
The Team`;

      case 'weekly':
        return `Hi {{member_name}},

Here's your weekly summary of activity and opportunities:

This Week's Highlights:
- {{tracks_promoted}} tracks promoted
- {{new_followers}} new followers gained
- {{engagement_score}} engagement score

Upcoming Opportunities:
- {{upcoming_campaigns}} new campaigns available
- {{queue_position}} position in promotional queue

Keep up the great work!

Best regards,
The Team`;

      case 'welcome':
        return `Welcome to our community, {{member_name}}!

We're excited to have you on board. Here's everything you need to know to get started:

Getting Started:
1. Complete your profile setup
2. Submit your first track for review
3. Explore our promotional opportunities

What's Next:
- Browse our submission guidelines
- Connect with other members
- Start building your presence

Welcome aboard!

Best regards,
The Team`;

      default:
        return '';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Edit Email Template
            {formData.category && (
              <Badge variant="outline" className="text-xs">
                {formData.category}
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Template Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Enter template name"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                checked={formData.enabled}
                onCheckedChange={(checked) => handleInputChange('enabled', checked)}
              />
              <Label>Template Enabled</Label>
            </div>
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Brief description of when this template is used"
            />
          </div>

          <div>
            <Label htmlFor="subject">Email Subject</Label>
            <Input
              id="subject"
              value={formData.subject}
              onChange={(e) => handleInputChange('subject', e.target.value)}
              placeholder="Email subject line (can include {{variables}})"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label htmlFor="content">Email Content</Label>
              {!formData.content && formData.category && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleInputChange('content', getDefaultContent(formData.category))}
                >
                  Load Default Content
                </Button>
              )}
            </div>
            <Textarea
              id="content"
              value={formData.content}
              onChange={(e) => handleInputChange('content', e.target.value)}
              placeholder="Email content with HTML support (can include {{variables}})"
              rows={12}
            />
          </div>

          <div className="bg-muted/20 p-3 rounded-lg">
            <h4 className="text-sm font-medium mb-2">Available Variables:</h4>
            <div className="text-xs text-muted-foreground space-y-1">
              <p><code>{'{{member_name}}'}</code> - Member's name</p>
              <p><code>{'{{track_name}}'}</code> - Track title</p>
              <p><code>{'{{artist_name}}'}</code> - Artist name</p>
              <p><code>{'{{submission_date}}'}</code> - Date submitted</p>
              <p><code>{'{{approval_date}}'}</code> - Date approved</p>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={loading}>
              <Save className="h-4 w-4 mr-2" />
              {loading ? 'Saving...' : 'Save Template'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};