import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCampaigns } from "../../hooks/useCampaigns";
import { useMemo } from "react";


const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
        <p className="text-sm font-medium text-foreground mb-2">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {entry.name}: {entry.value}
            {entry.dataKey === "viewVelocity" && "%"}
            {entry.dataKey === "engagementRatio" && "%"}
            {entry.dataKey === "goalCompletion" && "%"}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export const PerformanceTrends = () => {
  const { campaigns } = useCampaigns();

  const trendData = useMemo(() => {
    if (campaigns.length === 0) {
      return [
        { date: "No Data", viewVelocity: 0, engagementRatio: 0, goalCompletion: 0 },
      ];
    }

    // Calculate trend data from actual campaigns
    const activeCampaigns = campaigns.filter(c => c.status === 'active');
    const totalViews = activeCampaigns.reduce((sum, c) => sum + (c.current_views || 0), 0);
    const totalGoalViews = activeCampaigns.reduce((sum, c) => sum + (c.goal_views || 0), 0);
    const totalLikes = activeCampaigns.reduce((sum, c) => sum + (c.current_likes || 0), 0);
    const totalComments = activeCampaigns.reduce((sum, c) => sum + (c.current_comments || 0), 0);
    
    const goalCompletion = totalGoalViews > 0 ? Math.round((totalViews / totalGoalViews) * 100) : 0;
    const engagementRatio = totalViews > 0 ? Math.round(((totalLikes + totalComments) / totalViews) * 100 * 100) / 100 : 0;
    const viewVelocity = Math.min(100, Math.round((totalViews / Math.max(totalGoalViews, 1)) * 100));

    return [
      { date: "Current", viewVelocity, engagementRatio, goalCompletion },
    ];
  }, [campaigns]);

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <div className="w-2 h-2 bg-primary rounded-full"></div>
          Campaign Performance Overview
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={trendData}>
            <defs>
              <linearGradient id="viewVelocityGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.05}/>
              </linearGradient>
              <linearGradient id="engagementGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#22c55e" stopOpacity={0.4}/>
                <stop offset="95%" stopColor="#22c55e" stopOpacity={0.05}/>
              </linearGradient>
              <linearGradient id="goalGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4}/>
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.05}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis 
              dataKey="date" 
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
            />
            <YAxis 
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Area
              type="monotone"
              dataKey="viewVelocity"
              stroke="#3b82f6"
              strokeWidth={2}
              fill="url(#viewVelocityGradient)"
              name="View Velocity"
            />
            <Area
              type="monotone"
              dataKey="engagementRatio"
              stroke="#22c55e"
              strokeWidth={2}
              fill="url(#engagementGradient)"
              name="Engagement Ratio"
            />
            <Area
              type="monotone"
              dataKey="goalCompletion"
              stroke="#f59e0b"
              strokeWidth={2}
              fill="url(#goalGradient)"
              name="Goal Completion"
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};