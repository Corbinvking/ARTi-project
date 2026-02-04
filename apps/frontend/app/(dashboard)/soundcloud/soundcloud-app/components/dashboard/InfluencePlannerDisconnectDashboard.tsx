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
import { Checkbox } from "@/components/ui/checkbox"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ScrollArea } from "@/components/ui/scroll-area"
import { supabase } from "../../integrations/supabase/client"
import { useToast } from "../../hooks/use-toast"
import {
  WifiOff,
  Mail,
  RefreshCw,
  Search,
  MoreVertical,
  Clock,
  User,
  AlertCircle,
  CheckCircle,
  Send,
  ExternalLink,
} from "lucide-react"
import { format, formatDistanceToNow } from "date-fns"
import { cn } from "@/lib/utils"

interface DisconnectedMember {
  id: string
  name: string
  primary_email: string
  soundcloud_handle?: string
  soundcloud_followers?: number
  size_tier?: string
  influence_planner_status: string
  ip_disconnected_at?: string
  ip_reconnect_email_sent_at?: string
  ip_last_checked_at?: string
  ip_error_message?: string
}

interface InfluencePlannerDisconnectDashboardProps {
  onMemberUpdate?: () => void
}

export const InfluencePlannerDisconnectDashboard = ({
  onMemberUpdate,
}: InfluencePlannerDisconnectDashboardProps) => {
  const { toast } = useToast()
  const [disconnectedMembers, setDisconnectedMembers] = useState<
    DisconnectedMember[]
  >([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set())
  const [sendingEmail, setSendingEmail] = useState(false)
  const [emailDialogOpen, setEmailDialogOpen] = useState(false)
  const [emailTarget, setEmailTarget] = useState<DisconnectedMember | null>(
    null
  )
  const [bulkEmailDialogOpen, setBulkEmailDialogOpen] = useState(false)

  // Fetch disconnected members
  const fetchDisconnectedMembers = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from("members")
        .select(
          `id, name, primary_email, soundcloud_handle, soundcloud_followers, 
           size_tier, influence_planner_status, ip_disconnected_at, 
           ip_reconnect_email_sent_at, ip_last_checked_at, ip_error_message`
        )
        .eq("influence_planner_status", "disconnected")
        .order("ip_disconnected_at", { ascending: false })

      if (error) throw error
      setDisconnectedMembers(data || [])
    } catch (error: any) {
      console.error("Error fetching disconnected members:", error)
      toast({
        title: "Error",
        description: "Failed to fetch disconnected members",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDisconnectedMembers()
  }, [])

  // Filter members by search
  const filteredMembers = disconnectedMembers.filter(
    (member) =>
      member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.primary_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.soundcloud_handle?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Toggle member selection
  const toggleMember = (memberId: string) => {
    setSelectedMembers((prev) => {
      const next = new Set(prev)
      if (next.has(memberId)) {
        next.delete(memberId)
      } else {
        next.add(memberId)
      }
      return next
    })
  }

  // Select all visible members
  const selectAll = () => {
    if (selectedMembers.size === filteredMembers.length) {
      setSelectedMembers(new Set())
    } else {
      setSelectedMembers(new Set(filteredMembers.map((m) => m.id)))
    }
  }

  // Send reconnect email to single member
  const sendReconnectEmail = async (member: DisconnectedMember) => {
    setSendingEmail(true)
    try {
      // Call Supabase function to send email
      const { error } = await supabase.functions.invoke("send-notification-email", {
        body: {
          template: "ip-reconnect",
          to: member.primary_email,
          data: {
            memberName: member.name,
            soundcloudHandle: member.soundcloud_handle,
            reconnectUrl: `${process.env.NEXT_PUBLIC_APP_URL}/reconnect?member=${member.id}`,
          },
        },
      })

      if (error) throw error

      // Update member record
      await supabase
        .from("members")
        .update({
          ip_reconnect_email_sent_at: new Date().toISOString(),
        })
        .eq("id", member.id)

      toast({
        title: "Email Sent",
        description: `Reconnect email sent to ${member.primary_email}`,
      })

      // Refresh list
      fetchDisconnectedMembers()
      onMemberUpdate?.()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send reconnect email",
        variant: "destructive",
      })
    } finally {
      setSendingEmail(false)
      setEmailDialogOpen(false)
      setEmailTarget(null)
    }
  }

  // Send bulk reconnect emails
  const sendBulkReconnectEmails = async () => {
    setSendingEmail(true)
    try {
      const membersToEmail = filteredMembers.filter((m) =>
        selectedMembers.has(m.id)
      )

      let successCount = 0
      let failCount = 0

      for (const member of membersToEmail) {
        try {
          await supabase.functions.invoke("send-notification-email", {
            body: {
              template: "ip-reconnect",
              to: member.primary_email,
              data: {
                memberName: member.name,
                soundcloudHandle: member.soundcloud_handle,
                reconnectUrl: `${process.env.NEXT_PUBLIC_APP_URL}/reconnect?member=${member.id}`,
              },
            },
          })

          await supabase
            .from("members")
            .update({
              ip_reconnect_email_sent_at: new Date().toISOString(),
            })
            .eq("id", member.id)

          successCount++
        } catch {
          failCount++
        }
      }

      toast({
        title: "Bulk Email Complete",
        description: `Sent ${successCount} emails, ${failCount} failed`,
      })

      // Refresh and clear selection
      fetchDisconnectedMembers()
      setSelectedMembers(new Set())
      onMemberUpdate?.()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send bulk emails",
        variant: "destructive",
      })
    } finally {
      setSendingEmail(false)
      setBulkEmailDialogOpen(false)
    }
  }

  // Mark member as reconnected (manually)
  const markAsReconnected = async (memberId: string) => {
    try {
      await supabase
        .from("members")
        .update({
          influence_planner_status: "connected",
          ip_disconnected_at: null,
          ip_error_message: null,
        })
        .eq("id", memberId)

      toast({
        title: "Status Updated",
        description: "Member marked as reconnected",
      })

      fetchDisconnectedMembers()
      onMemberUpdate?.()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update status",
        variant: "destructive",
      })
    }
  }

  // Get status badge color
  const getStatusBadge = (member: DisconnectedMember) => {
    if (member.ip_reconnect_email_sent_at) {
      return (
        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
          <Mail className="w-3 h-3 mr-1" />
          Email Sent
        </Badge>
      )
    }
    return (
      <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
        <WifiOff className="w-3 h-3 mr-1" />
        Disconnected
      </Badge>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <WifiOff className="w-5 h-5 text-red-500" />
            <CardTitle>Influence Planner Disconnections</CardTitle>
          </div>
          <Badge variant="secondary">{disconnectedMembers.length} members</Badge>
        </div>
        <CardDescription>
          Members who need to reconnect their Influence Planner accounts
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search and Actions Bar */}
        <div className="flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search members..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchDisconnectedMembers}
              disabled={loading}
            >
              <RefreshCw
                className={cn("w-4 h-4 mr-2", loading && "animate-spin")}
              />
              Refresh
            </Button>
            {selectedMembers.size > 0 && (
              <Button
                size="sm"
                onClick={() => setBulkEmailDialogOpen(true)}
                disabled={sendingEmail}
              >
                <Send className="w-4 h-4 mr-2" />
                Email Selected ({selectedMembers.size})
              </Button>
            )}
          </div>
        </div>

        {/* Members Table */}
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : filteredMembers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <CheckCircle className="w-12 h-12 mb-2 text-green-500" />
            <p className="text-lg font-medium">All members connected!</p>
            <p className="text-sm">No disconnected Influence Planner accounts</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={
                        selectedMembers.size === filteredMembers.length &&
                        filteredMembers.length > 0
                      }
                      onCheckedChange={selectAll}
                    />
                  </TableHead>
                  <TableHead>Member</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Disconnected</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMembers.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedMembers.has(member.id)}
                        onCheckedChange={() => toggleMember(member.id)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{member.name}</p>
                          {member.soundcloud_handle && (
                            <p className="text-xs text-muted-foreground">
                              @{member.soundcloud_handle}
                            </p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{member.primary_email}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{member.size_tier}</Badge>
                    </TableCell>
                    <TableCell>{getStatusBadge(member)}</TableCell>
                    <TableCell>
                      {member.ip_disconnected_at ? (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          {formatDistanceToNow(
                            new Date(member.ip_disconnected_at),
                            { addSuffix: true }
                          )}
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">
                          Unknown
                        </span>
                      )}
                      {member.ip_error_message && (
                        <p className="text-xs text-red-500 mt-1">
                          {member.ip_error_message}
                        </p>
                      )}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => {
                              setEmailTarget(member)
                              setEmailDialogOpen(true)
                            }}
                          >
                            <Mail className="w-4 h-4 mr-2" />
                            Send Reconnect Email
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => markAsReconnected(member.id)}
                          >
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Mark as Reconnected
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <a
                              href={`https://influenceplanner.com/members/${member.id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <ExternalLink className="w-4 h-4 mr-2" />
                              View in Influence Planner
                            </a>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        )}

        {/* Email Sent History */}
        {filteredMembers.some((m) => m.ip_reconnect_email_sent_at) && (
          <div className="pt-4 border-t">
            <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
              <Mail className="w-4 h-4" />
              Recent Reconnect Emails
            </h4>
            <div className="space-y-1">
              {filteredMembers
                .filter((m) => m.ip_reconnect_email_sent_at)
                .slice(0, 5)
                .map((member) => (
                  <div
                    key={member.id}
                    className="text-sm text-muted-foreground flex items-center gap-2"
                  >
                    <span>{member.name}</span>
                    <span>-</span>
                    <span>
                      {member.ip_reconnect_email_sent_at &&
                        format(
                          new Date(member.ip_reconnect_email_sent_at),
                          "MMM d, yyyy HH:mm"
                        )}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        )}
      </CardContent>

      {/* Single Email Dialog */}
      <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Reconnect Email</DialogTitle>
            <DialogDescription>
              Send a reconnect email to {emailTarget?.name} (
              {emailTarget?.primary_email})
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              This will send an email with instructions to reconnect their
              Influence Planner account.
            </p>
            {emailTarget?.ip_reconnect_email_sent_at && (
              <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded-md">
                <p className="text-sm text-amber-800 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  Last email sent:{" "}
                  {format(
                    new Date(emailTarget.ip_reconnect_email_sent_at),
                    "MMM d, yyyy HH:mm"
                  )}
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEmailDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={() => emailTarget && sendReconnectEmail(emailTarget)}
              disabled={sendingEmail}
            >
              {sendingEmail ? "Sending..." : "Send Email"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Email Dialog */}
      <Dialog open={bulkEmailDialogOpen} onOpenChange={setBulkEmailDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Bulk Reconnect Emails</DialogTitle>
            <DialogDescription>
              Send reconnect emails to {selectedMembers.size} selected members
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              This will send reconnect emails to all selected members. Are you
              sure you want to proceed?
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setBulkEmailDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={sendBulkReconnectEmails} disabled={sendingEmail}>
              {sendingEmail
                ? "Sending..."
                : `Send ${selectedMembers.size} Emails`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
