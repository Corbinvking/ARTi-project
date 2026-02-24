import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
  Label,
  ZAxis,
} from "recharts";
import { useExecutiveDashboardData } from "../hooks/useExecutiveDashboardData";
import { Skeleton } from "./ui/skeleton";

const QUADRANT_COLORS: Record<string, string> = {
  ideal: "#22c55e",
  "low-output": "#3b82f6",
  expensive: "#f59e0b",
  review: "#ef4444",
};

const QUADRANT_LABELS: Record<string, string> = {
  ideal: "High Output / Low Cost",
  "low-output": "Low Output / Low Cost",
  expensive: "High Output / High Cost",
  review: "Low Output / High Cost",
};

export const PerformanceBenchmarkChart = () => {
  const { data, isLoading, error } = useExecutiveDashboardData();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Performance Benchmarks</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Performance Benchmarks</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-destructive">Failed to load benchmark data</p>
        </CardContent>
      </Card>
    );
  }

  const benchmarkData = [
    {
      metric: "Profit Margin",
      value: data.averageROI,
      format: 'percent' as const,
      description: "(Revenue - Vendor Costs) / Revenue",
      isGood: data.averageROI >= 50
    },
    {
      metric: "Goal Achievement",
      value: data.campaignEfficiency,
      format: 'percent' as const,
      description: "Actual streams vs campaign goals",
      isGood: data.campaignEfficiency >= 80
    },
    {
      metric: "Active Campaigns",
      value: data.activeCampaigns,
      format: 'number' as const,
      description: `${data.activeCampaigns} of ${data.totalCampaigns} total`,
      isGood: data.activeCampaigns > 0
    }
  ];

  const vendors = data.topPerformingVendors;
  const avgCost = vendors.length > 0
    ? vendors.reduce((sum, v) => sum + v.costPer1k, 0) / vendors.length
    : 0;
  const avgStreams = vendors.length > 0
    ? vendors.reduce((sum, v) => sum + v.totalStreams12m, 0) / vendors.length
    : 0;

  const quadrantData: Record<string, any[]> = {
    ideal: [], "low-output": [], expensive: [], review: [],
  };
  vendors.forEach(v => {
    const q = v.costPer1k <= avgCost
      ? (v.totalStreams12m >= avgStreams ? "ideal" : "low-output")
      : (v.totalStreams12m >= avgStreams ? "expensive" : "review");
    quadrantData[q].push({
      name: v.name,
      costPer1k: v.costPer1k,
      totalStreams12m: v.totalStreams12m,
      streamsK: v.totalStreams12m / 1000,
      activeCampaignCount: v.activeCampaignCount,
      approvalRate: v.approvalRate,
      totalPlaylists: v.totalPlaylists,
      quadrant: q,
      z: (v.activeCampaignCount || 1) * 100,
    });
  });

  const ScatterTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const d = payload[0]?.payload;
    if (!d) return null;
    return (
      <div className="bg-popover border rounded-lg shadow-lg p-3 text-sm space-y-1">
        <p className="font-semibold text-foreground">{d.name}</p>
        <div className="border-t pt-1 space-y-0.5">
          <p className="text-muted-foreground">Streams: <span className="font-medium text-foreground">{(d.totalStreams12m / 1000).toFixed(1)}K</span></p>
          <p className="text-muted-foreground">Cost/1K: <span className="font-medium text-foreground">${d.costPer1k.toFixed(2)}</span></p>
          {d.activeCampaignCount !== undefined && <p className="text-muted-foreground">Active Campaigns: <span className="font-medium text-foreground">{d.activeCampaignCount}</span></p>}
          <p className="text-muted-foreground">Quadrant: <span className="font-medium text-foreground">{QUADRANT_LABELS[d.quadrant]}</span></p>
        </div>
      </div>
    );
  };

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Campaign Status Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <p className="font-medium">Total Revenue</p>
                <p className="text-sm text-muted-foreground">Sum of all campaign budgets</p>
              </div>
              <div className="text-2xl font-bold text-green-600">
                ${data.totalRevenue.toLocaleString()}
              </div>
            </div>
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <p className="font-medium">Streams Delivered (12m)</p>
                <p className="text-sm text-muted-foreground">From vendor playlists only</p>
              </div>
              <div className="text-2xl font-bold text-blue-600">
                {data.totalStreamsPast30Days.toLocaleString()}
              </div>
            </div>
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <p className="font-medium">Avg Cost per 1K Streams</p>
                <p className="text-sm text-muted-foreground">Based on vendor rates</p>
              </div>
              <div className="text-2xl font-bold text-purple-600">
                ${data.averageCostPer1kStreams.toFixed(2)}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Vendor Performance Analysis</CardTitle>
          <CardDescription>
            Cost per 1K vs streams delivered — bottom-right = ideal vendors
          </CardDescription>
        </CardHeader>
        <CardContent>
          {vendors.length > 0 ? (
            <>
              <div className="flex flex-wrap gap-3 mb-3 text-xs">
                {Object.entries(QUADRANT_LABELS).map(([key, label]) => (
                  <span key={key} className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: QUADRANT_COLORS[key] }} />
                    {label}
                  </span>
                ))}
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <ScatterChart margin={{ top: 10, right: 10, bottom: 20, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis type="number" dataKey="costPer1k" tick={{ fontSize: 10 }} tickFormatter={(v) => `$${v}`} name="Cost/1K">
                    <Label value="Cost per 1K ($)" position="bottom" offset={5} style={{ fontSize: 10, fill: "#888" }} />
                  </XAxis>
                  <YAxis type="number" dataKey="streamsK" tick={{ fontSize: 10 }} tickFormatter={(v) => `${v}K`} name="Streams">
                    <Label value="Streams (K)" angle={-90} position="insideLeft" offset={0} style={{ fontSize: 10, fill: "#888" }} />
                  </YAxis>
                  <ZAxis type="number" dataKey="z" range={[60, 300]} />
                  <Tooltip content={<ScatterTooltip />} cursor={{ strokeDasharray: "3 3" }} />
                  {avgCost > 0 && (
                    <ReferenceLine x={avgCost} stroke="#888" strokeDasharray="4 4" strokeWidth={1} />
                  )}
                  {avgStreams > 0 && (
                    <ReferenceLine y={avgStreams / 1000} stroke="#888" strokeDasharray="4 4" strokeWidth={1} />
                  )}
                  {Object.entries(quadrantData).map(([q, d]) =>
                    d.length > 0 ? (
                      <Scatter key={q} data={d} fill={QUADRANT_COLORS[q]} fillOpacity={0.85} stroke="#fff" strokeWidth={1} />
                    ) : null
                  )}
                </ScatterChart>
              </ResponsiveContainer>
            </>
          ) : (
            <p className="text-sm text-muted-foreground py-4">No vendor data available</p>
          )}
        </CardContent>
      </Card>

      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle>Key Performance Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {benchmarkData.map((item) => (
              <div key={item.metric} className={`text-center p-4 border rounded-lg ${
                item.isGood ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/20' : 'border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950/20'
              }`}>
                <h3 className="font-medium text-sm text-muted-foreground">{item.metric}</h3>
                <div className="mt-2 space-y-1">
                  <div className={`text-2xl font-bold ${item.isGood ? 'text-green-600' : 'text-orange-600'}`}>
                    {item.format === 'percent' ? `${item.value.toFixed(1)}%` : item.value.toLocaleString()}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {item.description}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};







