import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCampaigns } from "../../hooks/useCampaigns";

interface CampaignHealthChartProps {
  onHealthFilterChange?: (filter: 'healthy' | 'at-risk' | 'critical' | null) => void;
  activeHealthFilter?: 'healthy' | 'at-risk' | 'critical' | null;
}

export const CampaignHealthChart = ({ onHealthFilterChange, activeHealthFilter }: CampaignHealthChartProps = {}) => {
  const { campaigns } = useCampaigns();

  const calculateHealthScore = (campaign: any): number => {
    let score = 50;
    const viewsProgress = campaign.goal_views > 0 ? (campaign.current_views || 0) / campaign.goal_views : 0;
    score += viewsProgress * 30;
    if (campaign.status === 'active') score += 10;
    if (!campaign.views_stalled) score += 10;
    if (!campaign.in_fixer) score += 5;
    return Math.min(100, Math.max(0, Math.round(score)));
  };

  const scores = campaigns.map(calculateHealthScore);
  const healthy = scores.filter((s) => s >= 75).length;
  const atRisk = scores.filter((s) => s >= 60 && s < 75).length;
  const critical = scores.filter((s) => s < 60).length;
  const total = campaigns.length || 1;

  const healthData = [
    { name: "Healthy", value: healthy, color: "hsl(var(--health-excellent))", filter: "healthy" as const },
    { name: "At Risk", value: atRisk, color: "hsl(var(--health-moderate))", filter: "at-risk" as const },
    { name: "Critical", value: critical, color: "hsl(var(--health-critical))", filter: "critical" as const },
  ];

  const handlePieClick = (data: any) => {
    if (onHealthFilterChange) {
      const currentFilter = data.filter;
      // Toggle filter - if same filter clicked, clear it
      const newFilter = activeHealthFilter === currentFilter ? null : currentFilter;
      onHealthFilterChange(newFilter);
    }
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const percent = ((data.value / (total || 1)) * 100).toFixed(1);
      return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
          <p className="text-sm font-medium text-foreground">{data.name}</p>
          <p className="text-sm text-muted-foreground">
            {data.value} campaigns ({percent}%)
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <div className="w-2 h-2 bg-primary rounded-full"></div>
          Campaign Health Overview
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie
              data={healthData}
              cx="50%"
              cy="50%"
              innerRadius={40}
              outerRadius={70}
              paddingAngle={2}
              dataKey="value"
              onClick={handlePieClick}
              style={{ cursor: 'pointer' }}
            >
              {healthData.map((entry, index) => {
                const isActive = activeHealthFilter === entry.filter;
                const opacity = activeHealthFilter ? (isActive ? 1 : 0.6) : 1;
                return (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.color} 
                    stroke={isActive ? "hsl(var(--primary))" : "none"}
                    strokeWidth={isActive ? 2 : 0}
                    style={{ opacity }}
                  />
                );
              })}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend
              verticalAlign="bottom"
              height={36}
              formatter={(value) => (
                <span className="text-sm text-foreground">{value}</span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
        
        <div className="mt-4 space-y-2">
          {healthData.map((item, index) => {
            const isActive = activeHealthFilter === item.filter;
            return (
              <div 
                key={index} 
                className={`flex items-center justify-between text-sm cursor-pointer hover:bg-muted/50 p-2 rounded transition-colors ${
                  isActive ? 'bg-muted border border-primary' : ''
                }`}
                onClick={() => handlePieClick(item)}
              >
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-foreground">{item.name}</span>
                  {isActive && (
                    <span className="text-xs text-primary font-medium">(Active Filter)</span>
                  )}
                </div>
                <span className="text-muted-foreground font-medium">{item.value}</span>
              </div>
            );
          })}
          {activeHealthFilter && (
            <div className="text-xs text-muted-foreground text-center pt-2 border-t">
              Click any section again to clear filter
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};