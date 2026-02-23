"use client"

import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { AlertTriangle, Clock, Music } from "lucide-react";
import { useOpsStatus } from "../hooks/useOpsStatus";
import { Skeleton } from "./ui/skeleton";

export function AttentionRequiredPanel() {
  const { data, isLoading } = useOpsStatus();

  if (isLoading) {
    return (
      <Card className="border-orange-200 dark:border-orange-800">
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-4 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const items = [
    {
      icon: AlertTriangle,
      label: "campaigns below pacing",
      count: data?.campaignsBelowPacing ?? 0,
      color: "text-red-600",
    },
    {
      icon: Clock,
      label: "vendors unpaid >14 days",
      count: data?.vendorsUnpaid14d ?? 0,
      color: "text-orange-600",
    },
    {
      icon: Music,
      label: "campaigns with no playlist adds in 72h",
      count: data?.campaignsNoPlaylistAdds72h ?? 0,
      color: "text-yellow-600",
    },
  ];

  const totalIssues = items.reduce((sum, item) => sum + item.count, 0);

  return (
    <Card className={totalIssues > 0 ? "border-orange-300 dark:border-orange-700 bg-orange-50/50 dark:bg-orange-950/20" : ""}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <AlertTriangle className={`h-4 w-4 ${totalIssues > 0 ? "text-orange-500" : "text-muted-foreground"}`} />
          Attention Required
          {totalIssues > 0 && (
            <span className="text-xs font-normal text-orange-600 bg-orange-100 dark:bg-orange-900/50 px-2 py-0.5 rounded-full">
              {totalIssues} {totalIssues === 1 ? "issue" : "issues"}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {totalIssues === 0 ? (
          <p className="text-sm text-muted-foreground">All clear — no items require attention.</p>
        ) : (
          <div className="space-y-2">
            {items.filter(item => item.count > 0).map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="flex items-center gap-2 text-sm">
                  <Icon className={`h-4 w-4 ${item.color}`} />
                  <span className={`font-bold ${item.color}`}>{item.count}</span>
                  <span className="text-muted-foreground">{item.label}</span>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
