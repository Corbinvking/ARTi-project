"use client"

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

interface VendorDataPoint {
  name: string;
  costPer1k: number;
  totalStreams12m: number;
  activeCampaignCount?: number;
  approvalRate?: number;
  totalPlaylists?: number;
}

interface VendorPerformanceChartProps {
  vendors: VendorDataPoint[];
}

function getQuadrant(costPer1k: number, streams: number, avgCost: number, avgStreams: number) {
  if (costPer1k <= avgCost && streams >= avgStreams) return "ideal";
  if (costPer1k <= avgCost && streams < avgStreams) return "low-output";
  if (costPer1k > avgCost && streams >= avgStreams) return "expensive";
  return "review";
}

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

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const data = payload[0]?.payload;
  if (!data) return null;
  return (
    <div className="bg-popover border rounded-lg shadow-lg p-3 text-sm space-y-1">
      <p className="font-semibold text-foreground">{data.name}</p>
      <div className="border-t pt-1 space-y-0.5">
        <p className="text-muted-foreground">
          Streams: <span className="font-medium text-foreground">{((data.totalStreams12m || 0) / 1000).toFixed(1)}K</span>
        </p>
        <p className="text-muted-foreground">
          Cost/1K: <span className="font-medium text-foreground">${(data.costPer1k || 0).toFixed(2)}</span>
        </p>
        {data.activeCampaignCount !== undefined && (
          <p className="text-muted-foreground">
            Active Campaigns: <span className="font-medium text-foreground">{data.activeCampaignCount}</span>
          </p>
        )}
        {data.approvalRate !== undefined && (
          <p className="text-muted-foreground">
            Approval Rate: <span className="font-medium text-foreground">{data.approvalRate.toFixed(0)}%</span>
          </p>
        )}
        {data.totalPlaylists !== undefined && (
          <p className="text-muted-foreground">
            Playlists: <span className="font-medium text-foreground">{data.totalPlaylists}</span>
          </p>
        )}
        <p className="text-muted-foreground">
          Quadrant: <span className="font-medium text-foreground">{QUADRANT_LABELS[data.quadrant]}</span>
        </p>
      </div>
    </div>
  );
};

export function VendorScatterPlot({ vendors }: VendorPerformanceChartProps) {
  if (!vendors.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Vendor Performance Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No vendor data available</p>
        </CardContent>
      </Card>
    );
  }

  const avgCost = vendors.reduce((sum, v) => sum + v.costPer1k, 0) / vendors.length;
  const avgStreams = vendors.reduce((sum, v) => sum + v.totalStreams12m, 0) / vendors.length;

  const quadrantData: Record<string, any[]> = {
    ideal: [],
    "low-output": [],
    expensive: [],
    review: [],
  };

  vendors.forEach(v => {
    const quadrant = getQuadrant(v.costPer1k, v.totalStreams12m, avgCost, avgStreams);
    quadrantData[quadrant].push({
      ...v,
      quadrant,
      streamsK: v.totalStreams12m / 1000,
      z: (v.activeCampaignCount || 1) * 100,
    });
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Vendor Performance Analysis</CardTitle>
        <CardDescription>
          Cost per 1K streams vs streams delivered — bottom-right quadrant = ideal vendors
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-4 mb-4 text-xs">
          {Object.entries(QUADRANT_LABELS).map(([key, label]) => (
            <span key={key} className="flex items-center gap-1.5">
              <span
                className="w-3 h-3 rounded-full inline-block"
                style={{ backgroundColor: QUADRANT_COLORS[key] }}
              />
              {label}
            </span>
          ))}
        </div>
        <ResponsiveContainer width="100%" height={380}>
          <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
            <XAxis
              type="number"
              dataKey="costPer1k"
              tick={{ fontSize: 11 }}
              tickFormatter={(v) => `$${v}`}
              name="Cost per 1K"
            >
              <Label value="Cost per 1K Streams ($)" position="bottom" offset={5} style={{ fontSize: 11, fill: "#888" }} />
            </XAxis>
            <YAxis
              type="number"
              dataKey="streamsK"
              tick={{ fontSize: 11 }}
              tickFormatter={(v) => `${v}K`}
              name="Streams"
            >
              <Label value="Streams Delivered (K)" angle={-90} position="insideLeft" offset={0} style={{ fontSize: 11, fill: "#888" }} />
            </YAxis>
            <ZAxis type="number" dataKey="z" range={[80, 400]} />
            <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: "3 3" }} />
            <ReferenceLine
              x={avgCost}
              stroke="#888"
              strokeDasharray="4 4"
              strokeWidth={1}
              label={{ value: `Avg $${avgCost.toFixed(1)}`, position: "top", fontSize: 10, fill: "#888" }}
            />
            <ReferenceLine
              y={avgStreams / 1000}
              stroke="#888"
              strokeDasharray="4 4"
              strokeWidth={1}
              label={{ value: `Avg ${(avgStreams / 1000).toFixed(0)}K`, position: "right", fontSize: 10, fill: "#888" }}
            />
            {Object.entries(quadrantData).map(([quadrant, data]) =>
              data.length > 0 ? (
                <Scatter
                  key={quadrant}
                  name={QUADRANT_LABELS[quadrant]}
                  data={data}
                  fill={QUADRANT_COLORS[quadrant]}
                  fillOpacity={0.85}
                  strokeWidth={1}
                  stroke="#fff"
                />
              ) : null
            )}
          </ScatterChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
