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
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { supabase } from "../../integrations/supabase/client"
import { useToast } from "../../hooks/use-toast"
import {
  Eye,
  EyeOff,
  Lock,
  Save,
  ChevronDown,
  Clock,
  RefreshCw,
  CalendarDays,
  ListMusic,
  MessageSquare,
  Target,
  FileText,
} from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"

// Note categories for internal notes
const INTERNAL_NOTE_CATEGORIES = [
  { id: "scheduling", label: "Scheduling Rationale", icon: CalendarDays },
  { id: "channel_swap", label: "Channel Swaps", icon: RefreshCw },
  { id: "reconnection", label: "Reconnection Issues", icon: RefreshCw },
  { id: "playlist_reminder", label: "Playlist Reminders", icon: ListMusic },
  { id: "general", label: "General Notes", icon: MessageSquare },
] as const

// Note categories for client notes
const CLIENT_NOTE_CATEGORIES = [
  { id: "run_window", label: "Run Window", icon: Clock },
  { id: "reach_framing", label: "Expected Reach/Repost Count", icon: Target },
  { id: "playlist_instructions", label: "Playlist Instructions", icon: ListMusic },
  { id: "general", label: "General Notes", icon: FileText },
] as const

type InternalNoteCategory = typeof INTERNAL_NOTE_CATEGORIES[number]["id"]
type ClientNoteCategory = typeof CLIENT_NOTE_CATEGORIES[number]["id"]

interface StructuredNotes {
  [category: string]: {
    content: string
    updatedAt?: string
    updatedBy?: string
  }
}

interface NotesPanelProps {
  submissionId: string
  submissionType: "submission" | "campaign"
  internalNotes?: string | null
  clientNotes?: string | null
  isClientView?: boolean // If true, only show client notes
  onUpdate?: () => void
}

// Parse JSON notes or return as general note
const parseNotes = (notes: string | null | undefined): StructuredNotes => {
  if (!notes) return {}

  try {
    const parsed = JSON.parse(notes)
    if (typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed
    }
  } catch {
    // Not JSON, treat as general note
  }

  return {
    general: {
      content: notes,
      updatedAt: new Date().toISOString(),
    },
  }
}

// Serialize structured notes back to JSON
const serializeNotes = (notes: StructuredNotes): string => {
  return JSON.stringify(notes)
}

interface NoteSectionProps {
  category: typeof INTERNAL_NOTE_CATEGORIES[number] | typeof CLIENT_NOTE_CATEGORIES[number]
  value: { content: string; updatedAt?: string; updatedBy?: string }
  onChange: (content: string) => void
  disabled?: boolean
}

const NoteSection = ({
  category,
  value,
  onChange,
  disabled = false,
}: NoteSectionProps) => {
  const [isOpen, setIsOpen] = useState(!!value?.content)
  const Icon = category.icon

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          className="w-full justify-between p-2 h-auto"
          type="button"
        >
          <div className="flex items-center gap-2">
            <Icon className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">{category.label}</span>
            {value?.content && (
              <Badge variant="secondary" className="text-xs">
                Has notes
              </Badge>
            )}
          </div>
          <ChevronDown
            className={cn(
              "w-4 h-4 transition-transform",
              isOpen && "rotate-180"
            )}
          />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="px-2 pb-2">
        <Textarea
          value={value?.content || ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={`Add ${category.label.toLowerCase()}...`}
          rows={3}
          disabled={disabled}
          className="mt-2"
        />
        {value?.updatedAt && (
          <p className="text-xs text-muted-foreground mt-1">
            Last updated: {format(new Date(value.updatedAt), "MMM d, yyyy HH:mm")}
          </p>
        )}
      </CollapsibleContent>
    </Collapsible>
  )
}

