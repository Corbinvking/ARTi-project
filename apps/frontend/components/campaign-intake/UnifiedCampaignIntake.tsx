"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/hooks/use-auth"
import { useSalespeopleOptions } from "@/hooks/use-salespeople"
import { ClientSelector } from "@/app/(dashboard)/spotify/stream-strategist/components/ClientSelector"
import { useClients, useCreateClient } from "@/app/(dashboard)/spotify/stream-strategist/hooks/useClients"
import { useCreateCampaignSubmission } from "@/app/(dashboard)/spotify/stream-strategist/hooks/useCampaignSubmissions"
import { supabase as soundcloudSupabase } from "@/app/(dashboard)/soundcloud/soundcloud-app/integrations/supabase/client"
import { useCampaigns as useYouTubeCampaigns } from "@/app/(dashboard)/youtube/vidi-health-flow/hooks/useCampaigns"
import { MultiServiceTypeSelector } from "@/app/(dashboard)/youtube/vidi-health-flow/components/campaigns/MultiServiceTypeSelector"
import type { Database } from "@/app/(dashboard)/youtube/vidi-health-flow/integrations/supabase/types"
import { useInstagramCampaignMutations } from "@/app/(dashboard)/instagram/seedstorm-builder/hooks/useInstagramCampaignMutations"
import { supabase as coreSupabase } from "@/lib/auth"
import { notifyOpsStatusChange } from "@/lib/status-notify"
import { notifySlack } from "@/lib/slack-notify"
import { UNIFIED_GENRES } from "@/app/(dashboard)/spotify/stream-strategist/lib/constants"

type ServiceKey = "spotify" | "soundcloud" | "youtube" | "instagram"
type ServiceType = Database["public"]["Enums"]["service_type"]

interface ServiceTypeGoal {
  id: string
  service_type: ServiceType
  custom_service_type?: string
  goal_views: number
}

const SERVICE_OPTIONS: Array<{ key: ServiceKey; label: string }> = [
  { key: "spotify", label: "Spotify" },
  { key: "soundcloud", label: "SoundCloud" },
  { key: "instagram", label: "Instagram" },
  { key: "youtube", label: "YouTube" },
]

const extractYouTubeVideoId = (url: string) => {
  const match = url.match(
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
  )
  return match?.[1] || ""
}

const extractSpotifyTrackId = (url: string): string | null => {
  const match = url.match(/spotify\.com\/track\/([a-zA-Z0-9]+)/)
  return match?.[1] || null
}

const daysBetween = (start: string, end: string): number => {
  const s = new Date(start)
  const e = new Date(end)
  const diff = Math.ceil((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24))
  return Math.max(diff, 1)
}

