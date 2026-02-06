"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useCampaignSubmissions } from "@/app/(dashboard)/spotify/stream-strategist/hooks/useCampaignSubmissions"
import { supabase as soundcloudSupabase } from "@/app/(dashboard)/soundcloud/soundcloud-app/integrations/supabase/client"
import { useCampaigns as useYouTubeCampaigns } from "@/app/(dashboard)/youtube/vidi-health-flow/hooks/useCampaigns"
import { useInstagramCampaigns } from "@/app/(dashboard)/instagram/seedstorm-builder/hooks/useInstagramCampaigns"
import { supabase } from "@/lib/auth"
import { 
  Instagram, 
  AlertCircle, 
  Music2, 
  Cloud, 
  Youtube, 
  LayoutGrid,
} from "lucide-react"

type QueueItem = {
  id: string
  service: "Spotify" | "SoundCloud" | "YouTube" | "Instagram"
  campaign: string
  client: string
  createdAt?: string
  link: string
  reason?: string
  priority?: "high" | "medium" | "low"
  status?: string
}

type ServiceStats = {
  newCampaigns: number
  needsApproval: number
  inProgress: number
  pendingReports: number
  urgent: number
  total: number
}

const formatDate = (value?: string | Date | null) => {
  if (!value) return "-"
  const date = typeof value === "string" ? new Date(value) : value
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleDateString()
}

const ServiceIcon = ({ service, className }: { service: string; className?: string }) => {
  switch (service) {
    case "Instagram":
      return <Instagram className={className || "h-5 w-5"} />
    case "Spotify":
      return <Music2 className={className || "h-5 w-5"} />
    case "SoundCloud":
      return <Cloud className={className || "h-5 w-5"} />
    case "YouTube":
      return <Youtube className={className || "h-5 w-5"} />
    default:
      return <LayoutGrid className={className || "h-5 w-5"} />
  }
}

const getServiceColor = (service: string) => {
  switch (service) {
    case "Instagram":
      return "text-pink-500"
    case "Spotify":
      return "text-green-500"
    case "SoundCloud":
      return "text-orange-500"
    case "YouTube":
      return "text-red-500"
    default:
      return "text-primary"
  }
}

const getServiceGradient = (service: string) => {
  switch (service) {
    case "Instagram":
      return "from-pink-50/50 to-purple-50/50 border-pink-500/20"
    case "Spotify":
      return "from-green-50/50 to-emerald-50/50 border-green-500/20"
    case "SoundCloud":
      return "from-orange-50/50 to-amber-50/50 border-orange-500/20"
    case "YouTube":
      return "from-red-50/50 to-rose-50/50 border-red-500/20"
    default:
      return "from-gray-50/50 to-slate-50/50 border-gray-500/20"
  }
}