export const NotesPanel = ({
  submissionId,
  submissionType,
  internalNotes,
  clientNotes,
  isClientView = false,
  onUpdate,
}: NotesPanelProps) => {
  const { toast } = useToast()
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<"internal" | "client">(
    isClientView ? "client" : "internal"
  )

  // Parse structured notes
  const [internalStructured, setInternalStructured] = useState<StructuredNotes>(
    () => parseNotes(internalNotes)
  )
  const [clientStructured, setClientStructured] = useState<StructuredNotes>(
    () => parseNotes(clientNotes)
  )

  // Track if notes have been modified
  const [hasChanges, setHasChanges] = useState(false)

  // Update internal note category
  const updateInternalNote = (category: InternalNoteCategory, content: string) => {
    setInternalStructured((prev) => ({
      ...prev,
      [category]: {
        content,
        updatedAt: new Date().toISOString(),
      },
    }))
    setHasChanges(true)
  }

  // Update client note category
  const updateClientNote = (category: ClientNoteCategory, content: string) => {
    setClientStructured((prev) => ({
      ...prev,
      [category]: {
        content,
        updatedAt: new Date().toISOString(),
      },
    }))
    setHasChanges(true)
  }

  // Save notes
  const handleSave = async () => {
    setSaving(true)
    try {
      const tableName =
        submissionType === "submission" ? "submissions" : "soundcloud_campaigns"

      const updateData: Record<string, any> = {}

      if (!isClientView) {
        updateData.internal_notes = serializeNotes(internalStructured)
      }
      updateData.client_notes = serializeNotes(clientStructured)

      const { error } = await supabase
        .from(tableName)
        .update(updateData)
        .eq("id", submissionId)

      if (error) throw error

      // Record in notes history
      const { data: userData } = await supabase.auth.getUser()
      await supabase.from("campaign_note_history").insert({
        service: "soundcloud",
        campaign_id: submissionId,
        note_type: activeTab,
        previous_content:
          activeTab === "internal" ? internalNotes : clientNotes,
        new_content:
          activeTab === "internal"
            ? serializeNotes(internalStructured)
            : serializeNotes(clientStructured),
        changed_by: userData.user?.id,
      })

      toast({
        title: "Notes Saved",
        description: "Your notes have been updated successfully",
      })

      setHasChanges(false)
      onUpdate?.()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save notes",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-primary" />
            <CardTitle className="text-lg">Campaign Notes</CardTitle>
          </div>
          {hasChanges && (
            <Badge variant="outline" className="bg-amber-50 border-amber-200">
              Unsaved changes
            </Badge>
          )}
        </div>
        <CardDescription>
          {isClientView
            ? "Notes and instructions for your campaign"
            : "Separate internal notes (ops-only) from client-visible notes"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isClientView ? (
          // Client view - only show client notes
          <div className="space-y-3">
            {CLIENT_NOTE_CATEGORIES.map((category) => (
              <NoteSection
                key={category.id}
                category={category}
                value={clientStructured[category.id] || { content: "" }}
                onChange={(content) =>
                  updateClientNote(category.id as ClientNoteCategory, content)
                }
                disabled={true} // Clients can only view
              />
            ))}
          </div>
        ) : (
          // Ops view - show both tabs
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="internal" className="flex items-center gap-2">
                <Lock className="w-4 h-4" />
                Internal (Ops Only)
              </TabsTrigger>
              <TabsTrigger value="client" className="flex items-center gap-2">
                <Eye className="w-4 h-4" />
                Client Visible
              </TabsTrigger>
            </TabsList>

            <TabsContent value="internal" className="space-y-2">
              <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-md mb-3">
                <EyeOff className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">
                  These notes are only visible to ops team
                </span>
              </div>
              {INTERNAL_NOTE_CATEGORIES.map((category) => (
                <NoteSection
                  key={category.id}
                  category={category}
                  value={internalStructured[category.id] || { content: "" }}
                  onChange={(content) =>
                    updateInternalNote(
                      category.id as InternalNoteCategory,
                      content
                    )
                  }
                />
              ))}
            </TabsContent>

            <TabsContent value="client" className="space-y-2">
              <div className="flex items-center gap-2 p-2 bg-green-50 rounded-md mb-3">
                <Eye className="w-4 h-4 text-green-600" />
                <span className="text-xs text-green-700">
                  These notes are visible to the client
                </span>
              </div>
              {CLIENT_NOTE_CATEGORIES.map((category) => (
                <NoteSection
                  key={category.id}
                  category={category}
                  value={clientStructured[category.id] || { content: "" }}
                  onChange={(content) =>
                    updateClientNote(category.id as ClientNoteCategory, content)
                  }
                />
              ))}
            </TabsContent>
          </Tabs>
        )}

        {!isClientView && (
          <div className="flex justify-end mt-4 pt-4 border-t">
            <Button onClick={handleSave} disabled={saving || !hasChanges}>
              <Save className="w-4 h-4 mr-2" />
              {saving ? "Saving..." : "Save Notes"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
