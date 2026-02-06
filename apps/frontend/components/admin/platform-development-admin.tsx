"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useAuth } from "@/hooks/use-auth"
import { supabase } from "@/lib/auth"
import {
  Bug,
  Lightbulb,
  CheckCircle2,
  Loader2,
  Circle,
  AlertCircle,
  ArrowUpCircle,
  Code2,
  Filter,
  Crosshair,
  MapPin,
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
  element_data: {
    selector: string
    tagName: string
    id: string | null
    classes: string[]
    textContent: string
    pageUrl: string
    boundingRect: { top: number; left: number; width: number; height: number }
    timestamp: string
  } | null
}

const formatDate = (value: string) => {
  const date = new Date(value)
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

export function PlatformDevelopmentAdmin() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [typeFilter, setTypeFilter] = useState<string>("all")

  const { data: reports = [], isLoading } = useQuery<Report[]>({
    queryKey: ["platform-dev-reports", "admin"],
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

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const updateData: Record<string, any> = { status }

      if (status === "complete") {
        updateData.completed_by = user?.id
        updateData.completed_at = new Date().toISOString()
      } else {
        updateData.completed_by = null
        updateData.completed_at = null
      }

      const { data, error } = await supabase
        .from("platform_development_reports")
        .update(updateData)
        .eq("id", id)
        .select()

      if (error) throw error

      // Supabase returns empty array if RLS blocked the update
      if (!data || data.length === 0) {
        throw new Error("Update was blocked. You may not have permission to modify this report.")
      }
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["platform-dev-reports"] })
      toast.success(`Report marked as ${variables.status.replace("_", " ")}`)
    },
    onError: (error) => {
      console.error("Failed to update report:", error)
      toast.error(error instanceof Error ? error.message : "Failed to update report status")
    },
  })

  const filteredReports = reports.filter((r) => {
    if (statusFilter !== "all" && r.status !== statusFilter) return false
    if (typeFilter !== "all" && r.type !== typeFilter) return false
    return true
  })

  const openCount = reports.filter((r) => r.status === "open").length
  const inProgressCount = reports.filter((r) => r.status === "in_progress").length
  const completeCount = reports.filter((r) => r.status === "complete").length

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Code2 className="h-5 w-5" />
              Platform Development Reports
            </CardTitle>
            <CardDescription>
              Manage bug reports and feature requests from operators.
              {" "}{openCount} open, {inProgressCount} in progress, {completeCount} complete.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="complete">Complete</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="bug">Bugs</SelectItem>
                <SelectItem value="feature_request">Features</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            Loading reports...
          </div>
        ) : filteredReports.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No reports found matching the current filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead className="min-w-[200px]">Title</TableHead>
                  <TableHead>Submitted By</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReports.map((report) => (
                  <TableRow key={report.id}>
                    <TableCell>
                      {report.type === "bug" ? (
                        <Badge variant="destructive" className="text-xs">
                          <Bug className="h-3 w-3 mr-1" />
                          Bug
                        </Badge>
                      ) : (
                        <Badge className="bg-purple-600 hover:bg-purple-700 text-xs">
                          <Lightbulb className="h-3 w-3 mr-1" />
                          Feature
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {report.priority === "high" && (
                          <AlertCircle className="h-4 w-4 text-red-500" />
                        )}
                        {report.priority === "medium" && (
                          <ArrowUpCircle className="h-4 w-4 text-yellow-500" />
                        )}
                        {report.priority === "low" && (
                          <Circle className="h-4 w-4 text-muted-foreground" />
                        )}
                        <span className="text-xs capitalize">{report.priority}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium text-sm">{report.title}</p>
                        {report.description && (
                          <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                            {report.description}
                          </p>
                        )}
                        {report.element_data && (
                          <div className="mt-1.5 rounded border border-primary/20 bg-primary/5 px-2 py-1.5">
                            <div className="flex items-center gap-1 text-[10px] font-medium text-primary mb-0.5">
                              <Crosshair className="h-2.5 w-2.5" />
                              Element
                            </div>
                            <p className="text-[10px] font-mono text-muted-foreground truncate max-w-[250px]" title={report.element_data.selector}>
                              {report.element_data.selector}
                            </p>
                            <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-muted-foreground">
                              <MapPin className="h-2.5 w-2.5 flex-shrink-0" />
                              <span className="truncate">{report.element_data.pageUrl}</span>
                              <span className="font-mono bg-muted px-1 rounded">
                                {report.element_data.tagName.toLowerCase()}
                              </span>
                            </div>
                            {report.element_data.textContent && (
                              <p className="text-[10px] text-muted-foreground italic truncate mt-0.5">
                                &ldquo;{report.element_data.textContent.slice(0, 60)}&rdquo;
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {report.submitted_by_name}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(report.created_at)}
                    </TableCell>
                    <TableCell>
                      {report.status === "open" && (
                        <Badge variant="outline" className="border-yellow-500/50 text-yellow-600 bg-yellow-500/10 text-xs">
                          <Circle className="h-3 w-3 mr-1" />
                          Open
                        </Badge>
                      )}
                      {report.status === "in_progress" && (
                        <Badge variant="outline" className="border-blue-500/50 text-blue-600 bg-blue-500/10 text-xs">
                          <Loader2 className="h-3 w-3 mr-1" />
                          In Progress
                        </Badge>
                      )}
                      {report.status === "complete" && (
                        <Badge variant="outline" className="border-green-500/50 text-green-600 bg-green-500/10 text-xs">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Complete
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {report.status === "open" && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs h-7"
                              onClick={() =>
                                updateStatus.mutate({ id: report.id, status: "in_progress" })
                              }
                              disabled={updateStatus.isPending}
                            >
                              Start
                            </Button>
                            <Button
                              size="sm"
                              variant="default"
                              className="text-xs h-7"
                              onClick={() =>
                                updateStatus.mutate({ id: report.id, status: "complete" })
                              }
                              disabled={updateStatus.isPending}
                            >
                              Complete
                            </Button>
                          </>
                        )}
                        {report.status === "in_progress" && (
                          <Button
                            size="sm"
                            variant="default"
                            className="text-xs h-7 bg-green-600 hover:bg-green-700"
                            onClick={() =>
                              updateStatus.mutate({ id: report.id, status: "complete" })
                            }
                            disabled={updateStatus.isPending}
                          >
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Mark Complete
                          </Button>
                        )}
                        {report.status === "complete" && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-xs h-7"
                            onClick={() =>
                              updateStatus.mutate({ id: report.id, status: "open" })
                            }
                            disabled={updateStatus.isPending}
                          >
                            Reopen
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