// Service Task Summary Card Component
const ServiceTaskSummary = ({ 
  service, 
  stats, 
}: { 
  service: string
  stats: ServiceStats
}) => {
  const gradient = getServiceGradient(service)
  const iconColor = getServiceColor(service)

  return (
    <Card className={`border bg-gradient-to-r ${gradient}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <ServiceIcon service={service} className={`h-5 w-5 ${iconColor}`} />
          <CardTitle className="text-lg">{service} Tasks</CardTitle>
        </div>
        <CardDescription>
          {stats.urgent} urgent, {stats.total - stats.urgent} pending
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-white/70 rounded-lg">
            <div className="text-2xl font-bold text-yellow-600">
              {stats.newCampaigns}
            </div>
            <div className="text-xs text-muted-foreground">New Campaigns</div>
          </div>
          <div className="text-center p-3 bg-white/70 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">
              {stats.needsApproval}
            </div>
            <div className="text-xs text-muted-foreground">Needs Action</div>
          </div>
          <div className="text-center p-3 bg-white/70 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">
              {stats.inProgress}
            </div>
            <div className="text-xs text-muted-foreground">In Progress</div>
          </div>
          <div className="text-center p-3 bg-white/70 rounded-lg">
            <div className="text-2xl font-bold text-orange-600">
              {stats.pendingReports}
            </div>
            <div className="text-xs text-muted-foreground">Reports Due</div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Queue Table Component
const QueueTable = ({ items, showService = true }: { items: QueueItem[]; showService?: boolean }) => {
  if (items.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No pending items in this queue.
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            {showService && <TableHead>Service</TableHead>}
            <TableHead>Campaign</TableHead>
            <TableHead>Client</TableHead>
            <TableHead>Reason</TableHead>
            <TableHead>Created</TableHead>
            <TableHead>Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items
            .sort((a, b) => {
              const priorityOrder = { high: 0, medium: 1, low: 2 }
              const aPriority = priorityOrder[a.priority || 'low']
              const bPriority = priorityOrder[b.priority || 'low']
              if (aPriority !== bPriority) return aPriority - bPriority
              return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
            })
            .map((item) => (
              <TableRow key={`${item.service}-${item.id}`}>
                {showService && (
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <ServiceIcon service={item.service} className={`h-4 w-4 ${getServiceColor(item.service)}`} />
                      <span>{item.service}</span>
                    </div>
                  </TableCell>
                )}
                <TableCell className="font-medium">{item.campaign}</TableCell>
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
                  <Link className="text-primary hover:underline font-medium" href={item.link}>
                    Open →
                  </Link>
                </TableCell>
              </TableRow>
            ))}
        </TableBody>
      </Table>
    </div>
  )
}

interface OpsQueueContentProps {
  /** Whether to show the header (title + description). Set to false when embedding. */
  showHeader?: boolean
}

export function OpsQueueContent({ showHeader = true }: OpsQueueContentProps) {
  const [activeTab, setActiveTab] = useState("all")
  
  const { data: spotifySubmissions = [], isLoading: spotifyLoading } = useCampaignSubmissions()
  const youtube = useYouTubeCampaigns()
  const instagram = useInstagramCampaigns()

  const { data: soundcloudSubmissions = [], isLoading: soundcloudLoading } = useQuery({
    queryKey: ["soundcloud-submissions", "ops-queue"],
    queryFn: async () => {
      const { data, error } = await soundcloudSupabase
        .from("soundcloud_submissions")
        .select("id, track_name, artist_name, created_at, client_id, status")
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
      const { data, error } = await supabase
        .from("instagram_campaigns")
        .select("id, campaign, clients, status, created_at, page_selection_approved, final_report_sent_at, followup_report_date, followup_report_sent_at")
        .order("created_at", { ascending: false })
      
      if (error) throw error
      return data || []
    },
    staleTime: 30000,
  })

  // Spotify campaigns (Stream Strategist)
  const { data: spotifyCampaigns = [], isLoading: spotifyCampaignsLoading } = useQuery({
    queryKey: ["spotify-campaigns-queue"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stream_strategist_campaigns")
        .select("id, name, client_name, status, created_at, start_date")
        .order("created_at", { ascending: false })
      
      if (error) throw error
      return data || []
    },
    staleTime: 30000,
  })

  // Build queue items for each service
  const spotifyItems: QueueItem[] = useMemo(() => {
    const items: QueueItem[] = []
    
    for (const submission of (spotifySubmissions || [])) {
      if (submission.status === "pending") {
        items.push({
          id: `sub-${submission.id}`,
          service: "Spotify",
          campaign: submission.campaign_name,
          client: submission.client_name,
          createdAt: submission.created_at,
          link: "/spotify/submissions",
          reason: "New submission - needs review",
          priority: "high",
          status: submission.status,
        })
      }
    }
    
    for (const campaign of (spotifyCampaigns || [])) {
      const status = (campaign.status || '').toLowerCase()
      
      if (status === 'pending') {
        items.push({
          id: `camp-${campaign.id}`,
          service: "Spotify",
          campaign: campaign.name || "Untitled",
          client: campaign.client_name || "Unknown",
          createdAt: campaign.created_at,
          link: "/spotify/stream-strategist",
          reason: "Campaign pending start",
          priority: "medium",
          status: status,
        })
      } else if (status === 'ready') {
        items.push({
          id: `camp-${campaign.id}`,
          service: "Spotify",
          campaign: campaign.name || "Untitled",
          client: campaign.client_name || "Unknown",
          createdAt: campaign.created_at,
          link: "/spotify/stream-strategist",
          reason: "Ready to activate",
          priority: "medium",
          status: status,
        })
      } else if (status === 'active') {
        items.push({
          id: `camp-${campaign.id}`,
          service: "Spotify",
          campaign: campaign.name || "Untitled",
          client: campaign.client_name || "Unknown",
          createdAt: campaign.created_at,
          link: "/spotify/stream-strategist",
          reason: "In progress",
          priority: "low",
          status: status,
        })
      }
    }
    
    return items
  }, [spotifySubmissions, spotifyCampaigns])

  const soundcloudItems: QueueItem[] = useMemo(() => {
    const items: QueueItem[] = []
    
    for (const submission of (soundcloudSubmissions || [])) {
      const status = ((submission as any).status || 'new').toLowerCase()
      
      if (status === 'new' || status === 'pending') {
        items.push({
          id: submission.id,
          service: "SoundCloud",
          campaign: (submission as any).track_name || "Untitled Track",
          client: (submission as any).artist_name || "Unknown Artist",
          createdAt: (submission as any).created_at,
          link: "/soundcloud/dashboard/campaigns",
          reason: "New submission - needs review",
          priority: "high",
          status: status,
        })
      } else if (status === 'ready') {
        items.push({
          id: submission.id,
          service: "SoundCloud",
          campaign: (submission as any).track_name || "Untitled Track",
          client: (submission as any).artist_name || "Unknown Artist",
          createdAt: (submission as any).created_at,
          link: "/soundcloud/dashboard/campaigns",
          reason: "Ready to activate",
          priority: "medium",
          status: status,
        })
      } else if (status === 'active' || status === 'approved') {
        items.push({
          id: submission.id,
          service: "SoundCloud",
          campaign: (submission as any).track_name || "Untitled Track",
          client: (submission as any).artist_name || "Unknown Artist",
          createdAt: (submission as any).created_at,
          link: "/soundcloud/dashboard/campaigns",
          reason: "In progress",
          priority: "low",
          status: status,
        })
      }
    }
    
    return items
  }, [soundcloudSubmissions])

  const youtubeItems: QueueItem[] = useMemo(() => {
    const items: QueueItem[] = []
    
    for (const campaign of (youtube.campaigns || [])) {
      const status = (campaign.status || '').toLowerCase()
      
      if (status === 'pending') {
        items.push({
          id: campaign.id,
          service: "YouTube",
          campaign: campaign.campaign_name || "Untitled Campaign",
          client: campaign.youtube_clients?.name || "Unknown Client",
          createdAt: campaign.created_at,
          link: "/youtube/campaigns",
          reason: "New campaign - needs setup",
          priority: "high",
          status: status,
        })
      } else if (status === 'ready') {
        items.push({
          id: campaign.id,
          service: "YouTube",
          campaign: campaign.campaign_name || "Untitled Campaign",
          client: campaign.youtube_clients?.name || "Unknown Client",
          createdAt: campaign.created_at,
          link: "/youtube/campaigns",
          reason: "Ready to activate",
          priority: "medium",
          status: status,
        })
      } else if (status === 'active') {
        items.push({
          id: campaign.id,
          service: "YouTube",
          campaign: campaign.campaign_name || "Untitled Campaign",
          client: campaign.youtube_clients?.name || "Unknown Client",
          createdAt: campaign.created_at,
          link: "/youtube/campaigns",
          reason: "In progress - monitor stats",
          priority: "low",
          status: status,
        })
      }
    }
    
    return items
  }, [youtube.campaigns])

  const instagramItems: QueueItem[] = useMemo(() => {
    const items: QueueItem[] = []
    const today = new Date()
    const threeDaysFromNow = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
    
    for (const campaign of instagramSeedingCampaigns) {
      const status = (campaign.status || '').toLowerCase()
      
      if (status === 'complete' || status === 'on_hold' || status === 'cancelled') continue
      
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
          status: status,
        })
      }
      
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
          status: status,
        })
      }
      
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
          status: status,
        })
      }
      
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
            reason: `Follow-up due ${followupDate.toLocaleDateString()}`,
            priority: followupDate <= today ? "high" : "medium",
            status: status,
          })
        }
      }
    }
    
    return items
  }, [instagramSeedingCampaigns])

  // Calculate stats for each service
  const calculateStats = (items: QueueItem[]): ServiceStats => {
    return {
      newCampaigns: items.filter(i => i.reason?.includes('needs review') || i.reason?.includes('needs setup')).length,
      needsApproval: items.filter(i => i.reason?.includes('approval') || i.reason?.includes('Ready')).length,
      inProgress: items.filter(i => i.reason?.includes('progress') || i.status === 'active').length,
      pendingReports: items.filter(i => i.reason?.includes('report') || i.reason?.includes('Follow-up')).length,
      urgent: items.filter(i => i.priority === 'high').length,
      total: items.length,
    }
  }

  const spotifyStats = calculateStats(spotifyItems)
  const soundcloudStats = calculateStats(soundcloudItems)
  const youtubeStats = calculateStats(youtubeItems)
  const instagramStats = calculateStats(instagramItems)

  const allItems = [...spotifyItems, ...soundcloudItems, ...youtubeItems, ...instagramItems]

  const isLoading = spotifyLoading || soundcloudLoading || youtube.loading || instagram.loading || instagramSeedingLoading || spotifyCampaignsLoading

  return (
    <div className="space-y-6">
      {showHeader && (
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Ops Queue</h1>
          <p className="text-muted-foreground">
            Pending items across all services, auto-assigned to the current ops owner.
          </p>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="all" className="flex items-center gap-2">
            <LayoutGrid className="h-4 w-4" />
            <span className="hidden sm:inline">All Services</span>
            <Badge variant="secondary" className="ml-1">{allItems.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="instagram" className="flex items-center gap-2">
            <Instagram className="h-4 w-4 text-pink-500" />
            <span className="hidden sm:inline">Instagram</span>
            {instagramItems.length > 0 && <Badge variant="secondary">{instagramItems.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="spotify" className="flex items-center gap-2">
            <Music2 className="h-4 w-4 text-green-500" />
            <span className="hidden sm:inline">Spotify</span>
            {spotifyItems.length > 0 && <Badge variant="secondary">{spotifyItems.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="youtube" className="flex items-center gap-2">
            <Youtube className="h-4 w-4 text-red-500" />
            <span className="hidden sm:inline">YouTube</span>
            {youtubeItems.length > 0 && <Badge variant="secondary">{youtubeItems.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="soundcloud" className="flex items-center gap-2">
            <Cloud className="h-4 w-4 text-orange-500" />
            <span className="hidden sm:inline">SoundCloud</span>
            {soundcloudItems.length > 0 && <Badge variant="secondary">{soundcloudItems.length}</Badge>}
          </TabsTrigger>
        </TabsList>

        {/* All Services Tab */}
        <TabsContent value="all" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ServiceTaskSummary service="Instagram" stats={instagramStats} />
            <ServiceTaskSummary service="Spotify" stats={spotifyStats} />
            <ServiceTaskSummary service="YouTube" stats={youtubeStats} />
            <ServiceTaskSummary service="SoundCloud" stats={soundcloudStats} />
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>All Pending Items</CardTitle>
              <Badge variant="secondary">{allItems.length} total</Badge>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-sm text-muted-foreground py-4">Loading queue...</div>
              ) : (
                <QueueTable items={allItems} showService={true} />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Instagram Tab */}
        <TabsContent value="instagram" className="space-y-6 mt-6">
          <ServiceTaskSummary service="Instagram" stats={instagramStats} />
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Instagram className="h-5 w-5 text-pink-500" />
                Instagram Queue
              </CardTitle>
              <Badge variant="secondary">{instagramItems.length} pending</Badge>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-sm text-muted-foreground py-4">Loading...</div>
              ) : (
                <QueueTable items={instagramItems} showService={false} />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Spotify Tab */}
        <TabsContent value="spotify" className="space-y-6 mt-6">
          <ServiceTaskSummary service="Spotify" stats={spotifyStats} />
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Music2 className="h-5 w-5 text-green-500" />
                Spotify Queue
              </CardTitle>
              <Badge variant="secondary">{spotifyItems.length} pending</Badge>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-sm text-muted-foreground py-4">Loading...</div>
              ) : (
                <QueueTable items={spotifyItems} showService={false} />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* YouTube Tab */}
        <TabsContent value="youtube" className="space-y-6 mt-6">
          <ServiceTaskSummary service="YouTube" stats={youtubeStats} />
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Youtube className="h-5 w-5 text-red-500" />
                YouTube Queue
              </CardTitle>
              <Badge variant="secondary">{youtubeItems.length} pending</Badge>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-sm text-muted-foreground py-4">Loading...</div>
              ) : (
                <QueueTable items={youtubeItems} showService={false} />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* SoundCloud Tab */}
        <TabsContent value="soundcloud" className="space-y-6 mt-6">
          <ServiceTaskSummary service="SoundCloud" stats={soundcloudStats} />
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Cloud className="h-5 w-5 text-orange-500" />
                SoundCloud Queue
              </CardTitle>
              <Badge variant="secondary">{soundcloudItems.length} pending</Badge>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-sm text-muted-foreground py-4">Loading...</div>
              ) : (
                <QueueTable items={soundcloudItems} showService={false} />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
