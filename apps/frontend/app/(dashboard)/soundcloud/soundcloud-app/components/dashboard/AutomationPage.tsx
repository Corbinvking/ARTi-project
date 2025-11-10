"use client"

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '../../hooks/use-toast';
import { EmailTemplateEditModal } from './EmailTemplateEditModal';
import { 
  Zap, 
  Mail, 
  Settings, 
  Activity, 
  CheckCircle, 
  XCircle,
  Clock,
  Plus,
  Edit
} from 'lucide-react';

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

export const AutomationPage = () => {
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const { toast } = useToast();

  const mockTemplates: EmailTemplate[] = [
    {
      id: 'template_1',
      name: 'Submission Confirmation',
      description: 'Sent when member submits a track for review',
      subject: 'Track Submission Received - {{track_name}}',
      content: 'Your track submission has been received...',
      category: 'submission',
      enabled: true,
      lastSent: '2 hours ago'
    },
    {
      id: 'template_2',
      name: 'Support Confirmation',
      description: 'Sent when submission is approved for support',
      subject: 'Congratulations! {{track_name}} Approved',
      content: 'Great news! Your track has been approved...',
      category: 'approval',
      enabled: true,
      lastSent: '4 hours ago'
    },
    {
      id: 'template_3',
      name: 'Weekly Digest',
      description: 'Weekly summary for members (currently disabled)',
      subject: 'Your Weekly Music Summary',
      content: 'Here\'s what happened this week...',
      category: 'weekly',
      enabled: false,
      lastSent: '1 week ago'
    },
    {
      id: 'template_4',
      name: 'Welcome Email',
      description: 'Sent when new member is admitted to the community',
      subject: 'Welcome to Our Music Community!',
      content: 'Welcome to our community! Here\'s how to get started...',
      category: 'welcome',
      enabled: true,
      lastSent: '1 day ago'
    }
  ];

  const handleEditTemplate = (template: EmailTemplate) => {
    setEditingTemplate(template);
  };

  const handleSaveTemplate = (updatedTemplate: EmailTemplate) => {
    toast({
      title: "Template Updated",
      description: `${updatedTemplate.name} has been updated successfully`
    });
    // In a real app, you would update the template in your backend/state
  };

  const handleNewTemplate = () => {
    toast({
      title: "Create Template",
      description: "Template creation feature coming soon!"
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Automation</h1>
          <p className="text-muted-foreground">
            Email templates with on/off toggles and execution logs
          </p>
        </div>
        <Button onClick={handleNewTemplate}>
          <Plus className="h-4 w-4 mr-2" />
          New Template
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Templates</CardTitle>
            <Zap className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
            <p className="text-xs text-muted-foreground">
              3 disabled
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Emails Sent Today</CardTitle>
            <Mail className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">247</div>
            <p className="text-xs text-muted-foreground">
              +23% from yesterday
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">98.7%</div>
            <p className="text-xs text-muted-foreground">
              Last 24 hours
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed Sends</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">3</div>
            <p className="text-xs text-muted-foreground">
              Requires attention
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="templates" className="space-y-4">
        <TabsList>
          <TabsTrigger value="templates" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Email Templates
          </TabsTrigger>
          <TabsTrigger value="logs" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Execution Logs
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Email Templates</CardTitle>
              <CardDescription>
                Manage automated email templates and their activation status
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mockTemplates.map((template) => (
                  <div key={template.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <Switch defaultChecked={template.enabled} />
                      <div>
                        <h3 className="font-medium">{template.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {template.description}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant={template.enabled ? "secondary" : "outline"}>
                            {template.category}
                          </Badge>
                          {template.lastSent && (
                            <span className="text-xs text-muted-foreground">
                              Last sent: {template.lastSent}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleEditTemplate(template)}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Execution Logs</CardTitle>
              <CardDescription>
                Real-time log of automated email executions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <div>
                      <p className="font-medium">Submission Confirmation</p>
                      <p className="text-sm text-muted-foreground">
                        Sent to member@example.com • Template: submission-confirmation
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">Success</p>
                    <p className="text-xs text-muted-foreground">2 minutes ago</p>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <div>
                      <p className="font-medium">Support Confirmation</p>
                      <p className="text-sm text-muted-foreground">
                        Sent to artist@music.com • Template: support-confirmation
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">Success</p>
                    <p className="text-xs text-muted-foreground">15 minutes ago</p>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <XCircle className="h-4 w-4 text-red-500" />
                    <div>
                      <p className="font-medium">Welcome Email</p>
                      <p className="text-sm text-muted-foreground">
                        Failed to send to invalid@email • Template: welcome-admission
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">Failed</p>
                    <p className="text-xs text-muted-foreground">1 hour ago</p>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Clock className="h-4 w-4 text-yellow-500" />
                    <div>
                      <p className="font-medium">Weekly Digest</p>
                      <p className="text-sm text-muted-foreground">
                        Queued for batch delivery • Template: weekly-digest
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">Pending</p>
                    <p className="text-xs text-muted-foreground">Scheduled for 6 PM</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Automation Settings</CardTitle>
              <CardDescription>
                Configure global automation preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">Global Email Sending</h3>
                  <p className="text-sm text-muted-foreground">
                    Master switch for all automated emails
                  </p>
                </div>
                <Switch defaultChecked />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">Retry Failed Emails</h3>
                  <p className="text-sm text-muted-foreground">
                    Automatically retry failed email deliveries
                  </p>
                </div>
                <Switch defaultChecked />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">Rate Limiting</h3>
                  <p className="text-sm text-muted-foreground">
                    Prevent spam by limiting email frequency
                  </p>
                </div>
                <Switch defaultChecked />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">Delivery Reports</h3>
                  <p className="text-sm text-muted-foreground">
                    Daily summary of email delivery status
                  </p>
                </div>
                <Switch />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <EmailTemplateEditModal
        template={editingTemplate}
        open={!!editingTemplate}
        onOpenChange={(open) => !open && setEditingTemplate(null)}
        onSave={handleSaveTemplate}
      />
    </div>
  );
};