"use client"

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DollarSign, Calendar, Users, Activity, TrendingUp, AlertTriangle, Music, Link, Copy } from 'lucide-react';
import { CampaignIntakeForm } from './CampaignIntakeForm';
import { MemberSubmissionForm } from './MemberSubmissionForm';
import { useToast } from '@/hooks/use-toast';

const UnifiedOverview = () => {
  const [showCampaignForm, setShowCampaignForm] = useState(false);
  const [showSubmissionForm, setShowSubmissionForm] = useState(false);
  const { toast } = useToast();

  const handleCopyLink = async (formType: 'campaign' | 'member') => {
    const baseUrl = window.location.origin;
    const link = formType === 'campaign' 
      ? `${baseUrl}/soundcloud/dashboard/planner?form=${formType}`
      : `${baseUrl}/soundcloud/submit`; // Public member submission form
    
    try {
      await navigator.clipboard.writeText(link);
      toast({
        title: "Link copied!",
        description: `${formType === 'campaign' ? 'Campaign intake' : 'Member submission'} form link copied to clipboard.`,
      });
    } catch (err) {
      toast({
        title: "Failed to copy",
        description: "Could not copy link to clipboard.",
        variant: "destructive",
      });
    }
  };

  const handleFormsSuccess = () => {
    // Refresh data or trigger re-fetch if needed
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Dashboard Overview</h1>
        <p className="text-muted-foreground">
          Unified view of revenue, campaigns, credits, and system health
        </p>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${(45231).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              +20.1% from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Campaigns</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              23
            </div>
            <p className="text-xs text-muted-foreground">
              12 paid, 11 free queue
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              573
            </div>
            <p className="text-xs text-muted-foreground">
              +180 this month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Health</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">98.2%</div>
            <p className="text-xs text-muted-foreground">
              3 warnings active
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Intake Forms - Quick Actions */}
      <Card className="bg-gradient-to-br from-card to-muted border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Intake Forms
          </CardTitle>
          <CardDescription>
            Open forms directly or copy links to share with members and clients
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Campaign Intake Form */}
            <div className="group relative overflow-hidden rounded-lg border border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10 p-4 transition-all hover:border-primary/40 hover:shadow-lg hover:shadow-primary/20">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="h-5 w-5 text-primary" />
                    <h3 className="font-semibold text-foreground">Campaign Intake</h3>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    Submit new paid campaign requests from clients
                  </p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="bg-gradient-to-r from-primary to-primary-glow hover:from-primary-glow hover:to-primary"
                      onClick={() => setShowCampaignForm(true)}
                    >
                      Open Form
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-primary/30 hover:bg-primary/10"
                      onClick={() => handleCopyLink('campaign')}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Member Submission Form */}
            <div className="group relative overflow-hidden rounded-lg border border-accent/20 bg-gradient-to-br from-accent/5 to-accent/10 p-4 transition-all hover:border-accent/40 hover:shadow-lg hover:shadow-accent/20">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Music className="h-5 w-5 text-accent" />
                    <h3 className="font-semibold text-foreground">Member Submission</h3>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    Submit tracks for free queue support
                  </p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="bg-gradient-to-r from-accent to-accent hover:from-accent/90 hover:to-accent/90"
                      onClick={() => setShowSubmissionForm(true)}
                    >
                      Open Form
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-accent/30 hover:bg-accent/10"
                      onClick={() => handleCopyLink('member')}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions & Alerts */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Recent Activity
            </CardTitle>
            <CardDescription>
              Latest system activities and updates
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-green-500 rounded-full mt-2" />
              <div className="flex-1">
                <p className="text-sm font-medium">Campaign "Summer Vibes" completed</p>
                <p className="text-xs text-muted-foreground">2 minutes ago</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-blue-500 rounded-full mt-2" />
              <div className="flex-1">
                <p className="text-sm font-medium">15 new member applications</p>
                <p className="text-xs text-muted-foreground">1 hour ago</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2" />
              <div className="flex-1">
                <p className="text-sm font-medium">Credit system maintenance scheduled</p>
                <p className="text-xs text-muted-foreground">3 hours ago</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              System Alerts
            </CardTitle>
            <CardDescription>
              Items requiring attention
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
              <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-yellow-800">3 SoundCloud connections failed</p>
                <p className="text-xs text-yellow-600">Check member integrations</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <Activity className="h-4 w-4 text-blue-600 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-blue-800">47 untagged members</p>
                <p className="text-xs text-blue-600">Genre classification pending</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-orange-50 rounded-lg border border-orange-200">
              <Calendar className="h-4 w-4 text-orange-600 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-orange-800">Queue capacity at 85%</p>
                <p className="text-xs text-orange-600">Consider expanding targets</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Intake Form Modals */}
      <CampaignIntakeForm
        open={showCampaignForm}
        onOpenChange={setShowCampaignForm}
        onSuccess={handleFormsSuccess}
      />
      
      <MemberSubmissionForm
        open={showSubmissionForm}
        onOpenChange={setShowSubmissionForm}
        onSuccess={handleFormsSuccess}
      />
    </div>
  );
};

export default UnifiedOverview;