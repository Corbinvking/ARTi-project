"use client"

import { useState } from "react"
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
import { Plus } from "lucide-react"

export function ReportForm() {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [type, setType] = useState<"bug" | "feature_request">("bug")
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium")
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const createReport = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not authenticated")

      const { error } = await supabase
        .from("platform_development_reports")
        .insert({
          type,
          title,
          description,
          priority,
          status: "open",
          submitted_by: user.id,
          submitted_by_name: user.name || user.email,
        })

      if (error) throw error
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
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          New Report
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Submit a Report</DialogTitle>
          <DialogDescription>
            Report a bug or request a new feature for platform development.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
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
