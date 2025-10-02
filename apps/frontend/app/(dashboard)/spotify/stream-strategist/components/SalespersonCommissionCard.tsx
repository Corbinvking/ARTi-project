import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { DollarSign, TrendingUp, Activity } from "lucide-react";
import { useSalespersonCommissionStats } from "../hooks/useSalespersonCampaigns";

export function SalespersonCommissionCard() {
  const { data: stats, isLoading } = useSalespersonCommissionStats();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Performance Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-muted-foreground">
            Loading performance data...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Performance Overview
        </CardTitle>
        <CardDescription>
          Your overall sales performance and key metrics
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <DollarSign className="h-4 w-4 text-green-600" />
              Total Commission
            </div>
            <div className="text-2xl font-bold text-green-600">
              ${(stats?.totalCommission || 0).toLocaleString()}
            </div>
            <div className="text-xs text-muted-foreground">
              20% of gross sales
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <TrendingUp className="h-4 w-4 text-blue-600" />
              Total Sales
            </div>
            <div className="text-2xl font-bold text-blue-600">
              ${(stats?.totalSales || 0).toLocaleString()}
            </div>
            <div className="text-xs text-muted-foreground">
              Across all campaigns
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Activity className="h-4 w-4 text-primary" />
              Active Campaigns
            </div>
            <div className="text-2xl font-bold text-primary">
              {stats?.activeCampaigns || 0}
            </div>
            <div className="text-xs text-muted-foreground">
              Currently running
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}







