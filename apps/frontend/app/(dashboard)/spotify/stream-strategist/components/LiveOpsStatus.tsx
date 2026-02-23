"use client"

import { Card, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";
import { Activity, AlertTriangle, Clock, DollarSign } from "lucide-react";
import { useOpsStatus } from "../hooks/useOpsStatus";
import { Skeleton } from "./ui/skeleton";

export function LiveOpsStatus() {
  const { data, isLoading } = useOpsStatus();

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);

  if (isLoading) {
    return (
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Live Ops Status</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const items = [
    {
      label: "Campaigns Running Today",
      value: data?.campaignsRunningToday ?? 0,
      icon: Activity,
      color: "text-green-600",
      bgColor: "bg-green-50 dark:bg-green-950/30",
    },
    {
      label: "Campaigns Needing Action",
      value: data?.campaignsNeedingAction ?? 0,
      icon: AlertTriangle,
      color: data?.campaignsNeedingAction ? "text-red-600" : "text-muted-foreground",
      bgColor: data?.campaignsNeedingAction ? "bg-red-50 dark:bg-red-950/30" : "bg-muted/50",
    },
    {
      label: "Vendors Awaiting Approval",
      value: data?.vendorsAwaitingApproval ?? 0,
      icon: Clock,
      color: data?.vendorsAwaitingApproval ? "text-yellow-600" : "text-muted-foreground",
      bgColor: data?.vendorsAwaitingApproval ? "bg-yellow-50 dark:bg-yellow-950/30" : "bg-muted/50",
    },
    {
      label: "Vendor Payouts Pending",
      value: formatCurrency(data?.vendorPayoutsPending ?? 0),
      icon: DollarSign,
      color: data?.vendorPayoutsPending ? "text-orange-600" : "text-muted-foreground",
      bgColor: data?.vendorPayoutsPending ? "bg-orange-50 dark:bg-orange-950/30" : "bg-muted/50",
    },
  ];

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Live Ops Status</h3>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.label} className={`${item.bgColor} border`}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Icon className={`h-4 w-4 ${item.color}`} />
                  <span className="text-xs font-medium text-muted-foreground">{item.label}</span>
                </div>
                <div className={`text-2xl font-bold ${item.color}`}>
                  {item.value}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
