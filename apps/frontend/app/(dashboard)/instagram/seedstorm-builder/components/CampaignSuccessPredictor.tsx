import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Target, 
  TrendingUp, 
  Users, 
  Calendar,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Info
} from "lucide-react";
import { Creator, Campaign } from "../lib/types";
import { CampaignManagementDashboard } from "../components/CampaignManagementDashboard";

interface CampaignSuccessPredictorProps {
  creators: Creator[];
  campaigns: Campaign[];
}

export const CampaignSuccessPredictor = ({ creators, campaigns }: CampaignSuccessPredictorProps) => {
  return (
    <div className="space-y-6">
      {/* Deprecation Notice */}
      <Card className="border-warning/50 bg-warning/5">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-warning mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-medium text-foreground mb-1">Feature Updated</h3>
              <p className="text-sm text-muted-foreground mb-3">
                The Campaign Success Predictor has been replaced with practical campaign management tools. 
                The new dashboard focuses on actionable metrics instead of speculative predictions.
              </p>
              <p className="text-sm text-muted-foreground">
                Success probability and ROI predictions have been removed as they were not based on actual historical data.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* New Management Dashboard */}
      <CampaignManagementDashboard creators={creators} campaigns={campaigns} />
    </div>
  );
};