export function UnifiedCampaignIntake({ mode = "standard" }: { mode?: "standard" | "invoice" }) {
  const { toast } = useToast()
  const { user } = useAuth()
  const { data: clients = [] } = useClients()
  const { data: salespeopleOptions = [] } = useSalespeopleOptions()
  const createClient = useCreateClient()
  const createSpotifySubmission = useCreateCampaignSubmission()
  const youtube = useYouTubeCampaigns()
  const instagramMutations = useInstagramCampaignMutations()


  const [selectedServices, setSelectedServices] = useState<ServiceKey[]>(["spotify"])
  const [activeService, setActiveService] = useState<ServiceKey>("spotify")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoadingSpotifyGenres, setIsLoadingSpotifyGenres] = useState(false)
  const [submitResults, setSubmitResults] = useState<
    Array<{ service: ServiceKey; success: boolean; message: string; campaignId?: string; link?: string }>
  >([])

  // ── Shared state ──────────────────────────────────────────────────────
  const [shared, setShared] = useState({
    campaignName: "",
    salespersonId: "",
    clientMode: "existing" as "existing" | "new",
    clientId: "",
    newClientCompany: "",
    newClientEmail1: "",
    newClientEmail2: "",
    newClientEmail3: "",
    newClientAddress: "",
    saleAmount: "",
    startDate: "",
    endDate: "",
  })

  const [invoice, setInvoice] = useState({
    invoiceNumber: "",
    amount: "",
    dueDate: "",
    clientName: "",
    clientEmail: "",
    notes: "",
  })

  // ── Spotify state ─────────────────────────────────────────────────────
  const [spotifyData, setSpotifyData] = useState({
    streamUrl: "",
    timeframe: "90" as "30" | "60" | "90",
    streamGoal: "",
    status: "active" as "active" | "unreleased" | "pending",
    genres: [] as string[],
    autoDetectedGenres: [] as string[],
    internalNotes: "",
  })

  // ── SoundCloud state ──────────────────────────────────────────────────
  const [soundcloudData, setSoundcloudData] = useState({
    reachGoalMillions: "",
    status: "released" as "released" | "unreleased" | "pending",
    streamUrl: "",
  })

  // ── YouTube state ─────────────────────────────────────────────────────
  const [youtubeData, setYoutubeData] = useState({
    youtubeUrl: "",
    desiredDailyViews: "",
    desiredDailyViewsOverridden: false,
  })
  const [youtubeServiceTypes, setYoutubeServiceTypes] = useState<ServiceTypeGoal[]>([
    { id: "1", service_type: "" as ServiceType, goal_views: 0 },
  ])

  // ── Instagram state ───────────────────────────────────────────────────
  const [instagramData, setInstagramData] = useState({
    seedingType: "audio" as "audio" | "footage",
    salesPrice: "",
    adSpend: "",
    adSpendOverridden: false,
    status: "active" as "active" | "unreleased" | "pending",
    internalNotes: "",
  })

  const opsOwner = user?.email || user?.name || ""
  const opsOwnerId = user?.id || null
  const orgId = user?.tenantId || "00000000-0000-0000-0000-000000000001"

  const selectedSalesperson = useMemo(
    () => salespeopleOptions.find((sp) => sp.value === shared.salespersonId),
    [salespeopleOptions, shared.salespersonId],
  )

  const selectedClient = useMemo(
    () => clients.find((c) => c.id === shared.clientId),
    [clients, shared.clientId],
  )

  const clientEmails = useMemo(() => {
    if (shared.clientMode === "existing" && selectedClient) {
      return selectedClient.emails || []
    }
    return [shared.newClientEmail1, shared.newClientEmail2, shared.newClientEmail3].filter(
      (e) => e.trim().length > 0,
    )
  }, [shared, selectedClient])

  const clientName = useMemo(() => {
    if (shared.clientMode === "existing" && selectedClient) {
      return selectedClient.name
    }
    return shared.newClientCompany
  }, [shared, selectedClient])

  // ── Note history helper ───────────────────────────────────────────────
  const addNoteHistory = async ({
    service,
    campaignId,
    noteType,
    content,
  }: {
    service: string
    campaignId: string
    noteType: "internal" | "client"
    content: string
  }) => {
    if (!content.trim()) return
    await coreSupabase.from("campaign_note_history").insert({
      org_id: orgId,
      service,
      campaign_id: campaignId,
      note_type: noteType,
      content,
      created_by: opsOwnerId,
    })
  }

  // ── Invoice → sale amount sync ────────────────────────────────────────
  useEffect(() => {
    if (mode === "invoice" && invoice.amount && !shared.saleAmount) {
      setShared((prev) => ({ ...prev, saleAmount: invoice.amount }))
    }
  }, [mode, invoice.amount, shared.saleAmount])

  // ── Active tab sync ───────────────────────────────────────────────────
  useEffect(() => {
    if (selectedServices.length > 0 && !selectedServices.includes(activeService)) {
      setActiveService(selectedServices[0])
    }
  }, [activeService, selectedServices])

  // ── Instagram: pre-fill salesPrice from saleAmount ────────────────────
  useEffect(() => {
    if (shared.saleAmount && !instagramData.salesPrice) {
      setInstagramData((prev) => ({ ...prev, salesPrice: shared.saleAmount }))
    }
  }, [shared.saleAmount, instagramData.salesPrice])

  // ── Instagram: auto-calculate ad spend as 70% of sales price ──────────
  useEffect(() => {
    if (instagramData.adSpendOverridden) return
    const price = Number(instagramData.salesPrice)
    if (price > 0) {
      setInstagramData((prev) => ({
        ...prev,
        adSpend: String(Math.round(price * 0.7 * 100) / 100),
      }))
    }
  }, [instagramData.salesPrice, instagramData.adSpendOverridden])

  // ── YouTube: auto-calculate desired daily views ───────────────────────
  useEffect(() => {
    if (youtubeData.desiredDailyViewsOverridden) return
    if (!shared.startDate || !shared.endDate) return
    const totalGoalViews = youtubeServiceTypes.reduce(
      (sum, st) => sum + (st.goal_views || 0),
      0,
    )
    if (totalGoalViews <= 0) return
    const days = daysBetween(shared.startDate, shared.endDate)
    setYoutubeData((prev) => ({
      ...prev,
      desiredDailyViews: String(Math.round(totalGoalViews / days)),
    }))
  }, [shared.startDate, shared.endDate, youtubeServiceTypes, youtubeData.desiredDailyViewsOverridden])

  // ── Spotify: auto-detect genres from track URL ────────────────────────
  const handleSpotifyUrlChange = useCallback(
    (url: string) => {
      setSpotifyData((prev) => ({ ...prev, streamUrl: url }))

      if (!url.includes("spotify.com/track/")) return
      const trackId = extractSpotifyTrackId(url)
      if (!trackId) return

      // #region agent log
      console.log("[Intake] Spotify URL detected, fetching track:", trackId)
      // #endregion

      setSpotifyData((prev) => ({ ...prev, autoDetectedGenres: [], genres: [] }))
      setIsLoadingSpotifyGenres(true)

      const apiBaseUrl =
        process.env.NEXT_PUBLIC_API_URL ||
        process.env.NEXT_PUBLIC_API_BASE_URL ||
        "https://api.artistinfluence.com"

      fetch(`${apiBaseUrl}/api/spotify-web-api/track/${trackId}`)
        .then((response) => {
          // #region agent log
          console.log("[Intake] Spotify API response:", response.status, response.ok)
          // #endregion
          if (!response.ok) {
            toast({
              title: "Spotify Error",
              description: `Could not fetch track info (status ${response.status}). Select genres manually.`,
              variant: "destructive",
            })
            return null
          }
          return response.json()
        })
        .then((result) => {
          if (!result?.success || !result.data) return
          // #region agent log
          console.log("[Intake] Spotify track data:", result.data.name, result.data.genres)
          // #endregion

          const rawGenres: string[] = result.data.genres || []
          setSpotifyData((prev) => ({
            ...prev,
            autoDetectedGenres: rawGenres,
            genres: rawGenres.length > 0 ? rawGenres : prev.genres,
          }))

          if (result.data.name) {
            const artist = result.data.artists?.[0]?.name
            const track = result.data.name
            const autoName = artist && track ? `${artist} - ${track}` : track
            if (autoName) {
              setShared((prev) => ({
                ...prev,
                campaignName: prev.campaignName || autoName,
              }))
            }
          }

          if (rawGenres.length > 0) {
            toast({
              title: "Genres Auto-Detected",
              description: `Found: ${rawGenres.join(", ")}. You can edit the selection below.`,
            })
          } else {
            toast({
              title: "No Genres Found",
              description: "This artist doesn't have genre tags in Spotify. Select genres manually.",
            })
          }
        })
        .catch((err) => {
          // #region agent log
          console.error("[Intake] Spotify fetch error:", err)
          // #endregion
          toast({
            title: "Spotify Error",
            description: "Could not fetch track information. Select genres manually.",
            variant: "destructive",
          })
        })
        .finally(() => {
          setIsLoadingSpotifyGenres(false)
        })
    },
    [toast],
  )

  const toggleGenre = (genre: string) => {
    setSpotifyData((prev) => {
      const has = prev.genres.includes(genre)
      return {
        ...prev,
        genres: has ? prev.genres.filter((g) => g !== genre) : [...prev.genres, genre],
      }
    })
  }

  // ── Service toggle ────────────────────────────────────────────────────
  const handleServiceToggle = (service: ServiceKey, checked: boolean) => {
    setSelectedServices((prev) => {
      if (checked) return prev.includes(service) ? prev : [...prev, service]
      return prev.filter((item) => item !== service)
    })
    if (checked) setActiveService(service)
  }

  const selectedTabs = useMemo(
    () => SERVICE_OPTIONS.filter((s) => selectedServices.includes(s.key)),
    [selectedServices],
  )

  // ── Client resolution ─────────────────────────────────────────────────
  const ensureClient = async () => {
    console.log("[Intake:ensureClient] mode:", shared.clientMode)
    if (shared.clientMode === "existing") {
      console.log("[Intake:ensureClient] using existing client:", selectedClient?.id, selectedClient?.name)
      return selectedClient || null
    }
    if (!shared.newClientCompany.trim()) return null
    const emails = [shared.newClientEmail1, shared.newClientEmail2, shared.newClientEmail3]
      .map((e) => e.trim())
      .filter((e) => e.length > 0)
    console.log("[Intake:ensureClient] creating new client:", shared.newClientCompany.trim(), "emails:", emails)
    const newClient = await createClient.mutateAsync({
      name: shared.newClientCompany.trim(),
      emails,
      credit_balance: 0,
    })
    console.log("[Intake:ensureClient] new client result:", JSON.stringify(newClient))
    return newClient
  }

  // ── Validation ────────────────────────────────────────────────────────
  const validateShared = () => {
    if (selectedServices.length === 0) return "Select at least one service to submit."
    if (!shared.campaignName.trim()) return "Campaign name is required."
    if (!shared.saleAmount || Number(shared.saleAmount) <= 0) return "Sale amount must be greater than $0."
    if (!shared.startDate) return "Start date is required."
    if (shared.clientMode === "existing" && !shared.clientId) return "Select an existing client or switch to New Client."
    if (shared.clientMode === "new" && !shared.newClientCompany.trim()) return "Company name is required for a new client."
    if (shared.clientMode === "new" && !shared.newClientEmail1.trim()) return "At least one client email is required."
    if (mode === "invoice") {
      if (!invoice.invoiceNumber.trim()) return "Invoice number is required."
      if (!invoice.amount || Number(invoice.amount) <= 0) return "Invoice amount must be greater than $0."
      if (!invoice.clientName.trim()) return "Invoice client name is required."
      if (!invoice.clientEmail.trim()) return "Invoice client email is required."
    }
    return null
  }

  // ── Submit ────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    const sharedError = validateShared()
    if (sharedError) {
      toast({ title: "Missing required fields", description: sharedError, variant: "destructive" })
      return
    }

    setIsSubmitting(true)
    setSubmitResults([])
    const results: Array<{ service: ServiceKey; success: boolean; message: string; campaignId?: string; link?: string }> = []

    try {
      let sourceInvoiceId: string | null = null
      if (mode === "invoice") {
        const invoicePayload = {
          org_id: orgId,
          campaign_id: null,
          invoice_number: invoice.invoiceNumber.trim(),
          amount: Number(invoice.amount),
          status: "pending",
          issued_date: new Date().toISOString().slice(0, 10),
          due_date: invoice.dueDate || null,
          notes: invoice.notes || null,
          client_name: invoice.clientName.trim(),
          client_email: invoice.clientEmail.trim(),
          services_selected: selectedServices,
          intake_payload: {
            invoice,
            shared,
            spotifyData,
            soundcloudData,
            youtubeData,
            youtubeServiceTypes,
            instagramData,
          },
        }

        const { data: invoiceRecord, error: invoiceError } = await coreSupabase
          .from("campaign_invoices")
          .insert(invoicePayload)
          .select("id")
          .single()
        if (invoiceError) throw invoiceError
        sourceInvoiceId = invoiceRecord?.id || null
      }

      const resolvedClient = await ensureClient()
      console.log("[Intake:submit] resolvedClient:", resolvedClient?.id, resolvedClient?.name, "org_id:", (resolvedClient as any)?.org_id)
      if (!resolvedClient) {
        throw new Error("Unable to resolve client details. Please check client information.")
      }

      const salespersonLabel = selectedSalesperson?.label || opsOwner
      console.log("[Intake:submit] clientName:", clientName, "clientEmails:", clientEmails, "salesperson:", salespersonLabel)

      // ── Spotify submission ──────────────────────────────────────────
      if (selectedServices.includes("spotify")) {
        if (!spotifyData.streamUrl) {
          results.push({ service: "spotify", success: false, message: "Spotify stream URL is required." })
        } else if (!spotifyData.streamGoal) {
          results.push({ service: "spotify", success: false, message: "Spotify stream goal is required." })
        } else {
          try {
            const spotifyPayload: Record<string, any> = {
              client_id: resolvedClient.id || null,
              client_name: clientName,
              client_emails: clientEmails,
              campaign_name: shared.campaignName,
              price_paid: Number(shared.saleAmount),
              stream_goal: Number(spotifyData.streamGoal),
              start_date: shared.startDate,
              duration_days: Number(spotifyData.timeframe),
              track_url: spotifyData.streamUrl,
              sfa_url: null,
              notes: spotifyData.internalNotes || null,
              salesperson: salespersonLabel,
              music_genres: spotifyData.genres,
              territory_preferences: [],
            }
            console.log("[Intake:spotify] payload:", JSON.stringify(spotifyPayload))
            const submission = await createSpotifySubmission.mutateAsync(spotifyPayload as any)
            console.log("[Intake:spotify] submission result:", JSON.stringify(submission))
            console.log("[Intake:spotify] submission id:", submission?.id, "type:", typeof submission?.id)
            if (submission?.id && spotifyData.internalNotes) {
              await addNoteHistory({
                service: "spotify",
                campaignId: submission.id,
                noteType: "internal",
                content: spotifyData.internalNotes,
              })
            }
            results.push({ service: "spotify", success: true, message: "Spotify submission created.", campaignId: submission?.id, link: "/dashboard/spotify/submissions" })
          } catch (error: any) {
            console.error("[Intake:spotify] ERROR:", error?.message, error?.code, error?.details, error?.hint)
            results.push({ service: "spotify", success: false, message: error?.message || "Spotify submission failed." })
          }
        }
      }

      // ── SoundCloud submission ───────────────────────────────────────
      if (selectedServices.includes("soundcloud")) {
        if (!soundcloudData.streamUrl) {
          results.push({ service: "soundcloud", success: false, message: "SoundCloud stream URL is required." })
        } else if (!soundcloudData.reachGoalMillions) {
          results.push({ service: "soundcloud", success: false, message: "SoundCloud reach goal is required." })
        } else {
          try {
            // Parse artist and track from campaign name ("Artist - Track")
            const nameParts = shared.campaignName.split(" - ")
            const artistName = nameParts[0]?.trim() || shared.campaignName
            const trackName = nameParts.slice(1).join(" - ").trim() || shared.campaignName

            let scClientId = ""
            // Try to create or find a SoundCloud client from the shared client info
            const { data: existingSc, error: scLookupErr } = await soundcloudSupabase
              .from("soundcloud_clients")
              .select("id")
              .eq("name", clientName)
              .limit(1)
              .maybeSingle()

            if (existingSc) {
              scClientId = existingSc.id
            } else {
              const { data: newScClient, error: scClientErr } = await soundcloudSupabase
                .from("soundcloud_clients")
                .insert({
                  name: clientName,
                  email: clientEmails[0] || null,
                })
                .select()
                .single()
              if (scClientErr) throw scClientErr
              scClientId = newScClient?.id || ""
            }

            const reachPlanned = Number(soundcloudData.reachGoalMillions) * 1_000_000

            const statusMap: Record<string, string> = {
              released: "new",
              unreleased: "unreleased",
              pending: "pending",
            }

            const submissionData: Record<string, any> = {
              client_id: scClientId || undefined,
              owner_id: opsOwnerId,
              track_url: soundcloudData.streamUrl,
              artist_name: artistName,
              track_name: trackName,
              status: statusMap[soundcloudData.status] || "pending",
              expected_reach_planned: reachPlanned,
              support_date: shared.startDate || null,
              notes: null,
              qa_flag: false,
              need_live_link: soundcloudData.status === "unreleased",
              suggested_supporters: [],
              expected_reach_min: 0,
              expected_reach_max: 0,
              submitted_at: new Date().toISOString(),
              created_at: new Date().toISOString(),
            }
            if (sourceInvoiceId) {
              submissionData.source_invoice_id = sourceInvoiceId
              submissionData.invoice_status = "pending"
            }

            const { error, data } = await soundcloudSupabase
              .from("soundcloud_submissions")
              .insert(submissionData)
              .select()
              .single()
            if (error) throw error
            results.push({ service: "soundcloud", success: true, message: "SoundCloud submission created.", campaignId: data?.id, link: "/dashboard/soundcloud/dashboard/campaigns" })
          } catch (error: any) {
            results.push({ service: "soundcloud", success: false, message: error?.message || "SoundCloud submission failed." })
          }
        }
      }

      // ── YouTube submission ──────────────────────────────────────────
      if (selectedServices.includes("youtube")) {
        if (!youtubeData.youtubeUrl) {
          results.push({ service: "youtube", success: false, message: "YouTube video URL is required." })
        } else if (youtubeServiceTypes.every((st) => !st.service_type)) {
          results.push({ service: "youtube", success: false, message: "Add at least one YouTube service type." })
        } else {
          try {
            const goalIssue = youtubeServiceTypes.some(
              (st) => st.service_type !== "engagements_only" && st.goal_views <= 0,
            )
            if (goalIssue) throw new Error("Each YouTube service type requires a goal value.")

            let youtubeClientId = ""
            const clientResult = await youtube.createClient({
              name: clientName,
              email: clientEmails[0] || "",
              company: shared.newClientCompany || clientName,
            })
            if (clientResult.error) throw clientResult.error
            youtubeClientId = clientResult.data?.id || ""

            const totalGoalViews = youtubeServiceTypes.reduce(
              (sum, st) => sum + (st.goal_views || 0),
              0,
            )

            const desiredDaily = Number(youtubeData.desiredDailyViews) || 0

            const ytPayload: Record<string, any> = {
              campaign_name: shared.campaignName,
              youtube_url: youtubeData.youtubeUrl,
              video_id: extractYouTubeVideoId(youtubeData.youtubeUrl) || null,
              service_type:
                (youtubeServiceTypes.find((st) => st.service_type)?.service_type as ServiceType) ||
                "ww_display",
              goal_views: totalGoalViews,
              service_types: youtubeServiceTypes as any,
              sale_price: Number(shared.saleAmount) || null,
              start_date: shared.startDate || null,
              end_date: shared.endDate || null,
              desired_daily: desiredDaily,
              genre: null,
              client_id: youtubeClientId || null,
              salesperson_id: shared.salespersonId || null,
              status: "pending",
              technical_setup_complete: false,
              custom_service_type: null,
              internal_notes: null,
              client_notes: null,
            }
            if (sourceInvoiceId) {
              ytPayload.source_invoice_id = sourceInvoiceId
              ytPayload.invoice_status = "sent"
            }
            const { error, data } = await youtube.createCampaign(ytPayload as any)

            if (error) throw error
            results.push({ service: "youtube", success: true, message: "YouTube campaign created.", campaignId: data?.id, link: "/dashboard/youtube/campaigns" })
          } catch (error: any) {
            results.push({ service: "youtube", success: false, message: error?.message || "YouTube submission failed." })
          }
        }
      }

      // ── Instagram submission ────────────────────────────────────────
      if (selectedServices.includes("instagram")) {
        try {
          const statusMap: Record<string, string> = {
            active: "Active",
            unreleased: "Unreleased",
            pending: "Pending",
          }

          const igPayload: Record<string, any> = {
            campaign: shared.campaignName,
            clients: clientName || "Unknown Client",
            start_date: shared.startDate,
            price: instagramData.salesPrice || shared.saleAmount,
            spend: instagramData.adSpend || undefined,
            status: statusMap[instagramData.status] || "Draft",
            salespeople: salespersonLabel,
            paid_ops: opsOwner,
            report_notes: instagramData.internalNotes || undefined,
            seeding_type: instagramData.seedingType,
            brief: instagramData.internalNotes || undefined,
          }
          if (sourceInvoiceId) {
            igPayload.source_invoice_id = sourceInvoiceId
            igPayload.invoice_status = "pending"
          }
          const campaign = await instagramMutations.createCampaignAsync(igPayload as any)
          if (campaign?.id) {
            if (instagramData.internalNotes) {
              await addNoteHistory({
                service: "instagram",
                campaignId: String(campaign.id),
                noteType: "internal",
                content: instagramData.internalNotes,
              })
            }
            await notifyOpsStatusChange({
              service: "instagram",
              campaignId: String(campaign.id),
              status: "new",
              previousStatus: null,
              campaignName: shared.campaignName,
              actorEmail: user?.email || opsOwner,
            })
            notifySlack("instagram", "campaign_created", {
              campaignId: String(campaign.id),
              campaignName: shared.campaignName,
              actorEmail: user?.email || opsOwner,
            })
          }
          results.push({ service: "instagram", success: true, message: "Instagram campaign created.", campaignId: campaign?.id ? String(campaign.id) : undefined, link: "/dashboard/instagram/campaigns" })
        } catch (error: any) {
          results.push({ service: "instagram", success: false, message: error?.message || "Instagram submission failed." })
        }
      }
    } catch (error: any) {
      selectedServices.forEach((service) =>
        results.push({ service, success: false, message: error?.message || "Submission failed." }),
      )
    } finally {
      setSubmitResults(results)
      setIsSubmitting(false)
    }
  }

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <Card>
      <CardHeader>
        <CardTitle>Unified Campaign Intake</CardTitle>
      </CardHeader>
      <CardContent className="space-y-8">
        {/* ── Service Selection ─────────────────────────────────────── */}
        <div className="space-y-3">
          <Label className="text-base">Choose Services</Label>
          <div className="flex flex-wrap gap-4">
            {SERVICE_OPTIONS.map((service) => {
              const checked = selectedServices.includes(service.key)
              return (
                <label key={service.key} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={checked}
                    onCheckedChange={(value) => handleServiceToggle(service.key, Boolean(value))}
                  />
                  {service.label}
                </label>
              )
            })}
          </div>
        </div>

        {/* ── Invoice Details (invoice mode only) ──────────────────── */}
        {mode === "invoice" && (
          <div className="space-y-4 border rounded-lg p-4">
            <h3 className="text-sm font-semibold uppercase text-muted-foreground">Invoice Details</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label>Invoice Number *</Label>
                <Input
                  value={invoice.invoiceNumber}
                  onChange={(e) => setInvoice((prev) => ({ ...prev, invoiceNumber: e.target.value }))}
                  placeholder="INV-10023"
                />
              </div>
              <div>
                <Label>Invoice Amount (USD) *</Label>
                <Input
                  type="number"
                  min="0"
                  value={invoice.amount}
                  onChange={(e) => setInvoice((prev) => ({ ...prev, amount: e.target.value }))}
                  placeholder="5000"
                />
              </div>
              <div>
                <Label>Invoice Due Date</Label>
                <Input
                  type="date"
                  value={invoice.dueDate}
                  onChange={(e) => setInvoice((prev) => ({ ...prev, dueDate: e.target.value }))}
                />
              </div>
              <div>
                <Label>Client Name *</Label>
                <Input
                  value={invoice.clientName}
                  onChange={(e) => setInvoice((prev) => ({ ...prev, clientName: e.target.value }))}
                  placeholder="Client or Brand Name"
                />
              </div>
              <div className="md:col-span-2">
                <Label>Client Email *</Label>
                <Input
                  type="email"
                  value={invoice.clientEmail}
                  onChange={(e) => setInvoice((prev) => ({ ...prev, clientEmail: e.target.value }))}
                  placeholder="billing@client.com"
                />
              </div>
            </div>
            <div>
              <Label>Invoice Notes</Label>
              <Textarea
                rows={3}
                value={invoice.notes}
                onChange={(e) => setInvoice((prev) => ({ ...prev, notes: e.target.value }))}
                placeholder="Payment terms or invoice notes..."
              />
            </div>
          </div>
        )}

        {/* ── Shared Details ───────────────────────────────────────── */}
        <div className="space-y-4 border rounded-lg p-4">
          <h3 className="text-sm font-semibold uppercase text-muted-foreground">Shared Details</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label>Campaign Name *</Label>
              <Input
                value={shared.campaignName}
                onChange={(e) => setShared((prev) => ({ ...prev, campaignName: e.target.value }))}
                placeholder="Artist - Song/EP/Project Name (e.g. Skrillex - FUS)"
              />
            </div>
            <div>
              <Label>Salesperson *</Label>
              <Select
                value={shared.salespersonId}
                onValueChange={(val) => setShared((prev) => ({ ...prev, salespersonId: val }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select salesperson" />
                </SelectTrigger>
                <SelectContent>
                  {salespeopleOptions.map((sp) => (
                    <SelectItem key={sp.value} value={sp.value}>
                      {sp.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Sale Amount (USD) *</Label>
              <Input
                type="number"
                min="0"
                value={shared.saleAmount}
                onChange={(e) => setShared((prev) => ({ ...prev, saleAmount: e.target.value }))}
                placeholder="5000"
              />
            </div>
            <div>
              <Label>Start Date *</Label>
              <Input
                type="date"
                value={shared.startDate}
                onChange={(e) => setShared((prev) => ({ ...prev, startDate: e.target.value }))}
              />
            </div>
            <div>
              <Label>End Date (optional)</Label>
              <Input
                type="date"
                value={shared.endDate}
                onChange={(e) => setShared((prev) => ({ ...prev, endDate: e.target.value }))}
              />
            </div>
          </div>

          {/* ── Client / Company ──────────────────────────────────── */}
          <div className="space-y-3 border-t pt-4">
            <Label className="text-base">Client / Company *</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant={shared.clientMode === "existing" ? "default" : "outline"}
                onClick={() => setShared((prev) => ({ ...prev, clientMode: "existing" }))}
              >
                Existing Client
              </Button>
              <Button
                type="button"
                size="sm"
                variant={shared.clientMode === "new" ? "default" : "outline"}
                onClick={() => setShared((prev) => ({ ...prev, clientMode: "new" }))}
              >
                New Client
              </Button>
            </div>

            {shared.clientMode === "existing" ? (
              <ClientSelector
                value={shared.clientId}
                onChange={(id) => setShared((prev) => ({ ...prev, clientId: id }))}
                placeholder="Search clients..."
              />
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                <div className="md:col-span-2">
                  <Label>Company Name *</Label>
                  <Input
                    value={shared.newClientCompany}
                    onChange={(e) =>
                      setShared((prev) => ({ ...prev, newClientCompany: e.target.value }))
                    }
                    placeholder="Company or brand name"
                  />
                </div>
                <div>
                  <Label>Client Email 1 *</Label>
                  <Input
                    type="email"
                    value={shared.newClientEmail1}
                    onChange={(e) =>
                      setShared((prev) => ({ ...prev, newClientEmail1: e.target.value }))
                    }
                    placeholder="primary@client.com"
                  />
                </div>
                <div>
                  <Label>Client Email 2</Label>
                  <Input
                    type="email"
                    value={shared.newClientEmail2}
                    onChange={(e) =>
                      setShared((prev) => ({ ...prev, newClientEmail2: e.target.value }))
                    }
                    placeholder="secondary@client.com (optional)"
                  />
                </div>
                <div>
                  <Label>Client Email 3</Label>
                  <Input
                    type="email"
                    value={shared.newClientEmail3}
                    onChange={(e) =>
                      setShared((prev) => ({ ...prev, newClientEmail3: e.target.value }))
                    }
                    placeholder="third@client.com (optional)"
                  />
                </div>
                <div>
                  <Label>Address</Label>
                  <Input
                    value={shared.newClientAddress}
                    onChange={(e) =>
                      setShared((prev) => ({ ...prev, newClientAddress: e.target.value }))
                    }
                    placeholder="Billing address"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Service Tabs ─────────────────────────────────────────── */}
        <Tabs value={activeService} onValueChange={(val) => setActiveService(val as ServiceKey)}>
          <TabsList>
            {selectedTabs.map((service) => (
              <TabsTrigger key={service.key} value={service.key}>
                {service.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {selectedTabs.length === 0 && (
            <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
              Select at least one service to configure campaign details.
            </div>
          )}

          {/* ── Spotify Tab ──────────────────────────────────────── */}
          <TabsContent value="spotify" className="pt-4">
            <div className="space-y-4">
              <div>
                <Label>Stream URL *</Label>
                <Input
                  value={spotifyData.streamUrl}
                  onChange={(e) => handleSpotifyUrlChange(e.target.value)}
                  placeholder="https://open.spotify.com/track/... or private streaming link"
                  disabled={isLoadingSpotifyGenres}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {isLoadingSpotifyGenres
                    ? "Fetching track information from Spotify..."
                    : "Public Spotify URL to auto-detect genres, or a private streaming link for unreleased tracks."}
                </p>
              </div>

              <div className="space-y-2">
                <Label>
                  Genres{" "}
                  {spotifyData.genres.length > 0 && (
                    <span className="text-muted-foreground font-normal">
                      ({spotifyData.genres.length} selected)
                    </span>
                  )}
                </Label>
                {spotifyData.autoDetectedGenres.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Spotify detected: {spotifyData.autoDetectedGenres.join(", ")}. Click to toggle.
                  </p>
                )}
                <div className="flex flex-wrap gap-2 p-3 border rounded-md bg-muted/20 max-h-48 overflow-y-auto">
                  {UNIFIED_GENRES.map((genre) => {
                    const isSelected = spotifyData.genres.includes(genre)
                    const isAutoDetected = spotifyData.autoDetectedGenres.includes(genre)
                    return (
                      <Badge
                        key={genre}
                        variant={isSelected ? "default" : "outline"}
                        className={`cursor-pointer select-none ${
                          isAutoDetected && !isSelected ? "border-green-500/50" : ""
                        }`}
                        onClick={() => toggleGenre(genre)}
                      >
                        {genre}
                        {isAutoDetected && isSelected && (
                          <span className="ml-1 text-xs text-green-400">*</span>
                        )}
                      </Badge>
                    )
                  })}
                </div>
                {!spotifyData.streamUrl.includes("spotify.com/track/") &&
                  spotifyData.autoDetectedGenres.length === 0 && (
                    <p className="text-xs text-muted-foreground">
                      Select genres manually for private/unreleased links.
                    </p>
                  )}
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label>Timeframe *</Label>
                  <RadioGroup
                    value={spotifyData.timeframe}
                    onValueChange={(val) =>
                      setSpotifyData((prev) => ({ ...prev, timeframe: val as "30" | "60" | "90" }))
                    }
                    className="flex gap-4 mt-2"
                  >
                    {(["30", "60", "90"] as const).map((days) => (
                      <div key={days} className="flex items-center space-x-2">
                        <RadioGroupItem value={days} id={`timeframe-${days}`} />
                        <Label htmlFor={`timeframe-${days}`} className="cursor-pointer font-normal">
                          {days} days
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>
                <div>
                  <Label>Stream Goal *</Label>
                  <Input
                    type="number"
                    min="1"
                    value={spotifyData.streamGoal}
                    onChange={(e) =>
                      setSpotifyData((prev) => ({ ...prev, streamGoal: e.target.value }))
                    }
                    placeholder="e.g. 500000"
                  />
                </div>
                <div>
                  <Label>Status</Label>
                  <Select
                    value={spotifyData.status}
                    onValueChange={(val) =>
                      setSpotifyData((prev) => ({
                        ...prev,
                        status: val as "active" | "unreleased" | "pending",
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="unreleased">Unreleased</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Internal Notes</Label>
                <Textarea
                  rows={3}
                  value={spotifyData.internalNotes}
                  onChange={(e) =>
                    setSpotifyData((prev) => ({ ...prev, internalNotes: e.target.value }))
                  }
                  placeholder="Does the artist NOT want certain geographical data? Certain playlists or styles to avoid?"
                />
              </div>
            </div>
          </TabsContent>

          {/* ── SoundCloud Tab ────────────────────────────────────── */}
          <TabsContent value="soundcloud" className="pt-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label>Reach Goal (Millions) *</Label>
                <Input
                  type="number"
                  min="1"
                  value={soundcloudData.reachGoalMillions}
                  onChange={(e) =>
                    setSoundcloudData((prev) => ({ ...prev, reachGoalMillions: e.target.value }))
                  }
                  placeholder="e.g. 10"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  In millions of reach. Examples: 10M, 20M, 60M
                </p>
              </div>
              <div>
                <Label>Status</Label>
                <Select
                  value={soundcloudData.status}
                  onValueChange={(val) =>
                    setSoundcloudData((prev) => ({
                      ...prev,
                      status: val as "released" | "unreleased" | "pending",
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="released">Released</SelectItem>
                    <SelectItem value="unreleased">Unreleased</SelectItem>
                    <SelectItem value="pending">Pending Confirmation</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2">
                <Label>Stream URL *</Label>
                <Input
                  value={soundcloudData.streamUrl}
                  onChange={(e) =>
                    setSoundcloudData((prev) => ({ ...prev, streamUrl: e.target.value }))
                  }
                  placeholder="https://soundcloud.com/..."
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Can be a private or public link depending on the release status.
                </p>
              </div>
            </div>
          </TabsContent>

          {/* ── YouTube Tab ───────────────────────────────────────── */}
          <TabsContent value="youtube" className="pt-4">
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label>YouTube URL *</Label>
                  <Input
                    value={youtubeData.youtubeUrl}
                    onChange={(e) =>
                      setYoutubeData((prev) => ({ ...prev, youtubeUrl: e.target.value }))
                    }
                    placeholder="https://youtube.com/watch?v=..."
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Public, unlisted, or private URL accepted.
                  </p>
                </div>
                <div>
                  <Label>Desired Daily Views</Label>
                  <Input
                    type="number"
                    min="0"
                    value={youtubeData.desiredDailyViews}
                    onChange={(e) =>
                      setYoutubeData((prev) => ({
                        ...prev,
                        desiredDailyViews: e.target.value,
                        desiredDailyViewsOverridden: true,
                      }))
                    }
                    placeholder="Auto-calculated from dates & goal"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {youtubeData.desiredDailyViewsOverridden
                      ? "Manually overridden."
                      : "Auto-calculated from total goal views / campaign days."}
                    {!youtubeData.desiredDailyViewsOverridden && youtubeData.desiredDailyViews && (
                      <button
                        type="button"
                        className="ml-1 underline"
                        onClick={() =>
                          setYoutubeData((prev) => ({
                            ...prev,
                            desiredDailyViewsOverridden: false,
                          }))
                        }
                      >
                        Reset
                      </button>
                    )}
                    {youtubeData.desiredDailyViewsOverridden && (
                      <button
                        type="button"
                        className="ml-1 underline"
                        onClick={() =>
                          setYoutubeData((prev) => ({
                            ...prev,
                            desiredDailyViewsOverridden: false,
                            desiredDailyViews: "",
                          }))
                        }
                      >
                        Reset to auto
                      </button>
                    )}
                  </p>
                </div>
              </div>

              <MultiServiceTypeSelector
                serviceTypes={youtubeServiceTypes}
                onServiceTypesChange={setYoutubeServiceTypes}
              />
            </div>
          </TabsContent>

          {/* ── Instagram Tab ─────────────────────────────────────── */}
          <TabsContent value="instagram" className="pt-4">
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label>Seeding Type *</Label>
                  <Select
                    value={instagramData.seedingType}
                    onValueChange={(val) =>
                      setInstagramData((prev) => ({
                        ...prev,
                        seedingType: val as "audio" | "footage",
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="audio">Audio Seeding</SelectItem>
                      <SelectItem value="footage">Footage Seeding</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    Audio: lyric videos, music memes, covers. Footage: DJ sets, festivals, live
                    performances.
                  </p>
                </div>
                <div>
                  <Label>Status</Label>
                  <Select
                    value={instagramData.status}
                    onValueChange={(val) =>
                      setInstagramData((prev) => ({
                        ...prev,
                        status: val as "active" | "unreleased" | "pending",
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="unreleased">Unreleased</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Sales Price (USD)</Label>
                  <Input
                    type="number"
                    min="0"
                    value={instagramData.salesPrice}
                    onChange={(e) => {
                      setInstagramData((prev) => ({ ...prev, salesPrice: e.target.value }))
                    }}
                    placeholder={shared.saleAmount || "Pre-filled from sale amount"}
                  />
                </div>
                <div>
                  <Label>Ad Spend (USD)</Label>
                  <Input
                    type="number"
                    min="0"
                    value={instagramData.adSpend}
                    onChange={(e) =>
                      setInstagramData((prev) => ({
                        ...prev,
                        adSpend: e.target.value,
                        adSpendOverridden: true,
                      }))
                    }
                    placeholder="Auto-calculated at 70% of sales price"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {instagramData.adSpendOverridden
                      ? "Manually overridden."
                      : "Auto-calculated as 70% of the sales price."}
                    {instagramData.adSpendOverridden && (
                      <button
                        type="button"
                        className="ml-1 underline"
                        onClick={() =>
                          setInstagramData((prev) => ({
                            ...prev,
                            adSpendOverridden: false,
                            adSpend: String(
                              Math.round(Number(prev.salesPrice) * 0.7 * 100) / 100,
                            ),
                          }))
                        }
                      >
                        Reset to 70%
                      </button>
                    )}
                  </p>
                </div>
              </div>

              <div>
                <Label>Internal Notes</Label>
                <Textarea
                  rows={4}
                  value={instagramData.internalNotes}
                  onChange={(e) =>
                    setInstagramData((prev) => ({ ...prev, internalNotes: e.target.value }))
                  }
                  placeholder="Any specific pages we must use, creative details, content guidelines, special requirements..."
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* ── Submit ───────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Submitting..." : "Submit Selected Campaigns"}
          </Button>
          {submitResults.length > 0 && (
            <div className="text-sm text-muted-foreground">
              {submitResults.filter((r) => r.success).length} of {submitResults.length} campaigns
              submitted successfully.
            </div>
          )}
        </div>

        {submitResults.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold">Submission Results</h4>
            <div className="space-y-1">
              {submitResults.map((result) => (
                <div
                  key={`${result.service}-${result.message}`}
                  className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                >
                  <span className="font-medium capitalize">{result.service}</span>
                  <div className="flex items-center gap-3">
                    <span className={result.success ? "text-green-600" : "text-red-600"}>
                      {result.message}
                    </span>
                    {result.success && result.link && (
                      <Link
                        href={result.link}
                        className="text-xs underline text-blue-500 hover:text-blue-700"
                      >
                        View Campaign →
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
