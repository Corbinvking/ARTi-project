"use client"

import { useState, useEffect } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useAuth } from "@/hooks/use-auth"
import { supabase } from "@/lib/auth"
import { Plus, X, Crosshair, MapPin, ExternalLink } from "lucide-react"
import { toast } from "sonner"
import type { ElementData } from "./element-picker"

interface ReportFormProps {
  /** When provided, controls the dialog open state externally */
  externalOpen?: boolean
  /** Callback when the external dialog open state changes */
  onExternalOpenChange?: (open: boolean) => void
  /** Pre-attached element data from the Element Picker */
  elementData?: ElementData | null
  /** Called when the element data attachment is cleared */
  onClearElementData?: () => void
  /** If true, hides the trigger button (used when opened externally) */
  hideTrigger?: boolean
}

export function ReportForm({
  externalOpen,
  onExternalOpenChange,
  elementData,
  onClearElementData,
  hideTrigger = false,
}: ReportFormProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [type, setType] = useState<"bug" | "feature_request">("bug")
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium")
  const { user } = useAuth()
  const queryClient = useQueryClient()

  // Determine whether we are controlled externally or internally
  const isControlled = externalOpen !== undefined
  const open = isControlled ? externalOpen : internalOpen
  const setOpen = isControlled
    ? (v: boolean) => onExternalOpenChange?.(v)
    : setInternalOpen

  const createReport = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not authenticated")

      const insertData: Record<string, any> = {
        type,
        title,
        description,
        priority,
        status: "open",
        submitted_by: user.id,
        submitted_by_name: user.name || user.email,
      }

      if (elementData) {
        insertData.element_data = elementData
      }

      const { data: rows, error } = await supabase
        .from("platform_development_reports")
        .insert(insertData)
        .select("id")

      if (error) throw error

      const reportId = rows?.[0]?.id

      // Bridge to GitHub Issues pipeline
      try {
        const apiBase = process.env.NEXT_PUBLIC_API_URL || ""
        const url = apiBase ? `${apiBase}/api/github-issues` : "/api/github-issues"

        const ghResponse = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type,
            title,
            description,
            priority,
            submittedByName: user.name || user.email,
            elementData: elementData || null,
            supabaseReportId: reportId || null,
          }),
        })

        if (ghResponse.ok) {
          const ghData = await ghResponse.json()

          if (ghData.issueUrl && reportId) {
            await supabase
              .from("platform_development_reports")
              .update({ github_issue_url: ghData.issueUrl })
              .eq("id", reportId)
          }

          toast.success("Report submitted", {
            description: `GitHub issue #${ghData.issueNumber} created`,
            action: ghData.issueUrl
              ? { label: "View Issue", onClick: () => window.open(ghData.issueUrl, "_blank") }
              : undefined,
          })
        }
      } catch (ghError) {
        console.error("GitHub issue creation failed (report still saved):", ghError)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platform-dev-reports"] })
      setOpen(false)
      resetForm()
    },
  })

  const resetForm = () => {
    setTitle("")
    setDescription("")
    setType("bug")
    setPriority("medium")
    onClearElementData?.()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!hideTrigger && (
        <DialogTrigger asChild>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Report
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Submit a Report</DialogTitle>
          <DialogDescription>
            Report a bug or request a new feature for platform development.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {/* Element Data Preview */}
          {elementData && (
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 text-xs font-medium text-primary">
                  <Crosshair className="h-3.5 w-3.5 flex-shrink-0" />
                  Element Attached
                </div>
                <button
                  onClick={() => onClearElementData?.()}
                  className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="mt-2 space-y-1.5">
                <p className="text-xs font-mono text-muted-foreground break-all leading-relaxed" title={elementData.selector}>
                  {elementData.selector}
                </p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                  <MapPin className="h-3 w-3 flex-shrink-0" />
                  <span>{elementData.pageUrl}</span>
                  <span className="font-mono text-[10px] bg-muted px-1.5 py-0.5 rounded flex-shrink-0">
                    {elementData.tagName.toLowerCase()}
                  </span>
                </div>
                {elementData.textContent && (
                  <p className="text-xs text-muted-foreground italic break-words">
                    &ldquo;{elementData.textContent.slice(0, 120)}&rdquo;
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="grid gap-2">
            <Label htmlFor="report-type">Type</Label>
            <Select value={type} onValueChange={(v) => setType(v as "bug" | "feature_request")}>
              <SelectTrigger id="report-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bug">Bug Report</SelectItem>
                <SelectItem value="feature_request">Feature Request</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="report-priority">Priority</Label>
            <Select value={priority} onValueChange={(v) => setPriority(v as "low" | "medium" | "high")}>
              <SelectTrigger id="report-priority">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="report-title">Title</Label>
            <Input
              id="report-title"
              placeholder="Short summary of the issue or request"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="report-description">Description</Label>
            <Textarea
              id="report-description"
              placeholder="Provide details about the bug or feature..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => createReport.mutate()}
            disabled={!title.trim() || createReport.isPending}
          >
            {createReport.isPending ? "Submitting..." : "Submit Report"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
