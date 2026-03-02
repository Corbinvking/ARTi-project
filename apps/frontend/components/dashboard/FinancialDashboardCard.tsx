"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  DollarSign,
  Receipt,
  AlertTriangle,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react"
import { useFinancialSummary } from "@/hooks/useQuickBooks"
import { Skeleton } from "@/components/ui/skeleton"

const fmt = (n: number) => {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `$${(n / 1_000).toFixed(n >= 10_000 ? 0 : 1)}K`
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

interface MetricProps {
  label: string
  value: string
  subValue?: string
  icon: React.ReactNode
  variant?: "default" | "success" | "warning" | "danger"
}

function Metric({ label, value, subValue, icon, variant = "default" }: MetricProps) {
  const colorMap = {
    default: "text-muted-foreground",
    success: "text-green-500",
    warning: "text-yellow-500",
    danger: "text-red-500",
  }
  const valueColorMap = {
    default: "text-foreground",
    success: "text-green-600",
    warning: "text-yellow-600",
    danger: "text-red-600",
  }

  return (
    <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
      <div className={`mt-0.5 ${colorMap[variant]}`}>{icon}</div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground truncate">{label}</p>
        <p className={`text-lg font-bold ${valueColorMap[variant]}`}>{value}</p>
        {subValue && (
          <p className="text-xs text-muted-foreground">{subValue}</p>
        )}
      </div>
    </div>
  )
}

export function FinancialDashboardCard() {
  const { data, isLoading, isError } = useFinancialSummary()

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Financial Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="p-3 rounded-lg bg-muted/50 space-y-2">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-6 w-16" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (isError || !data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Financial Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {!data?.connected
              ? "Connect QuickBooks to see financial data"
              : "Failed to load financial data"}
          </p>
        </CardContent>
      </Card>
    )
  }

  const hasOverdue = data.overdue_invoices.count > 0

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <DollarSign className="h-4 w-4" />
          Financial Overview
          {hasOverdue && (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600 bg-red-100 dark:bg-red-900/30 px-2 py-0.5 rounded-full">
              <AlertTriangle className="h-3 w-3" />
              {data.overdue_invoices.count} overdue
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          <Metric
            label="Unpaid Invoices"
            value={fmt(data.unpaid_invoices.total)}
            subValue={`${data.unpaid_invoices.count} invoice${data.unpaid_invoices.count !== 1 ? "s" : ""}`}
            icon={<Receipt className="h-4 w-4" />}
            variant={data.unpaid_invoices.count > 0 ? "warning" : "default"}
          />
          <Metric
            label="Paid This Week"
            value={fmt(data.paid_this_week.total)}
            subValue={`${data.paid_this_week.count} payment${data.paid_this_week.count !== 1 ? "s" : ""}`}
            icon={<TrendingUp className="h-4 w-4" />}
            variant="success"
          />
          <Metric
            label="Outstanding Receivables"
            value={fmt(data.outstanding_receivables)}
            icon={<DollarSign className="h-4 w-4" />}
            variant={data.outstanding_receivables > 0 ? "warning" : "default"}
          />
          <Metric
            label="Vendor Payouts Owed"
            value={fmt(data.vendor_payouts_owed.total)}
            subValue={`${data.vendor_payouts_owed.count} allocation${data.vendor_payouts_owed.count !== 1 ? "s" : ""}`}
            icon={<Users className="h-4 w-4" />}
            variant={data.vendor_payouts_owed.total > 0 ? "warning" : "default"}
          />
          <Metric
            label="Commissions Owed"
            value={fmt(data.commissions_owed.total)}
            subValue={`${data.commissions_owed.count} campaign${data.commissions_owed.count !== 1 ? "s" : ""}`}
            icon={<Wallet className="h-4 w-4" />}
            variant={data.commissions_owed.total > 0 ? "warning" : "default"}
          />
          {hasOverdue && (
            <Metric
              label="Overdue"
              value={fmt(data.overdue_invoices.total)}
              subValue={`${data.overdue_invoices.count} invoice${data.overdue_invoices.count !== 1 ? "s" : ""}`}
              icon={<AlertTriangle className="h-4 w-4" />}
              variant="danger"
            />
          )}
        </div>
      </CardContent>
    </Card>
  )
}
