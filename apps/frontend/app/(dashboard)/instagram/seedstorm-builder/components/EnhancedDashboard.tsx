import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Activity, Zap, TrendingUp, AlertTriangle, Brain } from "lucide-react";

import { CampaignHealthDashboard } from "./CampaignHealthDashboard";
import { QuickActionsPanel } from "./QuickActionsPanel";
import { ProgressTrackingPipeline } from "./ProgressTrackingPipeline";
import { DashboardWidgets } from "./DashboardWidgets";
import { SmartRecommendations } from "./SmartRecommendations";
import { PredictiveAnalytics } from "./PredictiveAnalytics";
import { CreatorScoring } from "./CreatorScoring";
import { MLDashboard } from "./MLDashboard";

import { Creator, Campaign } from "../lib/types";

interface EnhancedDashboardProps {
  creators: any[];
  campaigns: any[];
  onCampaignClick?: (campaign: any) => void;
}

export const EnhancedDashboard = ({ creators, campaigns, onCampaignClick }: EnhancedDashboardProps) => {
  return (
    <div className="space-y-6">
      {/* Command Center Header */}
      <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-accent/5 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl">
            <Activity className="h-6 w-6 text-primary" />
            Campaign Command Center
            <div className="ml-auto flex items-center gap-2">
              <div className="h-2 w-2 bg-success rounded-full animate-pulse"></div>
              <span className="text-sm text-muted-foreground">Live Dashboard</span>
            </div>
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Main Dashboard Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="intelligence" className="flex items-center gap-2">
            <Brain className="h-4 w-4" />
            Intelligence
          </TabsTrigger>
          <TabsTrigger value="health" className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Health
          </TabsTrigger>
          <TabsTrigger value="actions" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Actions
          </TabsTrigger>
          <TabsTrigger value="pipeline" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Pipeline
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab - Enhanced with Creator Scoring */}
        <TabsContent value="overview" className="space-y-6">
          <DashboardWidgets 
            creators={creators} 
            campaigns={campaigns} 
            onCampaignClick={onCampaignClick}
          />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SmartRecommendations 
              creators={creators} 
              campaigns={campaigns}
            />
            <CreatorScoring 
              creators={creators}
              campaigns={campaigns}
            />
          </div>
        </TabsContent>

        {/* Intelligence Tab - AI Predictions and Analytics */}
        <TabsContent value="intelligence" className="space-y-6">
          <Tabs defaultValue="predictions" className="space-y-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="predictions">Predictions</TabsTrigger>
              <TabsTrigger value="ml-dashboard">ML System</TabsTrigger>
            </TabsList>
            
            <TabsContent value="predictions">
              <PredictiveAnalytics 
                creators={creators}
                campaigns={campaigns}
              />
            </TabsContent>
            
            <TabsContent value="ml-dashboard">
              <MLDashboard 
                creators={creators}
                campaigns={campaigns}
              />
            </TabsContent>
          </Tabs>
        </TabsContent>

        {/* Health Tab - Campaign Health Dashboard */}
        <TabsContent value="health">
          <CampaignHealthDashboard />
        </TabsContent>

        {/* Actions Tab - Quick Actions Panel */}
        <TabsContent value="actions" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <QuickActionsPanel />
            <div className="space-y-6">
              {/* Additional action components can go here */}
              <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5 text-primary" />
                    Automation Hub
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8">
                    <Zap className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                    <p className="text-muted-foreground">Automated workflows coming soon</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Set up rules for automatic status updates and notifications
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Pipeline Tab - Progress Tracking */}
        <TabsContent value="pipeline">
          <ProgressTrackingPipeline />
        </TabsContent>
      </Tabs>
    </div>
  );
};