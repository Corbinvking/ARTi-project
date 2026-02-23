"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  CartesianGrid,
  Cell,
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

const COLORS = {
  streams: "#6366f1",
  cost: "#f97316",
  barIdeal: "#22c55e",
  barAcceptable: "#6366f1",
  barReview: "#ef4444",
};

function getBarColor(costPer1k: number, avgCost: number) {
  if (costPer1k <= avgCost * 0.85) return COLORS.barIdeal;
  if (costPer1k <= avgCost * 1.15) return COLORS.barAcceptable;
  return COLORS.barReview;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const data = payload[0]?.payload;
  return (
    <div className="bg-popover border rounded-lg shadow-lg p-3 text-sm space-y-1">
      <p className="font-semibold text-foreground">{label}</p>
      <div className="border-t pt-1 space-y-0.5">
        <p className="text-muted-foreground">
          Streams: <span className="font-medium text-foreground">{((data?.totalStreams12m || 0) / 1000).toFixed(1)}K</span>
        </p>
        <p className="text-muted-foreground">
          Cost/1K: <span className="font-medium text-foreground">${(data?.costPer1k || 0).toFixed(2)}</span>
        </p>
        {data?.activeCampaignCount !== undefined && (
          <p className="text-muted-foreground">
            Active Campaigns: <span className="font-medium text-foreground">{data.activeCampaignCount}</span>
          </p>
        )}
        {data?.approvalRate !== undefined && (
          <p className="text-muted-foreground">
            Approval Rate: <span className="font-medium text-foreground">{data.approvalRate.toFixed(0)}%</span>
          </p>
        )}
        {data?.totalPlaylists !== undefined && (
          <p className="text-muted-foreground">
            Playlists: <span className="font-medium text-foreground">{data.totalPlaylists}</span>
          </p>
        )}
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

  const chartData = vendors
    .sort((a, b) => b.totalStreams12m - a.totalStreams12m)
    .map(v => ({
      ...v,
      shortName: v.name.length > 12 ? v.name.slice(0, 11) + "…" : v.name,
      streamsK: Math.round(v.totalStreams12m / 1000),
    }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Vendor Performance Analysis</CardTitle>
        <CardDescription>
          Streams delivered (bars) vs Cost per 1K (line) — high bars with low cost line = ideal vendors
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-4 mb-4 text-xs">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-green-500 inline-block" /> Under target CPM
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-indigo-500 inline-block" /> Acceptable CPM
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-red-500 inline-block" /> Over target CPM
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-1 rounded bg-orange-500 inline-block" /> Cost/1K trend
          </span>
        </div>
        <ResponsiveContainer width="100%" height={380}>
          <ComposedChart
            data={chartData}
            margin={{ top: 10, right: 30, bottom: 60, left: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
            <XAxis
              dataKey="shortName"
              tick={{ fontSize: 11 }}
              angle={-35}
              textAnchor="end"
              interval={0}
              height={70}
            />
            <YAxis
              yAxisId="streams"
              tick={{ fontSize: 11 }}
              tickFormatter={(v) => `${v}K`}
              label={{
                value: "Streams (K)",
                angle: -90,
                position: "insideLeft",
                offset: 0,
                style: { fontSize: 11, fill: "#888" },
              }}
            />
            <YAxis
              yAxisId="cost"
              orientation="right"
              tick={{ fontSize: 11 }}
              tickFormatter={(v) => `$${v}`}
              label={{
                value: "Cost / 1K ($)",
                angle: 90,
                position: "insideRight",
                offset: 10,
                style: { fontSize: 11, fill: "#888" },
              }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              verticalAlign="top"
              wrapperStyle={{ fontSize: 12, paddingBottom: 8 }}
            />
            <Bar
              yAxisId="streams"
              dataKey="streamsK"
              name="Streams Delivered (K)"
              radius={[4, 4, 0, 0]}
              barSize={36}
            >
              {chartData.map((entry, index) => (
                <Cell
                  key={index}
                  fill={getBarColor(entry.costPer1k, avgCost)}
                  fillOpacity={0.85}
                />
              ))}
            </Bar>
            <Line
              yAxisId="cost"
              type="monotone"
              dataKey="costPer1k"
              name="Cost per 1K ($)"
              stroke={COLORS.cost}
              strokeWidth={2.5}
              dot={{ r: 5, fill: COLORS.cost, strokeWidth: 2, stroke: "#fff" }}
              activeDot={{ r: 7 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
