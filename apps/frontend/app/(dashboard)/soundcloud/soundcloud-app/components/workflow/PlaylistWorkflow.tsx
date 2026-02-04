"use client"

import { useState, useEffect } from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { supabase } from "../../integrations/supabase/client"
import { useToast } from "../../hooks/use-toast"
import {
  ListMusic,
  Check,
  Clock,
  Mail,
  ExternalLink,
  AlertCircle,
  Send,
  FileText,
} from "lucide-react"
import { format, formatDistanceToNow } from "date-fns"
import { cn } from "@/lib/utils"

type PlaylistStatus = 
  | "not_required"
  | "awaiting_playlist"
  | "playlist_received"
  | "scheduled_for_repost"

interface PlaylistWorkflowProps {
  submissionId: string
  submissionType: "submission" | "campaign"
  campaignType?: "paid" | "free"
  playlistRequired: boolean
  playlistReceived: boolean
  playlistUrl?: string | null
  playlistReminderSentAt?: string | null
  trackingLinkSentAt?: string | null
  clientEmail?: string
  clientName?: string
  trackName?: string
  artistName?: string
  onUpdate?: () => void
}

export const PlaylistWorkflow = ({
  submissionId,
  submissionType,
  campaignType = "paid",
  playlistRequired,
  playlistReceived,
  playlistUrl,
  playlistReminderSentAt,
  trackingLinkSentAt,
  clientEmail,
  clientName,
  trackName,
  artistName,
  onUpdate,
}: PlaylistWorkflowProps) => {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [isRequired, setIsRequired] = useState(playlistRequired)
  const [isReceived, setIsReceived] = useState(playlistReceived)
  const [url, setUrl] = useState(playlistUrl || "")
  const [sendReminderDialogOpen, setSendReminderDialogOpen] = useState(false)
  const [sendingReminder, setSendingReminder] = useState(false)

  // Determine current status
  const getStatus = (): PlaylistStatus => {
    if (!isRequired) return "not_required"
    if (!isReceived) return "awaiting_playlist"
    if (isReceived && url) return "scheduled_for_repost"
    return "playlist_received"
  }

  const status = getStatus()

  // Status configuration
  const statusConfig = {
    not_required: {
      label: "Not Required",
      color: "bg-gray-100 text-gray-700 border-gray-200",
      icon: Check,
    },
    awaiting_playlist: {
      label: "Awaiting Playlist",
      color: "bg-amber-50 text-amber-700 border-amber-200",
      icon: Clock,
    },
    playlist_received: {
      label: "Playlist Received",
      color: "bg-blue-50 text-blue-700 border-blue-200",
      icon: ListMusic,
    },
    scheduled_for_repost: {
      label: "Scheduled for Repost",
      color: "bg-green-50 text-green-700 border-green-200",
      icon: Check,
    },
  }

  const currentStatus = statusConfig[status]
  const StatusIcon = currentStatus.icon

  // Toggle playlist required
  const handleToggleRequired = async (required: boolean) => {
    setLoading(true)
    try {
      const tableName =
        submissionType === "submission" ? "submissions" : "soundcloud_campaigns"

      const { error } = await supabase
        .from(tableName)
        .update({
          playlist_required: required,
        })
        .eq("id", submissionId)

      if (error) throw error

      setIsRequired(required)

      // If toggling on and client email exists, offer to send notification
      if (required && clientEmail) {
        setSendReminderDialogOpen(true)
      }

      toast({
        title: required ? "Playlist Required" : "Playlist Not Required",
        description: required
          ? "Client will need to provide a playlist"
          : "Playlist requirement removed",
      })

      onUpdate?.()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update playlist requirement",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Mark playlist as received
  const handleMarkReceived = async () => {
    if (!url.trim()) {
      toast({
        title: "URL Required",
        description: "Please enter the playlist URL before marking as received",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    try {
      const tableName =
        submissionType === "submission" ? "submissions" : "soundcloud_campaigns"

      const { error } = await supabase
        .from(tableName)
        .update({
          playlist_received: true,
          playlist_url: url,
        })
        .eq("id", submissionId)

      if (error) throw error

      setIsReceived(true)

      toast({
        title: "Playlist Received",
        description: "Playlist has been recorded and campaign is ready for final repost",
      })

      onUpdate?.()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update playlist status",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Send playlist reminder email
  const handleSendReminder = async () => {
    if (!clientEmail) {
      toast({
        title: "No Client Email",
        description: "Client email is required to send reminder",
        variant: "destructive",
      })
      return
    }

    setSendingReminder(true)
    try {
      // Call Supabase function to send email
      const { error } = await supabase.functions.invoke("send-notification-email", {
        body: {
          template: "playlist-reminder",
          to: clientEmail,
          data: {
            clientName: clientName || "Valued Client",
            trackName: trackName || "your track",
            artistName: artistName || "Artist",
            submissionId,
          },
        },
      })

      if (error) throw error

      // Update reminder sent timestamp
      const tableName =
        submissionType === "submission" ? "submissions" : "soundcloud_campaigns"

      await supabase
        .from(tableName)
        .update({
          playlist_reminder_sent_at: new Date().toISOString(),
        })
        .eq("id", submissionId)

      toast({
        title: "Reminder Sent",
        description: `Playlist reminder sent to ${clientEmail}`,
      })

      setSendReminderDialogOpen(false)
      onUpdate?.()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send reminder",
        variant: "destructive",
      })
    } finally {
      setSendingReminder(false)
    }
  }

  // Send tracking link to client
  const handleSendTrackingLink = async () => {
    if (!clientEmail) {
      toast({
        title: "No Client Email",
        description: "Client email is required to send tracking link",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    try {
      // Call Supabase function to send email
      const { error } = await supabase.functions.invoke("send-notification-email", {
        body: {
          template: "tracking-link",
          to: clientEmail,
          data: {
            clientName: clientName || "Valued Client",
            trackName: trackName || "your track",
            artistName: artistName || "Artist",
            trackingUrl: `${process.env.NEXT_PUBLIC_APP_URL}/track/${submissionId}`,
          },
        },
      })

      if (error) throw error

      // Update tracking link sent timestamp
      const tableName =
        submissionType === "submission" ? "submissions" : "soundcloud_campaigns"

      await supabase
        .from(tableName)
        .update({
          tracking_link_sent_at: new Date().toISOString(),
        })
        .eq("id", submissionId)

      toast({
        title: "Tracking Link Sent",
        description: `Tracking link sent to ${clientEmail}`,
      })

      onUpdate?.()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send tracking link",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Only show for paid campaigns
  if (campaignType !== "paid") {
    return null
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ListMusic className="w-5 h-5 text-primary" />
            <CardTitle className="text-lg">Playlist Workflow</CardTitle>
          </div>
          <Badge variant="outline" className={cn("border", currentStatus.color)}>
            <StatusIcon className="w-3 h-3 mr-1" />
            {currentStatus.label}
          </Badge>
        </div>
        <CardDescription>
          Manage playlist requirements for this paid campaign
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Playlist Required Toggle */}
        <div className="flex items-center justify-between p-3 border rounded-lg">
          <div className="flex items-center gap-2">
            <ListMusic className="w-4 h-4 text-muted-foreground" />
            <div>
              <Label className="text-sm font-medium">Playlist Required</Label>
              <p className="text-xs text-muted-foreground">
                Require client to provide a playlist before final repost
              </p>
            </div>
          </div>
          <Switch
            checked={isRequired}
            onCheckedChange={handleToggleRequired}
            disabled={loading}
          />
        </div>

        {/* Playlist URL Input (when required) */}
        {isRequired && (
          <>
            <Separator />

            <div className="space-y-3">
              <Label htmlFor="playlist-url">Playlist URL</Label>
              <div className="flex gap-2">
                <Input
                  id="playlist-url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://soundcloud.com/..."
                  disabled={isReceived}
                />
                {url && (
                  <Button
                    variant="outline"
                    size="icon"
                    asChild
                  >
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </Button>
                )}
              </div>

              {!isReceived && (
                <Button
                  onClick={handleMarkReceived}
                  disabled={loading || !url.trim()}
                  className="w-full"
                >
                  <Check className="w-4 h-4 mr-2" />
                  Mark Playlist Received
                </Button>
              )}

              {isReceived && (
                <div className="flex items-center gap-2 p-2 bg-green-50 border border-green-200 rounded-md">
                  <Check className="w-4 h-4 text-green-600" />
                  <span className="text-sm text-green-800">
                    Playlist received - Ready for final repost
                  </span>
                </div>
              )}
            </div>

            {/* Reminder Status */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm">Playlist Reminder</Label>
                {playlistReminderSentAt ? (
                  <span className="text-xs text-muted-foreground">
                    Sent{" "}
                    {formatDistanceToNow(new Date(playlistReminderSentAt), {
                      addSuffix: true,
                    })}
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground">
                    Not sent
                  </span>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSendReminderDialogOpen(true)}
                disabled={!clientEmail || isReceived}
                className="w-full"
              >
                <Mail className="w-4 h-4 mr-2" />
                {playlistReminderSentAt ? "Send Another Reminder" : "Send Reminder"}
              </Button>
            </div>
          </>
        )}

        <Separator />

        {/* Tracking Link */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm">Tracking Link</Label>
            {trackingLinkSentAt ? (
              <span className="text-xs text-muted-foreground">
                Sent{" "}
                {formatDistanceToNow(new Date(trackingLinkSentAt), {
                  addSuffix: true,
                })}
              </span>
            ) : (
              <span className="text-xs text-muted-foreground">Not sent</span>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSendTrackingLink}
            disabled={loading || !clientEmail}
            className="w-full"
          >
            <Send className="w-4 h-4 mr-2" />
            {trackingLinkSentAt ? "Resend Tracking Link" : "Send Tracking Link"}
          </Button>
          {!clientEmail && (
            <p className="text-xs text-muted-foreground">
              <AlertCircle className="w-3 h-3 inline mr-1" />
              No client email available
            </p>
          )}
        </div>

        {/* Final Report (show when complete) */}
        {status === "scheduled_for_repost" && (
          <>
            <Separator />
            <div className="p-3 bg-muted/30 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="w-4 h-4 text-muted-foreground" />
                <Label className="text-sm font-medium">Campaign Complete</Label>
              </div>
              <p className="text-xs text-muted-foreground mb-2">
                Mark the campaign as complete to generate and send the final report
              </p>
              <Button variant="outline" size="sm" className="w-full">
                <Check className="w-4 h-4 mr-2" />
                Complete & Send Report
              </Button>
            </div>
          </>
        )}
      </CardContent>

      {/* Send Reminder Dialog */}
      <Dialog
        open={sendReminderDialogOpen}
        onOpenChange={setSendReminderDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Playlist Reminder</DialogTitle>
            <DialogDescription>
              Send a reminder email to {clientName || clientEmail} requesting the
              playlist for "{trackName}"
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              This will send an email to {clientEmail} with instructions for
              providing the playlist.
            </p>
            {playlistReminderSentAt && (
              <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded-md">
                <p className="text-sm text-amber-800 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  Last reminder sent:{" "}
                  {format(new Date(playlistReminderSentAt), "MMM d, yyyy HH:mm")}
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSendReminderDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleSendReminder} disabled={sendingReminder}>
              {sendingReminder ? "Sending..." : "Send Reminder"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
