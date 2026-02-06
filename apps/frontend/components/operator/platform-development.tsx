"use client"

import { useQuery } from "@tanstack/react-query"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { supabase } from "@/lib/auth"
import { ReportForm } from "./report-form"
import {
  Bug,
  Lightbulb,
  Clock,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ArrowUpCircle,
  Circle,
} from "lucide-react"

type Report = {
  id: string
  type: "bug" | "feature_request"
  title: string
  description: string
  status: "open" | "in_progress" | "complete"
  priority: "low" | "medium" | "high"
  submitted_by: string
  submitted_by_name: string
  completed_by: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
}

const formatDate = (value: string) => {
  const date = new Date(value)
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

const formatRelativeTime = (value: string) => {
  const date = new Date(value)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return "Today"
  if (diffDays === 1) return "Yesterday"
  if (diffDays < 7) return `${diffDays} days ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
  return formatDate(value)
}

const StatusBadge = ({ status }: { status: Report["status"] }) => {
  switch (status) {
    case "open":
      return (
        <Badge variant="outline" className="border-yellow-500/50 text-yellow-600 bg-yellow-500/10">
          <Circle className="h-3 w-3 mr-1" />
          Open
        </Badge>
      )
    case "in_progress":
      return (
        <Badge variant="outline" className="border-blue-500/50 text-blue-600 bg-blue-500/10">
          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
          In Progress
        </Badge>
      )
    case "complete":
      return (
        <Badge variant="outline" className="border-green-500/50 text-green-600 bg-green-500/10">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Complete
        </Badge>
      )
  }
}

const TypeBadge = ({ type }: { type: Report["type"] }) => {
  if (type === "bug") {
    return (
      <Badge variant="destructive" className="text-xs">
        <Bug className="h-3 w-3 mr-1" />
        Bug
      </Badge>
    )
  }
  return (
    <Badge className="bg-purple-600 hover:bg-purple-700 text-xs">
      <Lightbulb className="h-3 w-3 mr-1" />
      Feature
    </Badge>
  )
}

const PriorityIcon = ({ priority }: { priority: Report["priority"] }) => {
  switch (priority) {
    case "high":
      return <AlertCircle className="h-4 w-4 text-red-500" />
    case "medium":
      return <ArrowUpCircle className="h-4 w-4 text-yellow-500" />
    case "low":
      return <Circle className="h-4 w-4 text-muted-foreground" />
  }
}

export function PlatformDevelopment() {
  const { data: reports = [], isLoading } = useQuery<Report[]>({
    queryKey: ["platform-dev-reports"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("platform_development_reports")
        .select("*")
        .order("created_at", { ascending: false })

      if (error) throw error
      return (data || []) as Report[]
    },
    staleTime: 15000,
  })

  const openCount = reports.filter((r) => r.status === "open").length
  const inProgressCount = reports.filter((r) => r.status === "in_progress").length
  const completeCount = reports.filter((r) => r.status === "complete").length
  const bugCount = reports.filter((r) => r.type === "bug").length
  const featureCount = reports.filter((r) => r.type === "feature_request").length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-muted-foreground">
            Report bugs and request features. Track platform development progress.
          </p>
        </div>
        <ReportForm />
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="border">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-yellow-600">{openCount}</div>
            <div className="text-xs text-muted-foreground">Open</div>
          </CardContent>
        </Card>
        <Card className="border">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{inProgressCount}</div>
            <div className="text-xs text-muted-foreground">In Progress</div>
          </CardContent>
        </Card>
        <Card className="border">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{completeCount}</div>
            <div className="text-xs text-muted-foreground">Complete</div>
          </CardContent>
        </Card>
        <Card className="border">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-red-600">{bugCount}</div>
            <div className="text-xs text-muted-foreground">Bugs</div>
          </CardContent>
        </Card>
        <Card className="border">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">{featureCount}</div>
            <div className="text-xs text-muted-foreground">Features</div>
          </CardContent>
        </Card>
      </div>

      {/* Reports Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Development Timeline
          </CardTitle>
          <CardDescription>
            All reports sorted by most recent. {reports.length} total reports.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              Loading reports...
            </div>
          ) : reports.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Bug className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p className="font-medium">No reports yet</p>
              <p className="text-sm">Click "New Report" to submit a bug fix or feature request.</p>
            </div>
          ) : (
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-[19px] top-0 bottom-0 w-px bg-border" />

              <div className="space-y-0">
                {reports.map((report, index) => (
                  <div key={report.id} className="relative flex gap-4 pb-6 last:pb-0">
                    {/* Timeline dot */}
                    <div className="relative z-10 flex-shrink-0 mt-1">
                      <div
                        className={`h-[10px] w-[10px] rounded-full ring-4 ring-background ${
                          report.status === "complete"
                            ? "bg-green-500"
                            : report.status === "in_progress"
                            ? "bg-blue-500"
                            : "bg-yellow-500"
                        }`}
                      />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 bg-muted/30 rounded-lg p-4 border border-border/50">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <TypeBadge type={report.type} />
                          <StatusBadge status={report.status} />
                          <PriorityIcon priority={report.priority} />
                        </div>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {formatRelativeTime(report.created_at)}
                        </span>
                      </div>

                      <h4 className="font-semibold text-sm mb-1">{report.title}</h4>

                      {report.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {report.description}
                        </p>
                      )}

                      <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
                        <span>
                          Submitted by <span className="font-medium text-foreground">{report.submitted_by_name}</span>
                        </span>
                        {report.completed_at && (
                          <span>
                            Completed {formatDate(report.completed_at)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
