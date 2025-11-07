'use client'

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Activity, Zap, TrendingUp, AlertTriangle, Brain } from "lucide-react";
import { cn } from "@/lib/utils";

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
  const [activeTab, setActiveTab] = useState("overview");
  const [intelligenceSubTab, setIntelligenceSubTab] = useState("predictions");

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
      <div className="space-y-6">
        <div className="inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground w-full">
          <Button
            variant="ghost"
            onClick={() => setActiveTab("overview")}
            className={cn(
              "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 flex-1 gap-2",
              activeTab === "overview" && "bg-background text-foreground shadow-sm"
            )}
          >
            <TrendingUp className="h-4 w-4" />
            Overview
          </Button>
          <Button
            variant="ghost"
            onClick={() => setActiveTab("intelligence")}
            className={cn(
              "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 flex-1 gap-2",
              activeTab === "intelligence" && "bg-background text-foreground shadow-sm"
            )}
          >
            <Brain className="h-4 w-4" />
            Intelligence
          </Button>
          <Button
            variant="ghost"
            onClick={() => setActiveTab("health")}
            className={cn(
              "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 flex-1 gap-2",
              activeTab === "health" && "bg-background text-foreground shadow-sm"
            )}
          >
            <AlertTriangle className="h-4 w-4" />
            Health
          </Button>
          <Button
            variant="ghost"
            onClick={() => setActiveTab("actions")}
            className={cn(
              "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 flex-1 gap-2",
              activeTab === "actions" && "bg-background text-foreground shadow-sm"
            )}
          >
            <Zap className="h-4 w-4" />
            Actions
          </Button>
          <Button
            variant="ghost"
            onClick={() => setActiveTab("pipeline")}
            className={cn(
              "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 flex-1 gap-2",
              activeTab === "pipeline" && "bg-background text-foreground shadow-sm"
            )}
          >
            <Activity className="h-4 w-4" />
            Pipeline
          </Button>
        </div>

        {/* Overview Tab - Enhanced with Creator Scoring */}
        {activeTab === "overview" && (
          <div className="space-y-6">
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
          </div>
        )}

        {/* Intelligence Tab - AI Predictions and Analytics */}
        {activeTab === "intelligence" && (
          <div className="space-y-6">
            <div className="inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground w-full">
              <Button
                variant="ghost"
                onClick={() => setIntelligenceSubTab("predictions")}
                className={cn(
                  "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 flex-1",
                  intelligenceSubTab === "predictions" && "bg-background text-foreground shadow-sm"
                )}
              >
                Predictions
              </Button>
              <Button
                variant="ghost"
                onClick={() => setIntelligenceSubTab("ml-dashboard")}
                className={cn(
                  "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 flex-1",
                  intelligenceSubTab === "ml-dashboard" && "bg-background text-foreground shadow-sm"
                )}
              >
                ML System
              </Button>
            </div>
            
            {intelligenceSubTab === "predictions" && (
              <PredictiveAnalytics 
                creators={creators}
                campaigns={campaigns}
              />
            )}
            
            {intelligenceSubTab === "ml-dashboard" && (
              <MLDashboard 
                creators={creators}
                campaigns={campaigns}
              />
            )}
          </div>
        )}

        {/* Health Tab - Campaign Health Dashboard */}
        {activeTab === "health" && (
          <CampaignHealthDashboard />
        )}

        {/* Actions Tab - Quick Actions Panel */}
        {activeTab === "actions" && (
          <div className="space-y-6">
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
          </div>
        )}

        {/* Pipeline Tab - Progress Tracking */}
        {activeTab === "pipeline" && (
          <ProgressTrackingPipeline />
        )}
      </div>
    </div>
  );
};