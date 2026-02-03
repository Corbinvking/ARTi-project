"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/hooks/use-auth"
import { ClientSelector } from "@/app/(dashboard)/spotify/stream-strategist/components/ClientSelector"
import { useClients, useCreateClient } from "@/app/(dashboard)/spotify/stream-strategist/hooks/useClients"
import { useCreateCampaignSubmission } from "@/app/(dashboard)/spotify/stream-strategist/hooks/useCampaignSubmissions"
import { supabase as soundcloudSupabase } from "@/app/(dashboard)/soundcloud/soundcloud-app/integrations/supabase/client"
import { useCampaigns as useYouTubeCampaigns } from "@/app/(dashboard)/youtube/vidi-health-flow/hooks/useCampaigns"
import { MultiServiceTypeSelector } from "@/app/(dashboard)/youtube/vidi-health-flow/components/campaigns/MultiServiceTypeSelector"
import type { Database } from "@/app/(dashboard)/youtube/vidi-health-flow/integrations/supabase/types"
import { useInstagramCampaignMutations } from "@/app/(dashboard)/instagram/seedstorm-builder/hooks/useInstagramCampaignMutations"
import { supabase as coreSupabase } from "@/lib/auth"
import { saveOverride } from "@/lib/overrides"
import { OverrideField } from "@/components/overrides/OverrideField"

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

const parseEmailList = (value: string) =>
  value
    .split(",")
    .map((email) => email.trim())
    .filter((email) => email.length > 0)

const extractYouTubeVideoId = (url: string) => {
  const match = url.match(
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
  )
  return match?.[1] || ""
}

