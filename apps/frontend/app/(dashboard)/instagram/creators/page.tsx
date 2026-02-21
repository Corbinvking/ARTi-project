"use client";

import { useState, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/components/ui/use-toast";
import {
  Search, Plus, Upload, Download, RefreshCw, ArrowUpDown, Loader2, Edit, ChevronDown, ChevronUp, X
} from "lucide-react";
import { supabase } from "@/lib/auth";
import { useQueryClient } from "@tanstack/react-query";
import { useCreatorsTable, CreatorRow } from "../seedstorm-builder/hooks/useCreatorsTable";
import { CREATOR_CONTENT_TYPES, TERRITORY_BUCKETS } from "../seedstorm-builder/lib/genreSystem";
import { useNiches } from "../seedstorm-builder/hooks/useNiches";
import Papa from "papaparse";

type SortKey = 'followers' | 'median_views' | 'engagement_rate' | 'cp1k' | 'reel_rate' | 'instagram_handle';
type SortDir = 'asc' | 'desc';

const SORT_OPTIONS: { label: string; key: SortKey; dir: SortDir }[] = [
  { label: "CP1K (low to high)", key: "cp1k", dir: "asc" },
  { label: "Median Views (high to low)", key: "median_views", dir: "desc" },
  { label: "Engagement Rate (high to low)", key: "engagement_rate", dir: "desc" },
  { label: "Followers (high to low)", key: "followers", dir: "desc" },
  { label: "Rate per Reel (low to high)", key: "reel_rate", dir: "asc" },
  { label: "Rate per Reel (high to low)", key: "reel_rate", dir: "desc" },
  { label: "Handle (A-Z)", key: "instagram_handle", dir: "asc" },
];

function fmtNum(v: number | null | undefined): string {
  if (v == null) return "N/A";
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
  return v.toLocaleString();
}

function fmtPct(v: number | null | undefined): string {
  if (v == null) return "N/A";
  return `${(v * 100).toFixed(2)}%`;
}

function fmtDollar(v: number | null | undefined): string {
  if (v == null) return "N/A";
  return `$${v.toFixed(2)}`;
}

export default function InstagramCreatorsPage() {
  const { creators, isLoading, refetch } = useCreatorsTable();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { niches: allNiches, addNiche } = useNiches();

  const [searchQuery, setSearchQuery] = useState("");
  const [nicheFilter, setNicheFilter] = useState("all");
  const [accountTerritoryFilter, setAccountTerritoryFilter] = useState("all");
  const [audienceTerritoryFilter, setAudienceTerritoryFilter] = useState("all");
  const [contentTypeFilter, setContentTypeFilter] = useState("all");
  const [followersMin, setFollowersMin] = useState("");
  const [followersMax, setFollowersMax] = useState("");
  const [medianViewsMin, setMedianViewsMin] = useState("");
  const [medianViewsMax, setMedianViewsMax] = useState("");
  const [engagementMin, setEngagementMin] = useState("");
  const [engagementMax, setEngagementMax] = useState("");
  const [cp1kMin, setCp1kMin] = useState("");
  const [cp1kMax, setCp1kMax] = useState("");
  const [sortIdx, setSortIdx] = useState(0);
  const [showFilters, setShowFilters] = useState(false);

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingCreator, setEditingCreator] = useState<CreatorRow | null>(null);

  const [addForm, setAddForm] = useState({ handle: "", email: "", reel_rate: "", genres: [] as string[], content_types: [] as string[] });
  const [editForm, setEditForm] = useState({ handle: "", email: "", reel_rate: "", genres: [] as string[], content_types: [] as string[] });

  const [refreshingHandle, setRefreshingHandle] = useState<string | null>(null);
  const [refreshingAll, setRefreshingAll] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  const sortOption = SORT_OPTIONS[sortIdx];

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase();
    const fMin = followersMin ? Number(followersMin) : null;
    const fMax = followersMax ? Number(followersMax) : null;
    const mvMin = medianViewsMin ? Number(medianViewsMin) : null;
    const mvMax = medianViewsMax ? Number(medianViewsMax) : null;
    const eMin = engagementMin ? Number(engagementMin) / 100 : null;
    const eMax = engagementMax ? Number(engagementMax) / 100 : null;
    const cMin = cp1kMin ? Number(cp1kMin) : null;
    const cMax = cp1kMax ? Number(cp1kMax) : null;

    return creators
      .filter((c) => {
        if (q) {
          const match =
            c.instagram_handle.toLowerCase().includes(q) ||
            (c.email || "").toLowerCase().includes(q) ||
            c.music_genres.some((g) => g.toLowerCase().includes(q)) ||
            c.content_types.some((t) => t.toLowerCase().includes(q));
          if (!match) return false;
        }
        if (nicheFilter !== "all" && !c.music_genres.includes(nicheFilter)) return false;
        if (accountTerritoryFilter !== "all" && c.account_territory !== accountTerritoryFilter) return false;
        if (audienceTerritoryFilter !== "all" && c.audience_territory !== audienceTerritoryFilter) return false;
        if (contentTypeFilter !== "all" && !c.content_types.includes(contentTypeFilter)) return false;
        if (fMin != null && c.followers < fMin) return false;
        if (fMax != null && c.followers > fMax) return false;
        if (mvMin != null && (c.median_views == null || c.median_views < mvMin)) return false;
        if (mvMax != null && (c.median_views == null || c.median_views > mvMax)) return false;
        if (eMin != null && c.engagement_rate < eMin) return false;
        if (eMax != null && c.engagement_rate > eMax) return false;
        if (cMin != null && (c.cp1k == null || c.cp1k < cMin)) return false;
        if (cMax != null && (c.cp1k == null || c.cp1k > cMax)) return false;
        return true;
      })
      .sort((a, b) => {
        const key = sortOption.key;
        let av = a[key] as any;
        let bv = b[key] as any;
        if (av == null) av = sortOption.dir === "asc" ? Infinity : -Infinity;
        if (bv == null) bv = sortOption.dir === "asc" ? Infinity : -Infinity;
        if (typeof av === "string") av = av.toLowerCase();
        if (typeof bv === "string") bv = bv.toLowerCase();
        return sortOption.dir === "asc" ? (av < bv ? -1 : av > bv ? 1 : 0) : (av > bv ? -1 : av < bv ? 1 : 0);
      });
  }, [creators, searchQuery, nicheFilter, accountTerritoryFilter, audienceTerritoryFilter, contentTypeFilter, followersMin, followersMax, medianViewsMin, medianViewsMax, engagementMin, engagementMax, cp1kMin, cp1kMax, sortOption]);

  const refreshCreator = useCallback(async (handle: string) => {
    setRefreshingHandle(handle);
    try {
      const res = await fetch("/api/instagram-scraper/creator-refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ handles: [handle] }),
      });
      const json = await res.json();
      if (json.success) {
        toast({ title: "Refreshed", description: `@${handle} metrics updated` });
        refetch();
      } else {
        toast({ title: "Error", description: json.error || "Refresh failed", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Network error", variant: "destructive" });
    } finally {
      setRefreshingHandle(null);
    }
  }, [refetch, toast]);

  const refreshAll = useCallback(async () => {
    setRefreshingAll(true);
    const handles = creators.map((c) => c.instagram_handle).slice(0, 50);
    try {
      const res = await fetch("/api/instagram-scraper/creator-refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ handles }),
      });
      const json = await res.json();
      if (json.success) {
        toast({ title: "Refresh complete", description: `${json.results?.length || 0} creators processed` });
        refetch();
      }
    } catch {
      toast({ title: "Error", description: "Refresh failed", variant: "destructive" });
    } finally {
      setRefreshingAll(false);
    }
  }, [creators, refetch, toast]);

  const handleAddCreator = async () => {
    const handle = addForm.handle.replace(/^@/, "").trim();
    if (!handle) { toast({ title: "Error", description: "Handle is required", variant: "destructive" }); return; }
    if (!addForm.reel_rate || Number(addForm.reel_rate) <= 0) { toast({ title: "Error", description: "Rate per Reel is required", variant: "destructive" }); return; }
    if (addForm.genres.length === 0) { toast({ title: "Error", description: "At least one niche required", variant: "destructive" }); return; }
    if (addForm.content_types.length === 0) { toast({ title: "Error", description: "At least one content type required", variant: "destructive" }); return; }

    const { error } = await supabase.from("creators").insert({
      instagram_handle: handle,
      email: addForm.email || null,
      reel_rate: Number(addForm.reel_rate),
      music_genres: addForm.genres,
      content_types: addForm.content_types,
      base_country: "",
      followers: 0,
      median_views_per_video: 0,
      engagement_rate: 0,
      scrape_status: "pending",
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Creator added", description: `@${handle} added — scraping queued` });
    setIsAddOpen(false);
    setAddForm({ handle: "", email: "", reel_rate: "", genres: [], content_types: [] });
    refetch();
    fetch("/api/instagram-scraper/creator-refresh", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ handles: [handle] }),
    }).catch(() => {});
  };

  const handleEditCreator = async () => {
    if (!editingCreator) return;
    const { error } = await supabase.from("creators").update({
      email: editForm.email || null,
      reel_rate: Number(editForm.reel_rate) || 0,
      music_genres: editForm.genres,
      content_types: editForm.content_types,
    }).eq("id", editingCreator.id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Updated", description: `@${editingCreator.instagram_handle} updated` });
    setIsEditOpen(false);
    refetch();
  };

  const openEdit = (c: CreatorRow) => {
    setEditingCreator(c);
    setEditForm({
      handle: c.instagram_handle,
      email: c.email || "",
      reel_rate: String(c.reel_rate || ""),
      genres: [...c.music_genres],
      content_types: [...c.content_types],
    });
    setIsEditOpen(true);
  };

  const handleImportCSV = (file: File) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const rows = results.data as any[];
        const handles: string[] = [];
        let inserted = 0;
        for (const row of rows) {
          const handle = (row.handle || row.instagram_handle || row.Handle || row.Instagram || "").replace(/^@/, "").trim();
          if (!handle) continue;
          const { error } = await supabase.from("creators").upsert({
            instagram_handle: handle,
            email: row.email || row.Email || null,
            reel_rate: Number(row.reel_rate || row.rate_per_reel || row.Rate || 0),
            music_genres: (row.genres || row.music_genres || "").split(/[,;|]/).map((s: string) => s.trim()).filter(Boolean),
            content_types: (row.content_types || row.content_type || "").split(/[,;|]/).map((s: string) => s.trim()).filter(Boolean),
            base_country: row.country || row.base_country || "",
            scrape_status: "pending",
          }, { onConflict: "instagram_handle" });
          if (!error) {
            handles.push(handle);
            inserted++;
          }
        }
        toast({ title: "Import complete", description: `${inserted} creators imported` });
        setImportOpen(false);
        refetch();
        if (handles.length > 0) {
          fetch("/api/instagram-scraper/creator-refresh", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ handles: handles.slice(0, 50) }),
          }).catch(() => {});
        }
      },
    });
  };

  const handleExport = () => {
    const headers = ["Handle", "Email", "Followers", "Median Views", "Engagement Rate", "Account Territory", "Audience Territory", "Niches", "Content Types", "Rate per Reel", "Reel Rate %", "CP1K"];
    const rows = filtered.map((c) => [
      `@${c.instagram_handle}`,
      c.email || "",
      c.followers,
      c.median_views ?? "N/A",
      c.engagement_rate ? `${(c.engagement_rate * 100).toFixed(2)}%` : "N/A",
      c.account_territory,
      c.audience_territory,
      c.music_genres.join("; "),
      c.content_types.join("; "),
      c.reel_rate || "",
      c.reel_rate_pct != null ? `${c.reel_rate_pct.toFixed(1)}%` : "N/A",
      c.cp1k != null ? `$${c.cp1k.toFixed(2)}` : "N/A",
    ]);
    const csv = [headers, ...rows].map((r) => r.map((cell) => `"${cell}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `creators-export-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  const uniqueNiches = useMemo(() => {
    const set = new Set<string>();
    creators.forEach((c) => c.music_genres.forEach((g) => set.add(g)));
    return Array.from(set).sort();
  }, [creators]);

  const clearFilters = () => {
    setSearchQuery("");
    setNicheFilter("all");
    setAccountTerritoryFilter("all");
    setAudienceTerritoryFilter("all");
    setContentTypeFilter("all");
    setFollowersMin("");
    setFollowersMax("");
    setMedianViewsMin("");
    setMedianViewsMax("");
    setEngagementMin("");
    setEngagementMax("");
    setCp1kMin("");
    setCp1kMax("");
  };

  const hasActiveFilters = nicheFilter !== "all" || accountTerritoryFilter !== "all" || audienceTerritoryFilter !== "all" || contentTypeFilter !== "all" || followersMin || followersMax || medianViewsMin || medianViewsMax || engagementMin || engagementMax || cp1kMin || cp1kMax;

  return (
    <div className="container mx-auto p-6 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Creator Database</h1>
          <p className="text-muted-foreground text-sm">Source of truth for page selection and analysis</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button size="sm" onClick={() => setIsAddOpen(true)}><Plus className="h-4 w-4 mr-1" />Add Creator</Button>
          <Button size="sm" variant="outline" onClick={() => setImportOpen(true)}><Upload className="h-4 w-4 mr-1" />Import CSV</Button>
          <Button size="sm" variant="outline" onClick={handleExport}><Download className="h-4 w-4 mr-1" />Export</Button>
          <Button size="sm" variant="outline" onClick={refreshAll} disabled={refreshingAll}>
            <RefreshCw className={`h-4 w-4 mr-1 ${refreshingAll ? "animate-spin" : ""}`} />Refresh All
          </Button>
        </div>
      </div>

      {/* Search + Sort + Filter toggle */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search handle, email, niche, content type..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
        </div>
        <Select value={String(sortIdx)} onValueChange={(v) => setSortIdx(Number(v))}>
          <SelectTrigger className="w-[220px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((o, i) => <SelectItem key={i} value={String(i)}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button size="sm" variant={showFilters ? "secondary" : "outline"} onClick={() => setShowFilters(!showFilters)}>
          {showFilters ? <ChevronUp className="h-4 w-4 mr-1" /> : <ChevronDown className="h-4 w-4 mr-1" />}Filters
        </Button>
        {hasActiveFilters && <Button size="sm" variant="ghost" onClick={clearFilters}><X className="h-3 w-3 mr-1" />Clear</Button>}
      </div>

      {/* Filter panel */}
      {showFilters && (
        <Card className="border-border/50">
          <CardContent className="p-4 grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <Label className="text-xs">Niche</Label>
              <Select value={nicheFilter} onValueChange={setNicheFilter}><SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger><SelectContent>{["all", ...uniqueNiches].map((g) => <SelectItem key={g} value={g}>{g === "all" ? "All Niches" : g}</SelectItem>)}</SelectContent></Select>
            </div>
            <div>
              <Label className="text-xs">Account Territory</Label>
              <Select value={accountTerritoryFilter} onValueChange={setAccountTerritoryFilter}><SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger><SelectContent>{["all", ...TERRITORY_BUCKETS].map((t) => <SelectItem key={t} value={t}>{t === "all" ? "All" : t}</SelectItem>)}</SelectContent></Select>
            </div>
            <div>
              <Label className="text-xs">Audience Territory</Label>
              <Select value={audienceTerritoryFilter} onValueChange={setAudienceTerritoryFilter}><SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger><SelectContent>{["all", ...TERRITORY_BUCKETS].map((t) => <SelectItem key={t} value={t}>{t === "all" ? "All" : t}</SelectItem>)}</SelectContent></Select>
            </div>
            <div>
              <Label className="text-xs">Content Type</Label>
              <Select value={contentTypeFilter} onValueChange={setContentTypeFilter}><SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger><SelectContent>{["all", ...CREATOR_CONTENT_TYPES].map((t) => <SelectItem key={t} value={t}>{t === "all" ? "All" : t}</SelectItem>)}</SelectContent></Select>
            </div>
            <div>
              <Label className="text-xs">Followers (min/max)</Label>
              <div className="flex gap-1"><Input className="h-8 text-xs" placeholder="Min" value={followersMin} onChange={(e) => setFollowersMin(e.target.value)} /><Input className="h-8 text-xs" placeholder="Max" value={followersMax} onChange={(e) => setFollowersMax(e.target.value)} /></div>
            </div>
            <div>
              <Label className="text-xs">Median Views (min/max)</Label>
              <div className="flex gap-1"><Input className="h-8 text-xs" placeholder="Min" value={medianViewsMin} onChange={(e) => setMedianViewsMin(e.target.value)} /><Input className="h-8 text-xs" placeholder="Max" value={medianViewsMax} onChange={(e) => setMedianViewsMax(e.target.value)} /></div>
            </div>
            <div>
              <Label className="text-xs">Engagement % (min/max)</Label>
              <div className="flex gap-1"><Input className="h-8 text-xs" placeholder="Min %" value={engagementMin} onChange={(e) => setEngagementMin(e.target.value)} /><Input className="h-8 text-xs" placeholder="Max %" value={engagementMax} onChange={(e) => setEngagementMax(e.target.value)} /></div>
            </div>
            <div>
              <Label className="text-xs">CP1K $ (min/max)</Label>
              <div className="flex gap-1"><Input className="h-8 text-xs" placeholder="Min" value={cp1kMin} onChange={(e) => setCp1kMin(e.target.value)} /><Input className="h-8 text-xs" placeholder="Max" value={cp1kMax} onChange={(e) => setCp1kMax(e.target.value)} /></div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Table */}
      <Card className="border-border/50">
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm">Creators ({filtered.length})</CardTitle>
          <CardDescription className="text-xs">
            {filtered.length} of {creators.length} creators shown
            {hasActiveFilters && " (filtered)"}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground text-sm">No creators found.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Handle</TableHead>
                  <TableHead className="text-xs">Email</TableHead>
                  <TableHead className="text-xs text-right">Followers</TableHead>
                  <TableHead className="text-xs text-right">Median Views</TableHead>
                  <TableHead className="text-xs text-right">Engage %</TableHead>
                  <TableHead className="text-xs">Acct Territory</TableHead>
                  <TableHead className="text-xs">Audience Territory</TableHead>
                  <TableHead className="text-xs">Niches</TableHead>
                  <TableHead className="text-xs">Content Types</TableHead>
                  <TableHead className="text-xs text-right">Rate/Reel</TableHead>
                  <TableHead className="text-xs text-right">Reel Rate %</TableHead>
                  <TableHead className="text-xs text-right">CP1K</TableHead>
                  <TableHead className="text-xs text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium text-sm">@{c.instagram_handle}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{c.email || "—"}</TableCell>
                    <TableCell className="text-right text-sm">
                      {c.followers > 0 ? fmtNum(c.followers) : <span className="text-xs text-orange-500">Needs Refresh</span>}
                    </TableCell>
                    <TableCell className="text-right text-sm">{fmtNum(c.median_views)}</TableCell>
                    <TableCell className="text-right text-sm">
                      {c.engagement_rate > 0 ? fmtPct(c.engagement_rate) : <span className="text-xs text-orange-500">Needs Refresh</span>}
                    </TableCell>
                    <TableCell className="text-xs">
                      <Badge variant="outline" className="text-[10px]">{c.account_territory}</Badge>
                      <span className="text-[9px] text-muted-foreground ml-1">({c.account_territory_confidence})</span>
                    </TableCell>
                    <TableCell className="text-xs">
                      <Badge variant="outline" className="text-[10px]">{c.audience_territory}</Badge>
                      <span className="text-[9px] text-muted-foreground ml-1">({c.audience_territory_confidence})</span>
                    </TableCell>
                    <TableCell className="text-xs max-w-[120px]">
                      {c.music_genres.slice(0, 2).map((g) => <Badge key={g} variant="secondary" className="text-[10px] mr-0.5 mb-0.5">{g}</Badge>)}
                      {c.music_genres.length > 2 && <span className="text-[10px] text-muted-foreground">+{c.music_genres.length - 2}</span>}
                    </TableCell>
                    <TableCell className="text-xs">
                      {c.content_types.map((t) => <Badge key={t} variant="secondary" className="text-[10px] mr-0.5">{t}</Badge>)}
                    </TableCell>
                    <TableCell className="text-right text-sm">{c.reel_rate ? `$${c.reel_rate}` : "—"}</TableCell>
                    <TableCell className="text-right text-sm">{c.reel_rate_pct != null ? `${c.reel_rate_pct.toFixed(0)}%` : "N/A"}</TableCell>
                    <TableCell className="text-right text-sm">{fmtDollar(c.cp1k)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center gap-1 justify-end">
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(c)}><Edit className="h-3.5 w-3.5" /></Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7" disabled={refreshingHandle === c.instagram_handle} onClick={() => refreshCreator(c.instagram_handle)}>
                          <RefreshCw className={`h-3.5 w-3.5 ${refreshingHandle === c.instagram_handle ? "animate-spin" : ""}`} />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add Creator Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Creator</DialogTitle>
            <DialogDescription>Metrics will be auto-scraped after creation.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div><Label className="text-xs">Handle *</Label><Input placeholder="@handle" value={addForm.handle} onChange={(e) => setAddForm({ ...addForm, handle: e.target.value })} /></div>
            <div><Label className="text-xs">Email</Label><Input placeholder="email@example.com" value={addForm.email} onChange={(e) => setAddForm({ ...addForm, email: e.target.value })} /></div>
            <div><Label className="text-xs">Rate per Reel ($) *</Label><Input type="number" placeholder="0" value={addForm.reel_rate} onChange={(e) => setAddForm({ ...addForm, reel_rate: e.target.value })} /></div>
            <div>
              <Label className="text-xs">Niches * {addForm.genres.length > 0 && <span className="text-muted-foreground">({addForm.genres.length} selected)</span>}</Label>
              <div className="max-h-40 overflow-y-auto border rounded-md p-2 mt-1">
                <div className="flex flex-wrap gap-1">{[...addForm.genres, ...allNiches.filter((g) => !addForm.genres.includes(g))].map((g) => <Badge key={g} variant={addForm.genres.includes(g) ? "default" : "outline"} className="cursor-pointer text-[10px]" onClick={() => setAddForm((f) => ({ ...f, genres: f.genres.includes(g) ? f.genres.filter((x) => x !== g) : [...f.genres, g] }))}>{g}</Badge>)}</div>
              </div>
            </div>
            <div>
              <Label className="text-xs">Content Types *</Label>
              <div className="flex gap-2 mt-1">{CREATOR_CONTENT_TYPES.map((t) => <label key={t} className="flex items-center gap-1.5 text-sm"><Checkbox checked={addForm.content_types.includes(t)} onCheckedChange={(v) => setAddForm((f) => ({ ...f, content_types: v ? [...f.content_types, t] : f.content_types.filter((x) => x !== t) }))} />{t}</label>)}</div>
            </div>
            <Button className="w-full" onClick={handleAddCreator}>Add Creator</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Creator Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit @{editingCreator?.instagram_handle}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div><Label className="text-xs">Email</Label><Input value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} /></div>
            <div><Label className="text-xs">Rate per Reel ($)</Label><Input type="number" value={editForm.reel_rate} onChange={(e) => setEditForm({ ...editForm, reel_rate: e.target.value })} /></div>
            <div>
              <Label className="text-xs">Niches {editForm.genres.length > 0 && <span className="text-muted-foreground">({editForm.genres.length} selected)</span>}</Label>
              <div className="max-h-40 overflow-y-auto border rounded-md p-2 mt-1">
                <div className="flex flex-wrap gap-1">{[...editForm.genres, ...allNiches.filter((g) => !editForm.genres.includes(g))].map((g) => <Badge key={g} variant={editForm.genres.includes(g) ? "default" : "outline"} className="cursor-pointer text-[10px]" onClick={() => setEditForm((f) => ({ ...f, genres: f.genres.includes(g) ? f.genres.filter((x) => x !== g) : [...f.genres, g] }))}>{g}</Badge>)}</div>
              </div>
            </div>
            <div>
              <Label className="text-xs">Content Types</Label>
              <div className="flex gap-2 mt-1">{CREATOR_CONTENT_TYPES.map((t) => <label key={t} className="flex items-center gap-1.5 text-sm"><Checkbox checked={editForm.content_types.includes(t)} onCheckedChange={(v) => setEditForm((f) => ({ ...f, content_types: v ? [...f.content_types, t] : f.content_types.filter((x) => x !== t) }))} />{t}</label>)}</div>
            </div>
            <Button className="w-full" onClick={handleEditCreator}>Update Creator</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Import CSV Dialog */}
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import Creators CSV</DialogTitle>
            <DialogDescription>Upload a CSV with at minimum a "handle" column. Optional: email, niches, content_types, reel_rate. Metrics will be scraped automatically.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input type="file" accept=".csv" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImportCSV(f); }} />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
