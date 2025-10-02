import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { useROIAnalytics } from "../hooks/useROIAnalytics";
import { TrendingUp, TrendingDown, AlertTriangle } from "lucide-react";

export const BudgetOptimizationPanel = () => {
  const { data, isLoading } = useROIAnalytics();

  if (isLoading || !data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Budget Optimization</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Loading optimization data...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Budget Optimization Recommendations</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Underperforming Campaigns */}
          <div>
            <h4 className="font-medium text-sm mb-3 flex items-center">
              <AlertTriangle className="h-4 w-4 text-amber-500 mr-2" />
              At Risk Campaigns ({data.budgetOptimization.underperformingCampaigns.length})
            </h4>
            <div className="space-y-2">
              {data.budgetOptimization.underperformingCampaigns.slice(0, 3).map((campaign) => (
                <div key={campaign.campaignId} className="flex items-center justify-between p-2 border rounded">
                  <div className="flex-1">
                    <p className="font-medium text-sm">{campaign.campaignName}</p>
                    <p className="text-xs text-muted-foreground">{campaign.recommendedAction}</p>
                  </div>
                  <Badge variant="destructive">
                    <TrendingDown className="h-3 w-3 mr-1" />
                    ${campaign.budgetWaste.toFixed(0)} waste
                  </Badge>
                </div>
              ))}
            </div>
          </div>

          {/* Overperforming Vendors */}
          <div>
            <h4 className="font-medium text-sm mb-3 flex items-center">
              <TrendingUp className="h-4 w-4 text-green-500 mr-2" />
              Growth Opportunities ({data.budgetOptimization.overperformingVendors.length})
            </h4>
            <div className="space-y-2">
              {data.budgetOptimization.overperformingVendors.slice(0, 3).map((vendor) => (
                <div key={vendor.vendorId} className="flex items-center justify-between p-2 border rounded">
                  <div className="flex-1">
                    <p className="font-medium text-sm">{vendor.vendorName}</p>
                    <p className="text-xs text-muted-foreground">
                      Recommended increase: ${vendor.recommendedIncrease.toLocaleString()}
                    </p>
                  </div>
                  <Badge variant="default">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    +{vendor.potentialIncreaseROI}% ROI
                  </Badge>
                </div>
              ))}
            </div>
          </div>

          <div className="flex space-x-2 pt-2">
            <Button size="sm">Apply Recommendations</Button>
            <Button variant="outline" size="sm">Export Report</Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};







