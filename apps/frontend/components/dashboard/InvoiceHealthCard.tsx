import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Receipt, AlertTriangle } from "lucide-react"

interface InvoiceHealthCardProps {
  paidTotal: number
  outstandingTotal: number
  overdueTotal: number
  overdueCount: number
  onClick?: () => void
}

const fmt = (n: number) => {
  if (n >= 1000) return `$${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}K`
  return `$${n.toLocaleString()}`
}

export function InvoiceHealthCard({ paidTotal, outstandingTotal, overdueTotal, overdueCount, onClick }: InvoiceHealthCardProps) {
  const hasOverdue = overdueCount > 0

  return (
    <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={onClick}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">Invoice Status</CardTitle>
        {hasOverdue ? (
          <AlertTriangle className="h-4 w-4 text-red-500" />
        ) : (
          <Receipt className="h-4 w-4 text-muted-foreground" />
        )}
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Paid</span>
            <span className="text-sm font-semibold text-green-600">{fmt(paidTotal)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Outstanding</span>
            <span className="text-sm font-semibold text-yellow-600">{fmt(outstandingTotal)}</span>
          </div>
          {hasOverdue && (
            <div className="flex items-center justify-between pt-1 border-t">
              <span className="text-xs font-medium text-red-600">Overdue</span>
              <span className="text-sm font-bold text-red-600">
                {fmt(overdueTotal)} ({overdueCount})
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
