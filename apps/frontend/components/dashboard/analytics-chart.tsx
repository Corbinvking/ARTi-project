"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"

const chartData = [
  { name: "Jan", engagement: 65, followers: 1200 },
  { name: "Feb", engagement: 72, followers: 1350 },
  { name: "Mar", engagement: 68, followers: 1480 },
  { name: "Apr", engagement: 85, followers: 1620 },
  { name: "May", engagement: 92, followers: 1850 },
  { name: "Jun", engagement: 88, followers: 2100 },
]

export function AnalyticsChart() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Engagement Trends</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="name" className="text-muted-foreground" fontSize={12} />
            <YAxis className="text-muted-foreground" fontSize={12} />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "6px",
              }}
            />
            <Line
              type="monotone"
              dataKey="engagement"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              dot={{ fill: "hsl(var(--primary))" }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
