"use client"

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, List, Plus, Filter, DollarSign, Music } from 'lucide-react';
import { UnifiedCalendar } from '../calendar/UnifiedCalendar';
import { EventList } from '../calendar/EventList';
import { CampaignIntakeForm } from './CampaignIntakeForm';
import { MemberSubmissionForm } from './MemberSubmissionForm';

export const PlannerPage = () => {
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [showCampaignForm, setShowCampaignForm] = useState(false);
  const [showSubmissionForm, setShowSubmissionForm] = useState(false);

  // Handle URL parameters for deep linking
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const formParam = urlParams.get('form');
    
    if (formParam === 'campaign') {
      setShowCampaignForm(true);
    } else if (formParam === 'member') {
      setShowSubmissionForm(true);
    }
  }, []);

  const handleFormsSuccess = () => {
    // Refresh data or trigger re-fetch
    // This will be called after successful form submission
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Planner</h1>
          <p className="text-muted-foreground">
            Revolutionary calendar/list unified view for all campaigns and queue items
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>
          <div className="flex gap-2">
            <Button
              size="sm"
              className="bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600"
              onClick={() => setShowCampaignForm(true)}
            >
              <DollarSign className="h-4 w-4 mr-2" />
              New Campaign
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="border-primary/20 bg-gradient-to-r from-primary/10 to-primary/5 hover:from-primary/20 hover:to-primary/10"
              onClick={() => setShowSubmissionForm(true)}
            >
              <Music className="h-4 w-4 mr-2" />
              Submit Track
            </Button>
          </div>
        </div>
      </div>

      {/* View Toggle */}
      <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as 'calendar' | 'list')}>
        <TabsList>
          <TabsTrigger value="calendar" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Calendar View
          </TabsTrigger>
          <TabsTrigger value="list" className="flex items-center gap-2">
            <List className="h-4 w-4" />
            List View
          </TabsTrigger>
        </TabsList>

        <TabsContent value="calendar" className="space-y-6">
          <UnifiedCalendar
            selectedDate={selectedDate}
            onDateSelect={setSelectedDate}
          />
        </TabsContent>

        <TabsContent value="list" className="space-y-6">
          <EventList selectedDate={selectedDate} />
        </TabsContent>
      </Tabs>

      {/* Intake Forms */}
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