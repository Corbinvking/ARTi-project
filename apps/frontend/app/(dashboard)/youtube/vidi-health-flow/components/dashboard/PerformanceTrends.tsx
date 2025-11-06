import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
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
          <LineChart data={trendData}>
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
            <Line
              type="monotone"
              dataKey="viewVelocity"
              stroke="hsl(var(--chart-1))"
              strokeWidth={2}
              name="View Velocity"
              dot={{ fill: "hsl(var(--chart-1))", strokeWidth: 2, r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="engagementRatio"
              stroke="hsl(var(--chart-2))"
              strokeWidth={2}
              name="Engagement Ratio"
              dot={{ fill: "hsl(var(--chart-2))", strokeWidth: 2, r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="goalCompletion"
              stroke="hsl(var(--chart-3))"
              strokeWidth={2}
              name="Goal Completion"
              dot={{ fill: "hsl(var(--chart-3))", strokeWidth: 2, r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};