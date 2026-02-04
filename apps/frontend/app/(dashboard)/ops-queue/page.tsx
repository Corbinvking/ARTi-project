"use client"

import { useMemo } from "react"
import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { useCampaignSubmissions } from "@/app/(dashboard)/spotify/stream-strategist/hooks/useCampaignSubmissions"
import { supabase as soundcloudSupabase } from "@/app/(dashboard)/soundcloud/soundcloud-app/integrations/supabase/client"
import { useCampaigns as useYouTubeCampaigns } from "@/app/(dashboard)/youtube/vidi-health-flow/hooks/useCampaigns"
import { useInstagramCampaigns } from "@/app/(dashboard)/instagram/seedstorm-builder/hooks/useInstagramCampaigns"
import { supabase } from "@/lib/auth"
import { Instagram, AlertCircle, Calendar, FileText, Users } from "lucide-react"

type QueueItem = {
  id: string
  service: "Spotify" | "SoundCloud" | "YouTube" | "Instagram"
  campaign: string
  client: string
  createdAt?: string
  link: string
  reason?: string
  priority?: "high" | "medium" | "low"
}

const formatDate = (value?: string | Date | null) => {
  if (!value) return "-"
  const date = typeof value === "string" ? new Date(value) : value
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleDateString()
}

export default function OpsQueuePage() {
  const { data: spotifySubmissions = [], isLoading: spotifyLoading } = useCampaignSubmissions()
  const youtube = useYouTubeCampaigns()
  const instagram = useInstagramCampaigns()

  const { data: soundcloudSubmissions = [], isLoading: soundcloudLoading } = useQuery({
    queryKey: ["soundcloud-submissions", "ops-queue"],
    queryFn: async () => {
      const { data, error } = await soundcloudSupabase
        .from("soundcloud_submissions")
        .select("id, track_name, artist_name, created_at, client_id")
        .eq("status", "pending")
        .order("created_at", { ascending: false })
      if (error) throw error
      return data || []
    },
    staleTime: 30000,
  })

  // Instagram Seeding campaigns with workflow filters
  const { data: instagramSeedingCampaigns = [], isLoading: instagramSeedingLoading } = useQuery({
    queryKey: ["instagram-seeding-queue"],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0]
      const threeDaysFromNow = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      
      const { data, error } = await supabase
        .from("instagram_campaigns")
        .select("id, campaign, clients, status, created_at, page_selection_approved, final_report_sent_at, followup_report_date, followup_report_sent_at")
        .order("created_at", { ascending: false })
      
      if (error) throw error
      return data || []
    },
    staleTime: 30000,
  })

  const spotifyItems: QueueItem[] = useMemo(
    () =>
      (spotifySubmissions || [])
        .filter((submission) => submission.status === "pending")
        .map((submission) => ({
          id: submission.id,
          service: "Spotify",
          campaign: submission.campaign_name,
          client: submission.client_name,
          createdAt: submission.created_at,
          link: "/spotify/submissions",
        })),
    [spotifySubmissions],
  )

  const soundcloudItems: QueueItem[] = useMemo(
    () =>
      (soundcloudSubmissions || []).map((submission: any) => ({
        id: submission.id,
        service: "SoundCloud",
        campaign: submission.track_name || "Untitled Track",
        client: submission.artist_name || "Unknown Artist",
        createdAt: submission.created_at,
        link: "/soundcloud/dashboard/campaigns",
      })),
    [soundcloudSubmissions],
  )

  const youtubeItems: QueueItem[] = useMemo(
    () =>
      (youtube.campaigns || [])
        .filter((campaign) => campaign.status === "pending")
        .map((campaign) => ({
          id: campaign.id,
          service: "YouTube",
          campaign: campaign.campaign_name || "Untitled Campaign",
          client: campaign.youtube_clients?.name || "Unknown Client",
          createdAt: campaign.created_at,
          link: "/youtube/campaigns",
        })),
    [youtube.campaigns],
  )

  const instagramItems: QueueItem[] = useMemo(
    () =>
      (instagram.campaigns || [])
        .filter((campaign) => campaign.status === "pending")
        .map((campaign) => ({
          id: campaign.id,
          service: "Instagram",
          campaign: campaign.name,
          client: campaign.brand,
          createdAt: campaign.createdAt,
          link: "/instagram/campaigns",
          reason: "New campaign pending",
        })),
    [instagram.campaigns],
  )

  // Instagram Seeding workflow items
  const instagramSeedingItems: QueueItem[] = useMemo(() => {
    const items: QueueItem[] = []
    const today = new Date()
    const threeDaysFromNow = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
    
    for (const campaign of instagramSeedingCampaigns) {
      const status = (campaign.status || '').toLowerCase()
      
      // Skip completed or on_hold campaigns
      if (status === 'complete' || status === 'on_hold' || status === 'cancelled') continue
      
      // 1. Pending campaigns (needs initial review)
      if (status === 'pending' || status === 'draft') {
        items.push({
          id: `ig-pending-${campaign.id}`,
          service: "Instagram",
          campaign: campaign.campaign || "Untitled",
          client: campaign.clients || "Unknown",
          createdAt: campaign.created_at,
          link: "/instagram/campaigns",
          reason: "New campaign - needs review",
          priority: "high",
        })
      }
      
      // 2. Page selection not approved (ready but waiting for approval)
      if (status === 'ready' && campaign.page_selection_approved === false) {
        items.push({
          id: `ig-approval-${campaign.id}`,
          service: "Instagram",
          campaign: campaign.campaign || "Untitled",
          client: campaign.clients || "Unknown",
          createdAt: campaign.created_at,
          link: "/instagram/campaigns",
          reason: "Page selection needs approval",
          priority: "medium",
        })
      }
      
      // 3. Active campaign - final report not sent
      if (status === 'active' && !campaign.final_report_sent_at) {
        items.push({
          id: `ig-finalreport-${campaign.id}`,
          service: "Instagram",
          campaign: campaign.campaign || "Untitled",
          client: campaign.clients || "Unknown",
          createdAt: campaign.created_at,
          link: "/instagram/campaigns",
          reason: "Final report pending",
          priority: "low",
        })
      }
      
      // 4. Follow-up report due soon
      if (campaign.followup_report_date && !campaign.followup_report_sent_at) {
        const followupDate = new Date(campaign.followup_report_date)
        if (followupDate <= threeDaysFromNow) {
          items.push({
            id: `ig-followup-${campaign.id}`,
            service: "Instagram",
            campaign: campaign.campaign || "Untitled",
            client: campaign.clients || "Unknown",
            createdAt: campaign.created_at,
            link: "/instagram/campaigns",
            reason: `Follow-up report due ${followupDate.toLocaleDateString()}`,
            priority: followupDate <= today ? "high" : "medium",
          })
        }
      }
    }
    
    return items
  }, [instagramSeedingCampaigns])

  const allItems = [...spotifyItems, ...soundcloudItems, ...youtubeItems, ...instagramItems, ...instagramSeedingItems]

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Ops Queue</h1>
          <p className="text-muted-foreground">
            Pending items across all services, auto-assigned to the current ops owner.
          </p>
        </div>

        {/* Instagram Seeding Summary */}
        {instagramSeedingItems.length > 0 && (
          <Card className="border-pink-500/20 bg-gradient-to-r from-pink-50/50 to-purple-50/50">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Instagram className="h-5 w-5 text-pink-500" />
                <CardTitle className="text-lg">Instagram Seeding Tasks</CardTitle>
              </div>
              <CardDescription>
                {instagramSeedingItems.filter(i => i.priority === 'high').length} urgent, {instagramSeedingItems.filter(i => i.priority === 'medium').length} pending
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-3 bg-white/70 rounded-lg">
                  <div className="text-2xl font-bold text-yellow-600">
                    {instagramSeedingItems.filter(i => i.reason?.includes('needs review')).length}
                  </div>
                  <div className="text-xs text-muted-foreground">New Campaigns</div>
                </div>
                <div className="text-center p-3 bg-white/70 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {instagramSeedingItems.filter(i => i.reason?.includes('approval')).length}
                  </div>
                  <div className="text-xs text-muted-foreground">Needs Approval</div>
                </div>
                <div className="text-center p-3 bg-white/70 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">
                    {instagramSeedingItems.filter(i => i.reason?.includes('Final report')).length}
                  </div>
                  <div className="text-xs text-muted-foreground">Final Reports</div>
                </div>
                <div className="text-center p-3 bg-white/70 rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">
                    {instagramSeedingItems.filter(i => i.reason?.includes('Follow-up')).length}
                  </div>
                  <div className="text-xs text-muted-foreground">Follow-ups Due</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Pending Queue</CardTitle>
            <Badge variant="secondary">{allItems.length} pending</Badge>
          </CardHeader>
          <CardContent>
            {(spotifyLoading || soundcloudLoading || youtube.loading || instagram.loading || instagramSeedingLoading) && (
              <div className="text-sm text-muted-foreground">Loading queue...</div>
            )}

            {!spotifyLoading &&
              !soundcloudLoading &&
              !youtube.loading &&
              !instagram.loading &&
              !instagramSeedingLoading &&
              allItems.length === 0 && (
                <div className="text-sm text-muted-foreground">No pending items right now.</div>
              )}

            {allItems.length > 0 && (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Service</TableHead>
                      <TableHead>Campaign</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allItems
                      .sort((a, b) => {
                        // Sort by priority (high first), then by date
                        const priorityOrder = { high: 0, medium: 1, low: 2 }
                        const aPriority = priorityOrder[a.priority || 'low']
                        const bPriority = priorityOrder[b.priority || 'low']
                        if (aPriority !== bPriority) return aPriority - bPriority
                        return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
                      })
                      .map((item) => (
                      <TableRow key={`${item.service}-${item.id}`}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {item.service === "Instagram" && <Instagram className="h-4 w-4 text-pink-500" />}
                            <span>{item.service}</span>
                          </div>
                        </TableCell>
                        <TableCell>{item.campaign}</TableCell>
                        <TableCell>{item.client}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {item.priority === "high" && <AlertCircle className="h-3 w-3 text-red-500" />}
                            <span className={item.priority === "high" ? "text-red-600 font-medium" : "text-muted-foreground text-sm"}>
                              {item.reason || "Pending review"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>{formatDate(item.createdAt)}</TableCell>
                        <TableCell>
                          <Link className="text-primary hover:underline" href={item.link}>
                            Open
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
