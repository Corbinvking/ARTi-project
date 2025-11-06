import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus, Activity, AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { useCampaigns } from "../../hooks/useCampaigns";

interface MetricCardProps {
  title: string;
  value: string;
  trend?: string;
  status?: "excellent" | "good" | "moderate" | "poor" | "critical";
  icon: React.ReactNode;
}

const MetricCard = ({ title, value, trend, status = "good", icon }: MetricCardProps) => {
  const getTrendIcon = (trend?: string) => {
    if (!trend) return <Minus className="h-4 w-4 text-muted-foreground" />;
    const isPositive = trend.startsWith("+");
    return isPositive ? 
      <TrendingUp className="h-4 w-4 text-success" /> : 
      <TrendingDown className="h-4 w-4 text-destructive" />;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "excellent": return "border-l-health-excellent";
      case "good": return "border-l-health-good";
      case "moderate": return "border-l-health-moderate";
      case "poor": return "border-l-health-poor";
      case "critical": return "border-l-health-critical";
      default: return "border-l-primary";
    }
  };

  return (
    <Card className={`border-l-4 ${getStatusColor(status)} hover:shadow-md transition-all duration-200`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-xs font-medium text-muted-foreground">{title}</CardTitle>
        <div className="text-primary">{icon}</div>
      </CardHeader>
      <CardContent className="pb-2">
        <div className="flex items-center justify-between">
          <div className="text-xl font-bold text-foreground">{value}</div>
          {trend && (
            <div className="flex items-center space-x-1">
              {getTrendIcon(trend)}
              <span className={`text-xs font-medium ${trend.startsWith("+") ? "text-success" : "text-destructive"}`}>
                {trend}
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export const HealthMetricsGrid = () => {
  const { campaigns } = useCampaigns();

  // Calculate metrics from actual campaign data
  const activeCampaigns = campaigns.filter(c => c.status === 'active').length;
  const inFixerCampaigns = campaigns.filter(c => c.in_fixer).length;
  const stalledCampaigns = campaigns.filter(c => c.views_stalled).length;
  
  // Calculate overall health score
  const totalCampaigns = campaigns.length;
  const healthyScore = totalCampaigns > 0 ? 
    Math.round(((totalCampaigns - stalledCampaigns - inFixerCampaigns) / totalCampaigns) * 100) : 0;

  const getHealthStatus = (score: number) => {
    if (score >= 90) return "excellent";
    if (score >= 80) return "good";
    if (score >= 70) return "moderate";
    if (score >= 60) return "poor";
    return "critical";
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <MetricCard
        title="Overall Health Score"
        value={`${healthyScore}%`}
        status={getHealthStatus(healthyScore)}
        icon={<CheckCircle2 className="h-5 w-5" />}
      />
      <MetricCard
        title="Active Campaigns"
        value={activeCampaigns.toString()}
        status="good"
        icon={<Activity className="h-5 w-5" />}
      />
      <MetricCard
        title="In Ratio Fixer"
        value={inFixerCampaigns.toString()}
        status={inFixerCampaigns > 0 ? "moderate" : "good"}
        icon={<Clock className="h-5 w-5" />}
      />
      <MetricCard
        title="Views Stalled"
        value={stalledCampaigns.toString()}
        status={stalledCampaigns > 0 ? "critical" : "good"}
        icon={<AlertTriangle className="h-5 w-5" />}
      />
    </div>
  );
};