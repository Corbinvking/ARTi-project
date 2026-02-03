"use client"

import { useMemo } from "react"
import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { useCampaignSubmissions } from "@/app/(dashboard)/spotify/stream-strategist/hooks/useCampaignSubmissions"
import { supabase as soundcloudSupabase } from "@/app/(dashboard)/soundcloud/soundcloud-app/integrations/supabase/client"
import { useCampaigns as useYouTubeCampaigns } from "@/app/(dashboard)/youtube/vidi-health-flow/hooks/useCampaigns"
import { useInstagramCampaigns } from "@/app/(dashboard)/instagram/seedstorm-builder/hooks/useInstagramCampaigns"

type QueueItem = {
  id: string
  service: "Spotify" | "SoundCloud" | "YouTube" | "Instagram"
  campaign: string
  client: string
  createdAt?: string
  link: string
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
        .eq("status", "new")
        .order("created_at", { ascending: false })
      if (error) throw error
      return data || []
    },
    staleTime: 30000,
  })

  const spotifyItems: QueueItem[] = useMemo(
    () =>
      (spotifySubmissions || [])
        .filter((submission) => submission.status === "pending_approval")
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
        .filter((campaign) => campaign.status === "draft")
        .map((campaign) => ({
          id: campaign.id,
          service: "Instagram",
          campaign: campaign.name,
          client: campaign.brand,
          createdAt: campaign.createdAt,
          link: "/instagram/campaigns",
        })),
    [instagram.campaigns],
  )

  const allItems = [...spotifyItems, ...soundcloudItems, ...youtubeItems, ...instagramItems]

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Ops Queue</h1>
          <p className="text-muted-foreground">
            Pending items across all services, auto-assigned to the current ops owner.
          </p>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Pending Queue</CardTitle>
            <Badge variant="secondary">{allItems.length} pending</Badge>
          </CardHeader>
          <CardContent>
            {(spotifyLoading || soundcloudLoading || youtube.loading || instagram.loading) && (
              <div className="text-sm text-muted-foreground">Loading queue...</div>
            )}

            {!spotifyLoading &&
              !soundcloudLoading &&
              !youtube.loading &&
              !instagram.loading &&
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
                      <TableHead>Created</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allItems.map((item) => (
                      <TableRow key={`${item.service}-${item.id}`}>
                        <TableCell>{item.service}</TableCell>
                        <TableCell>{item.campaign}</TableCell>
                        <TableCell>{item.client}</TableCell>
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
