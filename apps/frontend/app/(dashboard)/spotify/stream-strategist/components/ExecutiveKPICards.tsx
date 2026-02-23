import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { ExecutiveDashboardData } from "../hooks/useExecutiveDashboardData";
import { Target, DollarSign, Users, Calendar, AlertTriangle, TrendingUp } from "lucide-react";

interface ExecutiveKPICardsProps {
  data: ExecutiveDashboardData;
}

export const ExecutiveKPICards = ({ data }: ExecutiveKPICardsProps) => {
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);

  const formatNumber = (value: number) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
    return value.toString();
  };

  const getPacingColor = (value: number) => {
    if (value >= 80) return "bg-green-500";
    if (value >= 60) return "bg-yellow-500";
    return "bg-red-500";
  };

  const getPacingTextColor = (value: number) => {
    if (value >= 80) return "text-green-600";
    if (value >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  return (
    <div className="space-y-4">
      {/* Primary KPI Row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Campaigns</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalCampaigns}</div>
            <div className="flex items-center justify-between mt-1">
              <p className="text-xs text-muted-foreground">All campaigns</p>
              <Badge variant="secondary" className="text-xs">
                {data.activeCampaigns} active
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Streams Delivered (30d)</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(data.totalStreamsPast30Days)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Vendor-delivered streams
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Cost per 1K Streams</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${data.averageCostPer1kStreams.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Based on vendor rates
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Campaign Efficiency</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              <Badge
                className={`text-lg font-bold px-2 py-1 text-white ${getPacingColor(data.campaignPacingEfficiency)}`}
              >
                {data.campaignPacingEfficiency.toFixed(0)}%
              </Badge>
            </div>
            <p className={`text-xs mt-1 ${getPacingTextColor(data.campaignPacingEfficiency)}`}>
              Active campaigns on pace
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Financial Snapshot + Vendor Liability Row */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              Financial Snapshot (30d)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Revenue</p>
                <p className="text-lg font-bold">{formatCurrency(data.revenue30d)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Vendor Cost</p>
                <p className="text-lg font-bold">{formatCurrency(data.vendorCost30d)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Gross Margin</p>
                <p className={`text-lg font-bold ${data.grossMarginPct >= 30 ? "text-green-600" : data.grossMarginPct >= 15 ? "text-yellow-600" : "text-red-600"}`}>
                  {data.grossMarginPct.toFixed(1)}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              Vendor Liability
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Approved, Unpaid</p>
                <p className={`text-lg font-bold ${data.vendorLiability.approvedUnpaid > 0 ? "text-orange-600" : ""}`}>
                  {formatCurrency(data.vendorLiability.approvedUnpaid)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Awaiting Verification</p>
                <p className={`text-lg font-bold ${data.vendorLiability.awaitingVerification > 0 ? "text-yellow-600" : ""}`}>
                  {formatCurrency(data.vendorLiability.awaitingVerification)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