export function UnifiedCampaignIntake({ mode = "standard" }: { mode?: "standard" | "invoice" }) {
  const { toast } = useToast()
  const { user } = useAuth()
  const { data: clients = [] } = useClients()
  const createClient = useCreateClient()
  const createSpotifySubmission = useCreateCampaignSubmission()
  const youtube = useYouTubeCampaigns()
  const instagramMutations = useInstagramCampaignMutations()

  const [selectedServices, setSelectedServices] = useState<ServiceKey[]>(["spotify"])
  const [activeService, setActiveService] = useState<ServiceKey>("spotify")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitResults, setSubmitResults] = useState<
    Array<{ service: ServiceKey; success: boolean; message: string }>
  >([])

  const [shared, setShared] = useState({
    campaignName: "",
    budget: "",
    startDate: "",
    endDate: "",
    internalNotes: "",
    clientNotes: "",
    salesperson: "",
  })

  const [invoice, setInvoice] = useState({
    invoiceNumber: "",
    amount: "",
    dueDate: "",
    clientName: "",
    clientEmail: "",
    notes: "",
  })

  const [spotifyData, setSpotifyData] = useState({
    clientMode: "existing" as "existing" | "new",
    clientId: "",
    clientName: "",
    clientEmails: "",
    trackUrl: "",
    sfaUrl: "",
    streamGoal: "",
    durationDays: "90",
    genres: "",
    territories: "",
  })

  const [soundcloudData, setSoundcloudData] = useState({
    clientId: "",
    newClientName: "",
    newClientEmail: "",
    artistName: "",
    trackName: "",
    trackUrl: "",
    expectedReach: "",
    supportDate: "",
    ownerId: "",
  })

  const [youtubeData, setYoutubeData] = useState({
    youtubeUrl: "",
    genre: "",
    salePrice: "",
    salespersonId: "",
    clientId: "",
    opsOwner: "",
    adsOwner: "",
    campaignOwner: "",
  })
  const [youtubeServiceTypes, setYoutubeServiceTypes] = useState<ServiceTypeGoal[]>([
    { id: "1", service_type: "" as ServiceType, goal_views: 0 },
  ])

  const [instagramData, setInstagramData] = useState({
    soundUrl: "",
    paidOps: "",
    salespeople: "",
  })

  const [soundcloudClients, setSoundcloudClients] = useState<
    Array<{ id: string; name: string; email: string | null }>
  >([])

  const [intakeOverrides, setIntakeOverrides] = useState<
    Record<string, { overridden: boolean; original?: string; reason?: string }>
  >({})

  const opsOwner = user?.email || user?.name || ""
  const opsOwnerId = user?.id || null
  const orgId = user?.tenantId || "00000000-0000-0000-0000-000000000001"

  const isOverridden = (fieldKey: string) => Boolean(intakeOverrides[fieldKey]?.overridden)

  const recordOverride = (fieldKey: string, originalValue: string, reason?: string) => {
    setIntakeOverrides((prev) => ({
      ...prev,
      [fieldKey]: { overridden: true, original: originalValue, reason },
    }))
  }

  const clearOverride = (fieldKey: string) => {
    setIntakeOverrides((prev) => ({
      ...prev,
      [fieldKey]: { overridden: false, original: prev[fieldKey]?.original, reason: undefined },
    }))
  }

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

  const persistOverrides = async ({
    service,
    campaignId,
    entries,
  }: {
    service: ServiceKey
    campaignId: string
    entries: Array<{ fieldKey: string; value: unknown; originalValue?: unknown }>
  }) => {
    for (const entry of entries) {
      const override = intakeOverrides[entry.fieldKey]
      if (!override?.overridden) continue
      await saveOverride({
        service,
        campaignId,
        fieldKey: entry.fieldKey,
        originalValue: override.original ?? entry.originalValue,
        overrideValue: entry.value,
        overrideReason: override.reason,
        orgId,
        overriddenBy: opsOwnerId,
      })
    }
  }

  useEffect(() => {
    if (!shared.salesperson && user?.email && !isOverridden("salesperson")) {
      setShared((prev) => ({ ...prev, salesperson: user.email || "" }))
    }
  }, [shared.salesperson, user?.email, intakeOverrides])

  useEffect(() => {
    if (mode === "invoice" && invoice.amount && !shared.budget) {
      setShared((prev) => ({ ...prev, budget: invoice.amount }))
    }
  }, [mode, invoice.amount, shared.budget])

  useEffect(() => {
    if (spotifyData.clientMode === "existing" && spotifyData.clientId) {
      const selected = clients.find((client) => client.id === spotifyData.clientId)
      if (selected) {
        setSpotifyData((prev) => ({
          ...prev,
          clientName: isOverridden("client_name") ? prev.clientName : selected.name,
          clientEmails: isOverridden("client_emails")
            ? prev.clientEmails
            : (selected.emails || []).join(", "),
        }))
      }
    }
  }, [clients, spotifyData.clientId, spotifyData.clientMode, intakeOverrides])

  useEffect(() => {
    if (!opsOwner) return
    setYoutubeData((prev) => ({
      ...prev,
      opsOwner: isOverridden("ops_owner") ? prev.opsOwner : prev.opsOwner || opsOwner,
      adsOwner: isOverridden("ads_owner") ? prev.adsOwner : prev.adsOwner || opsOwner,
      campaignOwner: isOverridden("campaign_owner") ? prev.campaignOwner : prev.campaignOwner || opsOwner,
    }))
  }, [opsOwner, intakeOverrides])

  useEffect(() => {
    if (!opsOwner) return
    setInstagramData((prev) => ({
      ...prev,
      paidOps: isOverridden("paid_ops") ? prev.paidOps : prev.paidOps || opsOwner,
      salespeople: isOverridden("salespeople")
        ? prev.salespeople
        : prev.salespeople || shared.salesperson || opsOwner,
    }))
  }, [opsOwner, shared.salesperson, intakeOverrides])

  useEffect(() => {
    if (opsOwnerId && !isOverridden("owner_id")) {
      setSoundcloudData((prev) => ({
        ...prev,
        ownerId: prev.ownerId || opsOwnerId,
      }))
    }
  }, [opsOwnerId, intakeOverrides])

  useEffect(() => {
    let mounted = true
    const loadClients = async () => {
      const { data } = await soundcloudSupabase
        .from("soundcloud_clients")
        .select("id, name, email")
        .order("name")
      if (mounted && data) {
        setSoundcloudClients(data)
      }
    }
    loadClients()
    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    if (selectedServices.length > 0 && !selectedServices.includes(activeService)) {
      setActiveService(selectedServices[0])
    }
  }, [activeService, selectedServices])

  const handleServiceToggle = (service: ServiceKey, checked: boolean) => {
    setSelectedServices((prev) => {
      if (checked) {
        return prev.includes(service) ? prev : [...prev, service]
      }
      return prev.filter((item) => item !== service)
    })
    if (checked) {
      setActiveService(service)
    }
  }

  const selectedTabs = useMemo(
    () => SERVICE_OPTIONS.filter((service) => selectedServices.includes(service.key)),
    [selectedServices],
  )

  const selectedSpotifyClient = useMemo(
    () => clients.find((client) => client.id === spotifyData.clientId),
    [clients, spotifyData.clientId],
  )

  const ensureSpotifyClient = async () => {
    if (spotifyData.clientMode === "existing") {
      const selected = clients.find((client) => client.id === spotifyData.clientId)
      return selected || null
    }

    if (!spotifyData.clientName.trim()) {
      return null
    }

    const emails = parseEmailList(spotifyData.clientEmails)
    const newClient = await createClient.mutateAsync({
      name: spotifyData.clientName.trim(),
      emails,
      credit_balance: 0,
    })
    return newClient
  }

  const validateShared = () => {
    if (selectedServices.length === 0) {
      return "Select at least one service to submit."
    }
    if (!shared.campaignName.trim()) {
      return "Campaign name is required."
    }
    if (!shared.budget || Number(shared.budget) <= 0) {
      return "Budget must be greater than $0."
    }
    if (!shared.startDate) {
      return "Start date is required."
    }
    if (mode === "invoice") {
      if (!invoice.invoiceNumber.trim()) {
        return "Invoice number is required."
      }
      if (!invoice.amount || Number(invoice.amount) <= 0) {
        return "Invoice amount must be greater than $0."
      }
      if (!invoice.clientName.trim()) {
        return "Invoice client name is required."
      }
      if (!invoice.clientEmail.trim()) {
        return "Invoice client email is required."
      }
    }
    return null
  }

  const handleSubmit = async () => {
    const sharedError = validateShared()
    if (sharedError) {
      toast({ title: "Missing required fields", description: sharedError, variant: "destructive" })
      return
    }

    setIsSubmitting(true)
    setSubmitResults([])
    const results: Array<{ service: ServiceKey; success: boolean; message: string }> = []

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

      const sharedClient = selectedServices.includes("spotify") ? await ensureSpotifyClient() : null

      if (selectedServices.includes("spotify") && !sharedClient) {
        throw new Error("Unable to resolve Spotify client details.")
      }

      if (selectedServices.includes("spotify")) {
        if (!shared.salesperson && !opsOwner) {
          results.push({
            service: "spotify",
            success: false,
            message: "Unable to determine ops owner for Spotify.",
          })
        } else if (spotifyData.clientMode === "existing" && !spotifyData.clientId) {
          results.push({
            service: "spotify",
            success: false,
            message: "Select an existing Spotify client.",
          })
        } else if (spotifyData.clientMode === "new" && !spotifyData.clientName.trim()) {
          results.push({
            service: "spotify",
            success: false,
            message: "Enter a new Spotify client name.",
          })
        } else if (spotifyData.clientMode === "new" && !spotifyData.clientEmails.trim()) {
          results.push({
            service: "spotify",
            success: false,
            message: "Enter at least one Spotify client email.",
          })
        } else if (!spotifyData.trackUrl || !spotifyData.streamGoal) {
          results.push({
            service: "spotify",
            success: false,
            message: "Spotify track URL and stream goal are required.",
          })
        } else if (parseEmailList(spotifyData.clientEmails).length === 0) {
          results.push({
            service: "spotify",
            success: false,
            message: "Spotify requires at least one client email.",
          })
        } else {
          try {
            const submission = await createSpotifySubmission.mutateAsync({
              client_id: sharedClient?.id || null,
              client_name: spotifyData.clientName || sharedClient?.name || "",
              client_emails: parseEmailList(spotifyData.clientEmails),
              campaign_name: shared.campaignName,
              price_paid: Number(shared.budget),
              stream_goal: Number(spotifyData.streamGoal),
              start_date: shared.startDate,
              duration_days: Number(spotifyData.durationDays || 90),
              track_url: spotifyData.trackUrl,
              sfa_url: spotifyData.sfaUrl || null,
              notes: shared.internalNotes,
              internal_notes: shared.internalNotes || null,
              client_notes: shared.clientNotes || null,
              source_invoice_id: sourceInvoiceId,
              invoice_status: mode === "invoice" ? "pending" : undefined,
              salesperson: shared.salesperson || opsOwner,
              music_genres: parseEmailList(spotifyData.genres),
              territory_preferences: parseEmailList(spotifyData.territories),
            })
            if (submission?.id) {
              await addNoteHistory({
                service: "spotify",
                campaignId: submission.id,
                noteType: "internal",
                content: shared.internalNotes,
              })
              await addNoteHistory({
                service: "spotify",
                campaignId: submission.id,
                noteType: "client",
                content: shared.clientNotes,
              })
              await persistOverrides({
                service: "spotify",
                campaignId: submission.id,
                entries: [
                  {
                    fieldKey: "salesperson",
                    value: shared.salesperson,
                    originalValue: opsOwner,
                  },
                  {
                    fieldKey: "client_name",
                    value: spotifyData.clientName,
                    originalValue: selectedSpotifyClient?.name || "",
                  },
                  {
                    fieldKey: "client_emails",
                    value: spotifyData.clientEmails,
                    originalValue: (selectedSpotifyClient?.emails || []).join(", "),
                  },
                ],
              })
            }
            results.push({
              service: "spotify",
              success: true,
              message: "Spotify submission created.",
            })
          } catch (error: any) {
            results.push({
              service: "spotify",
              success: false,
              message: error?.message || "Spotify submission failed.",
            })
          }
        }
      }

      if (selectedServices.includes("soundcloud")) {
          if (!soundcloudData.ownerId && !opsOwnerId) {
          results.push({
            service: "soundcloud",
            success: false,
            message: "Unable to determine ops owner for SoundCloud.",
          })
        } else if (
          !soundcloudData.trackUrl ||
          !soundcloudData.artistName ||
          !soundcloudData.trackName ||
          !soundcloudData.expectedReach
        ) {
          results.push({
            service: "soundcloud",
            success: false,
            message: "SoundCloud requires artist, track, URL, and expected reach.",
          })
        } else {
          try {
            let clientId = soundcloudData.clientId
            if (!clientId && soundcloudData.newClientName.trim()) {
              const { data: newClient, error: clientError } = await soundcloudSupabase
                .from("soundcloud_clients")
                .insert({
                  name: soundcloudData.newClientName.trim(),
                  email: soundcloudData.newClientEmail.trim() || null,
                })
                .select()
                .single()
              if (clientError) throw clientError
              clientId = newClient?.id || ""
            }

            if (!clientId) {
              throw new Error("SoundCloud client is required.")
            }

            const submissionData = {
              org_id: "00000000-0000-0000-0000-000000000001",
              client_id: clientId,
              member_id: null,
              owner_id: soundcloudData.ownerId || opsOwnerId,
              track_url: soundcloudData.trackUrl,
              artist_name: soundcloudData.artistName,
              track_name: soundcloudData.trackName,
              status: "new",
              expected_reach_planned: Number(soundcloudData.expectedReach) || 0,
              support_date: soundcloudData.supportDate || shared.startDate || null,
              notes: shared.internalNotes || null,
              internal_notes: shared.internalNotes || null,
              client_notes: shared.clientNotes || null,
              source_invoice_id: sourceInvoiceId,
              invoice_status: mode === "invoice" ? "pending" : undefined,
              qa_flag: false,
              need_live_link: false,
              suggested_supporters: [],
              expected_reach_min: 0,
              expected_reach_max: 0,
              submitted_at: new Date().toISOString(),
              created_at: new Date().toISOString(),
            }

            const { error, data } = await soundcloudSupabase
              .from("soundcloud_submissions")
              .insert(submissionData)
              .select()
              .single()
            if (error) throw error
            if (data?.id) {
              await addNoteHistory({
                service: "soundcloud",
                campaignId: data.id,
                noteType: "internal",
                content: shared.internalNotes,
              })
              await addNoteHistory({
                service: "soundcloud",
                campaignId: data.id,
                noteType: "client",
                content: shared.clientNotes,
              })
              await persistOverrides({
                service: "soundcloud",
                campaignId: data.id,
                entries: [
                  {
                    fieldKey: "owner_id",
                    value: soundcloudData.ownerId || opsOwnerId,
                    originalValue: opsOwnerId,
                  },
                ],
              })
            }

            results.push({
              service: "soundcloud",
              success: true,
              message: "SoundCloud submission created.",
            })
          } catch (error: any) {
            results.push({
              service: "soundcloud",
              success: false,
              message: error?.message || "SoundCloud submission failed.",
            })
          }
        }
      }

      if (selectedServices.includes("youtube")) {
          if (!youtubeData.opsOwner && !opsOwner) {
          results.push({
            service: "youtube",
            success: false,
            message: "Unable to determine ops owner for YouTube.",
          })
        } else if (!youtubeData.youtubeUrl) {
          results.push({
            service: "youtube",
            success: false,
            message: "YouTube video URL is required.",
          })
        } else if (youtubeServiceTypes.every((st) => !st.service_type)) {
          results.push({
            service: "youtube",
            success: false,
            message: "Add at least one YouTube service type.",
          })
        } else {
          try {
            const goalIssue = youtubeServiceTypes.some(
              (st) => st.service_type !== "engagements_only" && st.goal_views <= 0,
            )
            if (goalIssue) {
              throw new Error("Each YouTube service type requires a goal value.")
            }

            let youtubeClientId = youtubeData.clientId
            if (!youtubeClientId && spotifyData.clientName) {
              const clientResult = await youtube.createClient({
                name: spotifyData.clientName,
                email: parseEmailList(spotifyData.clientEmails)[0] || "",
                company: "",
              })
              if (clientResult.error) throw clientResult.error
              youtubeClientId = clientResult.data?.id || ""
            }

            const totalGoalViews = youtubeServiceTypes.reduce(
              (sum, serviceType) => sum + (serviceType.goal_views || 0),
              0,
            )

            const ownershipNote = `OpsOwner:${youtubeData.opsOwner || opsOwner};AdsOwner:${youtubeData.adsOwner || opsOwner};CampaignOwner:${youtubeData.campaignOwner || opsOwner}`
            const customServiceType = [shared.internalNotes?.trim(), ownershipNote]
              .filter(Boolean)
              .join(" | ")

            const { error, data } = await youtube.createCampaign({
              campaign_name: shared.campaignName,
              youtube_url: youtubeData.youtubeUrl,
              video_id: extractYouTubeVideoId(youtubeData.youtubeUrl) || null,
              service_type:
                (youtubeServiceTypes.find((st) => st.service_type)?.service_type as ServiceType) ||
                "ww_display",
              goal_views: totalGoalViews,
              service_types: youtubeServiceTypes as any,
              sale_price: Number(youtubeData.salePrice || shared.budget) || null,
              start_date: shared.startDate || null,
              end_date: shared.endDate || null,
              desired_daily: 0,
              genre: youtubeData.genre || null,
              client_id: youtubeClientId || null,
              salesperson_id: youtubeData.salespersonId || null,
              status: "pending",
              technical_setup_complete: false,
              custom_service_type: customServiceType || null,
              internal_notes: shared.internalNotes || null,
              client_notes: shared.clientNotes || null,
              source_invoice_id: sourceInvoiceId,
              invoice_status: mode === "invoice" ? "sent" : undefined,
            })

            if (error) throw error
            if (data?.id) {
              await addNoteHistory({
                service: "youtube",
                campaignId: data.id,
                noteType: "internal",
                content: shared.internalNotes,
              })
              await addNoteHistory({
                service: "youtube",
                campaignId: data.id,
                noteType: "client",
                content: shared.clientNotes,
              })
              await persistOverrides({
                service: "youtube",
                campaignId: data.id,
                entries: [
                  {
                    fieldKey: "ops_owner",
                    value: youtubeData.opsOwner || opsOwner,
                    originalValue: opsOwner,
                  },
                  {
                    fieldKey: "ads_owner",
                    value: youtubeData.adsOwner || opsOwner,
                    originalValue: opsOwner,
                  },
                  {
                    fieldKey: "campaign_owner",
                    value: youtubeData.campaignOwner || opsOwner,
                    originalValue: opsOwner,
                  },
                ],
              })
            }

            results.push({
              service: "youtube",
              success: true,
              message: "YouTube campaign created.",
            })
          } catch (error: any) {
            results.push({
              service: "youtube",
              success: false,
              message: error?.message || "YouTube submission failed.",
            })
          }
        }
      }

      if (selectedServices.includes("instagram")) {
        try {
          if (!instagramData.paidOps && !opsOwner) {
            throw new Error("Unable to determine ops owner for Instagram.")
          }
          const campaign = await instagramMutations.createCampaignAsync({
            campaign: shared.campaignName,
            clients: spotifyData.clientName || spotifyData.clientEmails || "Unknown Client",
            start_date: shared.startDate,
            price: shared.budget,
            sound_url: instagramData.soundUrl || undefined,
            status: "Draft",
            salespeople: instagramData.salespeople || shared.salesperson || opsOwner,
            paid_ops: instagramData.paidOps || opsOwner,
            report_notes: shared.internalNotes || undefined,
            client_notes: shared.clientNotes || undefined,
            source_invoice_id: sourceInvoiceId || undefined,
            invoice_status: mode === "invoice" ? "pending" : undefined,
          })
          if (campaign?.id) {
            await addNoteHistory({
              service: "instagram",
              campaignId: String(campaign.id),
              noteType: "internal",
              content: shared.internalNotes,
            })
            await addNoteHistory({
              service: "instagram",
              campaignId: String(campaign.id),
              noteType: "client",
              content: shared.clientNotes,
            })
            await persistOverrides({
              service: "instagram",
              campaignId: String(campaign.id),
              entries: [
                {
                  fieldKey: "paid_ops",
                  value: instagramData.paidOps || opsOwner,
                  originalValue: opsOwner,
                },
                {
                  fieldKey: "salespeople",
                  value: instagramData.salespeople || shared.salesperson || opsOwner,
                  originalValue: shared.salesperson || opsOwner,
                },
              ],
            })
          }
          results.push({
            service: "instagram",
            success: true,
            message: "Instagram campaign created.",
          })
        } catch (error: any) {
          results.push({
            service: "instagram",
            success: false,
            message: error?.message || "Instagram submission failed.",
          })
        }
      }
    } catch (error: any) {
      selectedServices.forEach((service) =>
        results.push({
          service,
          success: false,
          message: error?.message || "Submission failed.",
        }),
      )
    } finally {
      setSubmitResults(results)
      setIsSubmitting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Unified Campaign Intake</CardTitle>
      </CardHeader>
      <CardContent className="space-y-8">
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

        {mode === "invoice" && (
          <div className="space-y-4 border rounded-lg p-4">
            <h3 className="text-sm font-semibold uppercase text-muted-foreground">Invoice Details</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label>Invoice Number *</Label>
                <Input
                  value={invoice.invoiceNumber}
                  onChange={(event) =>
                    setInvoice((prev) => ({ ...prev, invoiceNumber: event.target.value }))
                  }
                  placeholder="INV-10023"
                />
              </div>
              <div>
                <Label>Invoice Amount (USD) *</Label>
                <Input
                  type="number"
                  min="0"
                  value={invoice.amount}
                  onChange={(event) =>
                    setInvoice((prev) => ({ ...prev, amount: event.target.value }))
                  }
                  placeholder="5000"
                />
              </div>
              <div>
                <Label>Invoice Due Date</Label>
                <Input
                  type="date"
                  value={invoice.dueDate}
                  onChange={(event) =>
                    setInvoice((prev) => ({ ...prev, dueDate: event.target.value }))
                  }
                />
              </div>
              <div>
                <Label>Client Name *</Label>
                <Input
                  value={invoice.clientName}
                  onChange={(event) =>
                    setInvoice((prev) => ({ ...prev, clientName: event.target.value }))
                  }
                  placeholder="Client or Brand Name"
                />
              </div>
              <div className="md:col-span-2">
                <Label>Client Email *</Label>
                <Input
                  type="email"
                  value={invoice.clientEmail}
                  onChange={(event) =>
                    setInvoice((prev) => ({ ...prev, clientEmail: event.target.value }))
                  }
                  placeholder="billing@client.com"
                />
              </div>
            </div>
            <div>
              <Label>Invoice Notes</Label>
              <Textarea
                rows={3}
                value={invoice.notes}
                onChange={(event) => setInvoice((prev) => ({ ...prev, notes: event.target.value }))}
                placeholder="Payment terms or invoice notes..."
              />
            </div>
          </div>
        )}

        <div className="space-y-4 border rounded-lg p-4">
          <h3 className="text-sm font-semibold uppercase text-muted-foreground">Shared Details</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label>Campaign Name *</Label>
              <Input
                value={shared.campaignName}
                onChange={(event) =>
                  setShared((prev) => ({ ...prev, campaignName: event.target.value }))
                }
                placeholder="Artist - Track / Campaign Name"
              />
            </div>
            <div>
              <Label>Budget (USD) *</Label>
              <Input
                type="number"
                min="0"
                value={shared.budget}
                onChange={(event) =>
                  setShared((prev) => ({ ...prev, budget: event.target.value }))
                }
                placeholder="5000"
              />
            </div>
            <div>
              <Label>Start Date *</Label>
              <Input
                type="date"
                value={shared.startDate}
                onChange={(event) =>
                  setShared((prev) => ({ ...prev, startDate: event.target.value }))
                }
              />
            </div>
            <div>
              <Label>End Date (optional)</Label>
              <Input
                type="date"
                value={shared.endDate}
                onChange={(event) =>
                  setShared((prev) => ({ ...prev, endDate: event.target.value }))
                }
              />
            </div>
            <div>
              <OverrideField
                label="Salesperson (email/name)"
                value={shared.salesperson}
                suggestedValue={opsOwner}
                overridden={isOverridden("salesperson")}
                placeholder="sales@artistinfluence.com"
                onOverride={(value, reason) => {
                  setShared((prev) => ({ ...prev, salesperson: value }))
                  recordOverride("salesperson", opsOwner, reason)
                }}
                onRevert={() => {
                  setShared((prev) => ({ ...prev, salesperson: opsOwner }))
                  clearOverride("salesperson")
                }}
              />
            </div>
          </div>

          <div>
            <Label>Internal Notes (Ops Only)</Label>
            <Textarea
              rows={3}
              value={shared.internalNotes}
              onChange={(event) =>
                setShared((prev) => ({ ...prev, internalNotes: event.target.value }))
              }
              placeholder="Internal ops notes..."
            />
          </div>
          <div>
            <Label>Client Notes (Visible to Clients)</Label>
            <Textarea
              rows={3}
              value={shared.clientNotes}
              onChange={(event) =>
                setShared((prev) => ({ ...prev, clientNotes: event.target.value }))
              }
              placeholder="Client-facing notes..."
            />
          </div>
        </div>

        <Tabs value={activeService} onValueChange={(value) => setActiveService(value as ServiceKey)}>
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

          <TabsContent value="spotify" className="pt-4">
            <div className="space-y-4">
              <div className="space-y-3">
                <Label>Spotify Client *</Label>
                <p className="text-xs text-muted-foreground">
                  Select an existing Spotify client or create a new one for this campaign.
                </p>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={spotifyData.clientMode === "existing" ? "default" : "outline"}
                    onClick={() =>
                      setSpotifyData((prev) => ({ ...prev, clientMode: "existing" }))
                    }
                  >
                    Existing
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={spotifyData.clientMode === "new" ? "default" : "outline"}
                    onClick={() => setSpotifyData((prev) => ({ ...prev, clientMode: "new" }))}
                  >
                    New
                  </Button>
                </div>

                {spotifyData.clientMode === "existing" ? (
                <div className="space-y-3">
                  <ClientSelector
                    value={spotifyData.clientId}
                    onChange={(clientId) =>
                      setSpotifyData((prev) => ({ ...prev, clientId }))
                    }
                    placeholder="Search clients..."
                  />
                  {selectedSpotifyClient && (
                    <div className="grid gap-3 md:grid-cols-2">
                      <OverrideField
                        label="Client name (override)"
                        value={spotifyData.clientName}
                        suggestedValue={selectedSpotifyClient.name}
                        overridden={isOverridden("client_name")}
                        placeholder="Client name"
                        onOverride={(value, reason) => {
                          setSpotifyData((prev) => ({ ...prev, clientName: value }))
                          recordOverride("client_name", selectedSpotifyClient.name, reason)
                        }}
                        onRevert={() => {
                          setSpotifyData((prev) => ({ ...prev, clientName: selectedSpotifyClient.name }))
                          clearOverride("client_name")
                        }}
                      />
                      <OverrideField
                        label="Client emails (override)"
                        value={spotifyData.clientEmails}
                        suggestedValue={(selectedSpotifyClient.emails || []).join(", ")}
                        overridden={isOverridden("client_emails")}
                        placeholder="Client emails (comma-separated)"
                        onOverride={(value, reason) => {
                          setSpotifyData((prev) => ({ ...prev, clientEmails: value }))
                          recordOverride(
                            "client_emails",
                            (selectedSpotifyClient.emails || []).join(", "),
                            reason,
                          )
                        }}
                        onRevert={() => {
                          setSpotifyData((prev) => ({
                            ...prev,
                            clientEmails: (selectedSpotifyClient.emails || []).join(", "),
                          }))
                          clearOverride("client_emails")
                        }}
                      />
                    </div>
                  )}
                </div>
                ) : (
                  <div className="grid gap-3 md:grid-cols-2">
                    <Input
                      placeholder="Client name"
                      value={spotifyData.clientName}
                      onChange={(event) =>
                        setSpotifyData((prev) => ({
                          ...prev,
                          clientName: event.target.value,
                        }))
                      }
                    />
                    <Input
                      placeholder="Client emails (comma-separated)"
                      value={spotifyData.clientEmails}
                      onChange={(event) =>
                        setSpotifyData((prev) => ({
                          ...prev,
                          clientEmails: event.target.value,
                        }))
                      }
                    />
                  </div>
                )}
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label>Spotify Track URL *</Label>
                  <Input
                    value={spotifyData.trackUrl}
                    onChange={(event) =>
                      setSpotifyData((prev) => ({ ...prev, trackUrl: event.target.value }))
                    }
                    placeholder="https://open.spotify.com/track/..."
                  />
                </div>
                <div>
                  <Label>Spotify for Artists URL</Label>
                  <Input
                    value={spotifyData.sfaUrl}
                    onChange={(event) =>
                      setSpotifyData((prev) => ({ ...prev, sfaUrl: event.target.value }))
                    }
                    placeholder="https://artists.spotify.com/..."
                  />
                </div>
                <div>
                  <Label>Stream Goal *</Label>
                  <Input
                    type="number"
                    min="1"
                    value={spotifyData.streamGoal}
                    onChange={(event) =>
                      setSpotifyData((prev) => ({ ...prev, streamGoal: event.target.value }))
                    }
                  />
                </div>
                <div>
                  <Label>Duration (days)</Label>
                  <Input
                    type="number"
                    min="1"
                    value={spotifyData.durationDays}
                    onChange={(event) =>
                      setSpotifyData((prev) => ({ ...prev, durationDays: event.target.value }))
                    }
                  />
                </div>
                <div>
                  <Label>Genres (comma-separated)</Label>
                  <Input
                    value={spotifyData.genres}
                    onChange={(event) =>
                      setSpotifyData((prev) => ({ ...prev, genres: event.target.value }))
                    }
                    placeholder="pop, hip-hop"
                  />
                </div>
                <div>
                  <Label>Territory Preferences</Label>
                  <Input
                    value={spotifyData.territories}
                    onChange={(event) =>
                      setSpotifyData((prev) => ({ ...prev, territories: event.target.value }))
                    }
                    placeholder="United States, Europe"
                  />
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="soundcloud" className="pt-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label>SoundCloud Client *</Label>
                <p className="text-xs text-muted-foreground">
                  Choose an existing SoundCloud client or add a new one below.
                </p>
                <select
                  className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={soundcloudData.clientId}
                  onChange={(event) =>
                    setSoundcloudData((prev) => ({
                      ...prev,
                      clientId: event.target.value,
                    }))
                  }
                >
                  <option value="">Select existing client</option>
                  {soundcloudClients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label>New Client (optional)</Label>
                <Input
                  value={soundcloudData.newClientName}
                  onChange={(event) =>
                    setSoundcloudData((prev) => ({
                      ...prev,
                      newClientName: event.target.value,
                    }))
                  }
                  placeholder="Create a new client"
                />
              </div>
              <div>
                <Label>New Client Email</Label>
                <Input
                  type="email"
                  value={soundcloudData.newClientEmail}
                  onChange={(event) =>
                    setSoundcloudData((prev) => ({
                      ...prev,
                      newClientEmail: event.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <OverrideField
                  label="Ops Owner ID (override)"
                  value={soundcloudData.ownerId}
                  suggestedValue={opsOwnerId || ""}
                  overridden={isOverridden("owner_id")}
                  placeholder="Ops owner user id"
                  onOverride={(value, reason) => {
                    setSoundcloudData((prev) => ({ ...prev, ownerId: value }))
                    recordOverride("owner_id", String(opsOwnerId || ""), reason)
                  }}
                  onRevert={() => {
                    setSoundcloudData((prev) => ({ ...prev, ownerId: opsOwnerId || "" }))
                    clearOverride("owner_id")
                  }}
                />
                <p className="text-xs text-muted-foreground">
                  Defaults to your user id. Override only if needed.
                </p>
              </div>
              <div>
                <Label>Artist Name *</Label>
                <Input
                  value={soundcloudData.artistName}
                  onChange={(event) =>
                    setSoundcloudData((prev) => ({
                      ...prev,
                      artistName: event.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <Label>Track Name *</Label>
                <Input
                  value={soundcloudData.trackName}
                  onChange={(event) =>
                    setSoundcloudData((prev) => ({
                      ...prev,
                      trackName: event.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <Label>Track URL *</Label>
                <Input
                  value={soundcloudData.trackUrl}
                  onChange={(event) =>
                    setSoundcloudData((prev) => ({ ...prev, trackUrl: event.target.value }))
                  }
                  placeholder="https://soundcloud.com/..."
                />
              </div>
              <div>
                <Label>Expected Reach Planned *</Label>
                <Input
                  type="number"
                  min="1"
                  value={soundcloudData.expectedReach}
                  onChange={(event) =>
                    setSoundcloudData((prev) => ({
                      ...prev,
                      expectedReach: event.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <Label>Support Date</Label>
                <Input
                  type="date"
                  value={soundcloudData.supportDate}
                  onChange={(event) =>
                    setSoundcloudData((prev) => ({
                      ...prev,
                      supportDate: event.target.value,
                    }))
                  }
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="youtube" className="pt-4">
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label>YouTube Video URL *</Label>
                  <Input
                    value={youtubeData.youtubeUrl}
                    onChange={(event) =>
                      setYoutubeData((prev) => ({ ...prev, youtubeUrl: event.target.value }))
                    }
                    placeholder="https://youtube.com/watch?v=..."
                  />
                </div>
                <div>
                  <Label>Genre</Label>
                  <Input
                    value={youtubeData.genre}
                    onChange={(event) =>
                      setYoutubeData((prev) => ({ ...prev, genre: event.target.value }))
                    }
                  />
                </div>
                <div>
                  <Label>Budget (USD)</Label>
                  <Input
                    type="number"
                    min="0"
                    value={youtubeData.salePrice}
                    onChange={(event) =>
                      setYoutubeData((prev) => ({ ...prev, salePrice: event.target.value }))
                    }
                    placeholder={shared.budget || "5000"}
                  />
                </div>
                <div>
                  <Label>YouTube Client</Label>
                  <select
                    className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={youtubeData.clientId}
                    onChange={(event) =>
                      setYoutubeData((prev) => ({ ...prev, clientId: event.target.value }))
                    }
                  >
                    <option value="">Use Spotify client</option>
                    {youtube.clients?.map((client) => (
                      <option key={client.id} value={client.id}>
                        {client.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label>Salesperson</Label>
                  <select
                    className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={youtubeData.salespersonId}
                    onChange={(event) =>
                      setYoutubeData((prev) => ({ ...prev, salespersonId: event.target.value }))
                    }
                  >
                    <option value="">Unassigned</option>
                    {youtube.salespersons?.map((person) => (
                      <option key={person.id} value={person.id}>
                        {person.name}
                      </option>
                    ))}
                  </select>
                </div>
                <OverrideField
                  label="Ops Owner (override)"
                  value={youtubeData.opsOwner}
                  suggestedValue={opsOwner}
                  overridden={isOverridden("ops_owner")}
                  placeholder="ops@artistinfluence.com"
                  onOverride={(value, reason) => {
                    setYoutubeData((prev) => ({ ...prev, opsOwner: value }))
                    recordOverride("ops_owner", opsOwner, reason)
                  }}
                  onRevert={() => {
                    setYoutubeData((prev) => ({ ...prev, opsOwner: opsOwner }))
                    clearOverride("ops_owner")
                  }}
                />
                <OverrideField
                  label="Ads Owner (override)"
                  value={youtubeData.adsOwner}
                  suggestedValue={opsOwner}
                  overridden={isOverridden("ads_owner")}
                  placeholder="ads@artistinfluence.com"
                  onOverride={(value, reason) => {
                    setYoutubeData((prev) => ({ ...prev, adsOwner: value }))
                    recordOverride("ads_owner", opsOwner, reason)
                  }}
                  onRevert={() => {
                    setYoutubeData((prev) => ({ ...prev, adsOwner: opsOwner }))
                    clearOverride("ads_owner")
                  }}
                />
                <OverrideField
                  label="Campaign Owner (override)"
                  value={youtubeData.campaignOwner}
                  suggestedValue={opsOwner}
                  overridden={isOverridden("campaign_owner")}
                  placeholder="campaign@artistinfluence.com"
                  onOverride={(value, reason) => {
                    setYoutubeData((prev) => ({ ...prev, campaignOwner: value }))
                    recordOverride("campaign_owner", opsOwner, reason)
                  }}
                  onRevert={() => {
                    setYoutubeData((prev) => ({ ...prev, campaignOwner: opsOwner }))
                    clearOverride("campaign_owner")
                  }}
                />
              </div>

              <MultiServiceTypeSelector
                serviceTypes={youtubeServiceTypes}
                onServiceTypesChange={setYoutubeServiceTypes}
              />
            </div>
          </TabsContent>

          <TabsContent value="instagram" className="pt-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label>Sound URL (optional)</Label>
                <Input
                  value={instagramData.soundUrl}
                  onChange={(event) =>
                    setInstagramData((prev) => ({ ...prev, soundUrl: event.target.value }))
                  }
                  placeholder="https://..."
                />
              </div>
              <OverrideField
                label="Paid Ops (override)"
                value={instagramData.paidOps}
                suggestedValue={opsOwner}
                overridden={isOverridden("paid_ops")}
                placeholder="ops@artistinfluence.com"
                onOverride={(value, reason) => {
                  setInstagramData((prev) => ({ ...prev, paidOps: value }))
                  recordOverride("paid_ops", opsOwner, reason)
                }}
                onRevert={() => {
                  setInstagramData((prev) => ({ ...prev, paidOps: opsOwner }))
                  clearOverride("paid_ops")
                }}
              />
              <OverrideField
                label="Salespeople (override)"
                value={instagramData.salespeople}
                suggestedValue={shared.salesperson || opsOwner}
                overridden={isOverridden("salespeople")}
                placeholder="sales@artistinfluence.com"
                onOverride={(value, reason) => {
                  setInstagramData((prev) => ({ ...prev, salespeople: value }))
                  recordOverride("salespeople", shared.salesperson || opsOwner, reason)
                }}
                onRevert={() => {
                  setInstagramData((prev) => ({
                    ...prev,
                    salespeople: shared.salesperson || opsOwner,
                  }))
                  clearOverride("salespeople")
                }}
              />
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Submitting..." : "Submit Selected Campaigns"}
          </Button>
          {submitResults.length > 0 && (
            <div className="text-sm text-muted-foreground">
              {submitResults.filter((result) => result.success).length} of {submitResults.length}{" "}
              campaigns submitted successfully.
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
                  <span className={result.success ? "text-green-600" : "text-red-600"}>
                    {result.message}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
