import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { ExecutiveDashboardData } from "../hooks/useExecutiveDashboardData";
import { TrendingUp, TrendingDown, Activity, DollarSign, Target, Users, Calendar, Plus } from "lucide-react";

interface ExecutiveKPICardsProps {
  data: ExecutiveDashboardData;
}

export const ExecutiveKPICards = ({ data }: ExecutiveKPICardsProps) => {
  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);

  const formatNumber = (value: number) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
    return value.toString();
  };

  const getTrendIcon = (value: number) => {
    if (value > 0) return <TrendingUp className="h-4 w-4 text-green-600" />;
    if (value < 0) return <TrendingDown className="h-4 w-4 text-red-600" />;
    return <Activity className="h-4 w-4 text-muted-foreground" />;
  };

  const getTrendColor = (value: number) => {
    if (value > 0) return "text-green-600";
    if (value < 0) return "text-red-600";
    return "text-muted-foreground";
  };

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Campaigns</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{data.totalCampaigns}</div>
          <div className="flex items-center justify-between mt-1">
            <p className="text-xs text-muted-foreground">All campaigns</p>
            <Badge variant="secondary" className="text-xs">
              {data.activeCampaigns} active
            </Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Streams Past 30 Days</CardTitle>
          <Calendar className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatNumber(data.totalStreamsPast30Days)}</div>
          <p className="text-xs text-muted-foreground mt-1">
            Total streams driven
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Campaigns Added (30d)</CardTitle>
          <Plus className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{data.campaignsAddedPast30Days}</div>
          <p className="text-xs text-muted-foreground mt-1">
            New campaigns this month
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Campaign Growth MoM</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            <span className={`flex items-center ${getTrendColor(data.monthOverMonthGrowth.campaigns)}`}>
              {getTrendIcon(data.monthOverMonthGrowth.campaigns)}
              <span className="ml-1">
                {data.monthOverMonthGrowth.campaigns >= 0 ? '+' : ''}{data.monthOverMonthGrowth.campaigns.toFixed(1)}%
              </span>
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Campaign count growth
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Campaign Efficiency</CardTitle>
          <Target className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            <Badge 
              variant={data.campaignEfficiency >= 80 ? "default" : data.campaignEfficiency >= 60 ? "secondary" : "destructive"}
              className="text-lg font-bold px-2 py-1"
            >
              {data.campaignEfficiency.toFixed(1)}%
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Campaigns completed on time
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Avg Cost per 1K Streams</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">${data.averageCostPer1kStreams.toFixed(2)}</div>
          <p className="text-xs text-muted-foreground mt-1">
            Average campaign cost
          </p>
        </CardContent>
      </Card>
    </div>
  );
};







