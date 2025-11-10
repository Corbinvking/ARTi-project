"use client"

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Download, FileText, Calendar, Clock, Mail, Settings, Trash2 } from 'lucide-react';
import { useToast } from '../../hooks/use-toast';

interface ExportConfig {
  id: string;
  name: string;
  format: 'csv' | 'pdf' | 'json' | 'excel';
  reportType: string;
  schedule: 'manual' | 'daily' | 'weekly' | 'monthly';
  recipients: string[];
  lastExported: string;
  status: 'active' | 'paused' | 'error';
}

interface QuickExport {
  name: string;
  description: string;
  format: 'csv' | 'pdf' | 'json';
  icon: React.ComponentType<{ className?: string }>;
}

export const DataExportManager = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState<'csv' | 'pdf' | 'json' | 'excel'>('csv');
  const [selectedTimeRange, setSelectedTimeRange] = useState('30d');

  // Mock data for export configurations
  const exportConfigs: ExportConfig[] = [
    {
      id: '1',
      name: 'Weekly Revenue Report',
      format: 'pdf',
      reportType: 'revenue',
      schedule: 'weekly',
      recipients: ['admin@company.com', 'finance@company.com'],
      lastExported: '2024-01-15 09:00',
      status: 'active'
    },
    {
      id: '2',
      name: 'Member Analytics Export',
      format: 'csv',
      reportType: 'members',
      schedule: 'monthly',
      recipients: ['operations@company.com'],
      lastExported: '2024-01-01 08:30',
      status: 'active'
    },
    {
      id: '3',
      name: 'Campaign Performance Data',
      format: 'excel',
      reportType: 'campaigns',
      schedule: 'daily',
      recipients: ['marketing@company.com'],
      lastExported: '2024-01-16 06:00',
      status: 'paused'
    }
  ];

  const quickExports: QuickExport[] = [
    {
      name: 'Member Directory',
      description: 'Complete member list with status and metrics',
      format: 'csv',
      icon: FileText
    },
    {
      name: 'Revenue Summary',
      description: 'Financial performance and trends',
      format: 'pdf',
      icon: FileText
    },
    {
      name: 'Campaign Data',
      description: 'All campaign metrics and ROI data',
      format: 'json',
      icon: FileText
    },
    {
      name: 'Queue Analytics',
      description: 'Queue performance and completion rates',
      format: 'csv',
      icon: FileText
    }
  ];

  const handleQuickExport = async (exportType: string, format: string) => {
    setLoading(true);
    try {
      // Simulate API call for export
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast({
        title: "Export Generated",
        description: `${exportType} has been exported as ${format.toUpperCase()}`,
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "There was an error generating the export",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleScheduledExport = async (configId: string, action: 'run' | 'pause' | 'delete') => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast({
        title: "Export Updated",
        description: `Scheduled export has been ${action}ed successfully`,
      });
    } catch (error) {
      toast({
        title: "Update Failed",
        description: "There was an error updating the export",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      active: 'default',
      paused: 'secondary',
      error: 'destructive'
    } as const;
    
    return (
      <Badge variant={variants[status as keyof typeof variants] || 'secondary'}>
        {status}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Data Export Manager</h2>
        <p className="text-muted-foreground">
          Export analytics data and manage automated reporting schedules
        </p>
      </div>

      <Tabs defaultValue="quick-export" className="space-y-6">
        <TabsList>
          <TabsTrigger value="quick-export">Quick Export</TabsTrigger>
          <TabsTrigger value="scheduled">Scheduled Exports</TabsTrigger>
          <TabsTrigger value="create">Create Schedule</TabsTrigger>
        </TabsList>

        <TabsContent value="quick-export" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="h-5 w-5" />
                Quick Export
              </CardTitle>
              <CardDescription>
                Generate instant exports of your analytics data
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {quickExports.map((export_, index) => (
                  <Card key={index} className="cursor-pointer hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <export_.icon className="h-8 w-8 text-primary mt-1" />
                        <div className="flex-1">
                          <h4 className="font-semibold text-sm mb-1">{export_.name}</h4>
                          <p className="text-xs text-muted-foreground mb-3">{export_.description}</p>
                          <Button
                            size="sm"
                            variant="outline"
                            className="w-full"
                            disabled={loading}
                            onClick={() => handleQuickExport(export_.name, export_.format)}
                          >
                            Export {export_.format.toUpperCase()}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Separator className="my-6" />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="format">Export Format</Label>
                  <Select value={selectedFormat} onValueChange={(value: any) => setSelectedFormat(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="csv">CSV</SelectItem>
                      <SelectItem value="excel">Excel</SelectItem>
                      <SelectItem value="pdf">PDF</SelectItem>
                      <SelectItem value="json">JSON</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="timeRange">Time Range</Label>
                  <Select value={selectedTimeRange} onValueChange={setSelectedTimeRange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7d">Last 7 days</SelectItem>
                      <SelectItem value="30d">Last 30 days</SelectItem>
                      <SelectItem value="90d">Last 90 days</SelectItem>
                      <SelectItem value="1y">Last year</SelectItem>
                      <SelectItem value="all">All time</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-end">
                  <Button 
                    className="w-full"
                    disabled={loading}
                    onClick={() => handleQuickExport('Custom Export', selectedFormat)}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Generate Export
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="scheduled" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Scheduled Exports
              </CardTitle>
              <CardDescription>
                Manage automated report generation and delivery
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {exportConfigs.map((config) => (
                  <div key={config.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h4 className="font-semibold">{config.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {config.format.toUpperCase()} • {config.schedule} • {config.recipients.length} recipients
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(config.status)}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleScheduledExport(config.id, 'run')}
                        >
                          Run Now
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleScheduledExport(config.id, 'pause')}
                        >
                          {config.status === 'active' ? 'Pause' : 'Resume'}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleScheduledExport(config.id, 'delete')}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        Last exported: {config.lastExported}
                      </div>
                      <div className="flex items-center gap-1">
                        <Mail className="h-4 w-4" />
                        Recipients: {config.recipients.join(', ')}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="create" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Create Scheduled Export
              </CardTitle>
              <CardDescription>
                Set up automated report generation and delivery
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="reportName">Report Name</Label>
                    <Input id="reportName" placeholder="Enter report name" />
                  </div>
                  <div>
                    <Label htmlFor="reportType">Report Type</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select report type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="revenue">Revenue Analytics</SelectItem>
                        <SelectItem value="members">Member Analytics</SelectItem>
                        <SelectItem value="campaigns">Campaign Performance</SelectItem>
                        <SelectItem value="queue">Queue Analytics</SelectItem>
                        <SelectItem value="custom">Custom Report</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="format">Export Format</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select format" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="csv">CSV</SelectItem>
                        <SelectItem value="excel">Excel</SelectItem>
                        <SelectItem value="pdf">PDF Report</SelectItem>
                        <SelectItem value="json">JSON</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="schedule">Schedule</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select schedule" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="quarterly">Quarterly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="recipients">Email Recipients</Label>
                  <Input 
                    id="recipients" 
                    placeholder="Enter email addresses separated by commas" 
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Reports will be automatically sent to these recipients
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch id="compress" />
                  <Label htmlFor="compress">Compress large exports</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch id="notifications" />
                  <Label htmlFor="notifications">Send completion notifications</Label>
                </div>

                <Button className="w-full">
                  Create Scheduled Export
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};