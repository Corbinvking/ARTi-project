"use client";

import { useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, ArrowRight, Download, Save, Users, DollarSign, Eye, Target, Plus, X, ChevronRight, Home, RefreshCw, BarChart3, Percent } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

import { CampaignForm, Campaign, POST_TYPES } from "../seedstorm-builder/lib/types";
import { generateUUID } from "../seedstorm-builder/lib/campaignAlgorithm";
import { formatNumber, formatCurrency, saveCampaign } from "../seedstorm-builder/lib/localStorage";
import { exportCampaignCSV } from "../seedstorm-builder/lib/csvUtils";
import { toast } from "@/components/ui/use-toast";
import { useTagSync } from "../seedstorm-builder/hooks/useTagSync";
import { TagSelectDropdown } from "../seedstorm-builder/components/TagSelectDropdown";
import { MultiGenreSelect } from "../seedstorm-builder/components/MultiGenreSelect";
import { useCreatorsTable } from "../seedstorm-builder/hooks/useCreatorsTable";
import { generateCampaignV2, recalcTotals, reoptimizeAllocation, CreatorWithPredictions, CampaignV2Result } from "../seedstorm-builder/lib/campaignAlgorithmV2";

function Breadcrumbs() {
  return (
    <nav className="flex items-center space-x-1 text-sm text-muted-foreground mb-4">
      <Link href="/instagram" className="hover:text-foreground transition-colors">
        <Home className="h-4 w-4" />
      </Link>
      <ChevronRight className="h-4 w-4 mx-1" />
      <span className="text-foreground font-medium">Campaign Builder</span>
    </nav>
  );
}

function fmtNum(v: number | null | undefined): string {
  if (v == null || v === 0) return "N/A";
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
  return v.toLocaleString();
}

export default function InstagramCampaignBuilderPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState(1);

  const { creators: creatorsFromDb, isLoading: creatorsLoading } = useCreatorsTable();

  const duplicateName = searchParams.get("duplicateName");

  const [formData, setFormData] = useState<CampaignForm>({
    campaign_name: duplicateName || "",
    total_budget: 5000,
    selected_genres: [],
    campaign_type: "Audio Seeding",
    post_type_preference: ["Reel"],
    territory_preferences: [],
    content_type_preferences: [],
    min_median_views: undefined,
    max_cp1k: undefined,
    min_engagement_rate: undefined,
  });

  const [campaignResult, setCampaignResult] = useState<CampaignV2Result | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { tags: allTags } = useTagSync();

  const validateStep1 = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.campaign_name.trim()) newErrors.campaign_name = "Campaign name is required";
    if (!formData.total_budget || formData.total_budget < 100) newErrors.total_budget = "Budget must be at least $100";
    if (formData.selected_genres.length === 0) newErrors.selected_genres = "At least one genre is required";
    if (formData.post_type_preference.length === 0) newErrors.post_type_preference = "At least one post type is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const runAlgorithm = useCallback(() => {
    const result = generateCampaignV2(formData, creatorsFromDb);
    setCampaignResult(result);
    return result;
  }, [formData, creatorsFromDb]);

  const handleNext = () => {
    if (step === 1) {
      if (!validateStep1()) {
        toast({ title: "Validation Error", description: "Please fix the errors", variant: "destructive" });
        return;
      }
      const result = runAlgorithm();
      if (result.eligibleCreators.length === 0) {
        toast({ title: "No Matching Creators", description: result.allocationInsight });
      } else {
        toast({ title: "Campaign Generated", description: `${result.selectedCreators.length} creators selected from ${result.eligibleCreators.length} eligible` });
      }
      setStep(2);
    } else if (step === 2) {
      setStep(3);
    }
  };

  const handlePostTypeChange = (postType: string, checked: boolean) => {
    setFormData((prev) => ({
      ...prev,
      post_type_preference: checked
        ? [...prev.post_type_preference, postType]
        : prev.post_type_preference.filter((t) => t !== postType),
    }));
  };

  const toggleCreator = (id: string) => {
    if (!campaignResult) return;
    const updated = campaignResult.eligibleCreators.map((c) => {
      if (c.id !== id) return c;
      const newSelected = !c.selected;
      return {
        ...c,
        selected: newSelected,
        posts_assigned: newSelected ? Math.max(c.posts_assigned, 1) : 0,
        cost: newSelected ? c.reel_rate * Math.max(c.posts_assigned, 1) : 0,
        predicted_views_total: newSelected ? c.predicted_views_per_post * Math.max(c.posts_assigned, 1) : 0,
      };
    });
    const newTotals = recalcTotals(updated, formData.total_budget);
    setCampaignResult({
      ...campaignResult,
      eligibleCreators: updated,
      selectedCreators: updated.filter((c) => c.selected),
      totals: newTotals,
    });
  };

  const handlePostsChange = (id: string, posts: number) => {
    if (!campaignResult) return;
    const count = Math.max(1, Math.min(10, posts));
    const updated = campaignResult.eligibleCreators.map((c) => {
      if (c.id !== id) return c;
      return {
        ...c,
        posts_assigned: count,
        cost: c.reel_rate * count,
        predicted_views_total: c.predicted_views_per_post * count,
      };
    });
    const newTotals = recalcTotals(updated, formData.total_budget);
    setCampaignResult({
      ...campaignResult,
      eligibleCreators: updated,
      selectedCreators: updated.filter((c) => c.selected),
      totals: newTotals,
    });
  };

  const handleReoptimize = () => {
    if (!campaignResult) return;
    const result = reoptimizeAllocation(campaignResult.eligibleCreators, formData.total_budget);
    setCampaignResult(result);
    toast({ title: "Re-optimized", description: `${result.selectedCreators.length} creators selected` });
  };

  const handleReset = () => {
    const result = runAlgorithm();
    setCampaignResult(result);
    toast({ title: "Reset to Suggested Plan", description: `${result.selectedCreators.length} creators selected` });
  };

  const handleDeselectAll = () => {
    if (!campaignResult) return;
    const updated = campaignResult.eligibleCreators.map((c) => ({
      ...c,
      selected: false,
      posts_assigned: 0,
      cost: 0,
      predicted_views_total: 0,
    }));
    const newTotals = recalcTotals(updated, formData.total_budget);
    setCampaignResult({
      ...campaignResult,
      eligibleCreators: updated,
      selectedCreators: [],
      totals: newTotals,
    });
  };

  const saveCampaignDraft = async () => {
    if (!campaignResult) return;
    const campaign: Campaign = {
      id: generateUUID(),
      campaign_name: formData.campaign_name,
      date_created: new Date().toISOString(),
      status: "Draft",
      form_data: formData,
      selected_creators: campaignResult.selectedCreators.map((c) => ({
        id: c.id,
        instagram_handle: c.instagram_handle,
        followers: c.followers,
        median_views_per_video: c.median_views || 0,
        engagement_rate: c.engagement_rate,
        base_country: c.base_country,
        audience_countries: [c.audience_territory],
        content_types: c.content_types,
        music_genres: c.music_genres,
        reel_rate: c.reel_rate,
        cpv: c.cp1k_predicted ? c.cp1k_predicted / 1000 : 0,
        selected_rate: c.reel_rate,
        posts_count: c.posts_assigned,
        created_at: c.created_at,
      })),
      totals: campaignResult.totals,
    };
    try {
      await saveCampaign(campaign);
      toast({ title: "Campaign Saved!", description: `"${campaign.campaign_name}" saved with ${campaignResult.selectedCreators.length} creators.` });
      router.push("/instagram/campaigns");
    } catch (error: any) {
      toast({ title: "Save Failed", description: error?.message || "Please try again.", variant: "destructive" });
    }
  };

  const exportCampaign = () => {
    if (!campaignResult) return;
    const headers = ["Handle", "Followers", "Engagement Rate", "Historical Median Views", "Predicted Views/Post", "Posts", "Rate/Reel", "Cost", "CP1K", "Audience Territory", "Genres"];
    const rows = campaignResult.selectedCreators.map((c) => [
      `@${c.instagram_handle}`,
      c.followers,
      c.engagement_rate > 0 ? `${(c.engagement_rate * 100).toFixed(2)}%` : "N/A",
      c.median_views ?? "N/A",
      c.predicted_views_per_post,
      c.posts_assigned,
      `$${c.reel_rate}`,
      `$${c.cost}`,
      c.cp1k_predicted != null ? `$${c.cp1k_predicted.toFixed(2)}` : "N/A",
      c.audience_territory || "N/A",
      c.music_genres?.join("; ") || "N/A",
    ]);
    const csv = [headers, ...rows].map((r) => r.map((cell) => `"${cell}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `campaign-${formData.campaign_name || "export"}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  // ===================== STEP 1 =====================
  if (step === 1) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="container mx-auto max-w-4xl">
          <Breadcrumbs />
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-foreground mb-2">CAMPAIGN BUILDER</h1>
            <p className="text-xl text-muted-foreground">Step 1 of 3: Campaign Configuration</p>
          </div>

          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Campaign Details</CardTitle>
              <CardDescription>Configure your Instagram seeding campaign parameters</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label>Campaign Name</Label>
                  <Input
                    placeholder="Artist/Brand Name - Song/Activation Name"
                    value={formData.campaign_name}
                    onChange={(e) => setFormData({ ...formData, campaign_name: e.target.value })}
                  />
                  {errors.campaign_name && <p className="text-sm text-destructive mt-1">{errors.campaign_name}</p>}
                </div>
                <div>
                  <Label>Total Budget ($)</Label>
                  <Input
                    type="number"
                    min="100"
                    placeholder="5000"
                    value={formData.total_budget}
                    onChange={(e) => setFormData({ ...formData, total_budget: Number(e.target.value) })}
                  />
                  {errors.total_budget && <p className="text-sm text-destructive mt-1">{errors.total_budget}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label>Selected Genres</Label>
                  <MultiGenreSelect
                    selectedGenres={formData.selected_genres}
                    onGenresChange={(genres) => setFormData({ ...formData, selected_genres: genres })}
                    placeholder="Select campaign genres"
                  />
                  {errors.selected_genres && <p className="text-sm text-destructive mt-1">{errors.selected_genres}</p>}
                </div>
                <div>
                  <Label>Campaign Type</Label>
                  <div className="flex gap-4 mt-2">
                    {(["Audio Seeding", "Footage Seeding"] as const).map((t) => (
                      <label key={t} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="campaign_type"
                          value={t}
                          checked={formData.campaign_type === t}
                          onChange={() => setFormData({ ...formData, campaign_type: t })}
                          className="accent-primary"
                        />
                        <span className="text-sm">{t}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <Label>Post Type Preference</Label>
                <div className="grid grid-cols-3 gap-4 mt-2">
                  {POST_TYPES.map((type) => (
                    <label key={type} className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={formData.post_type_preference.includes(type)}
                        onCheckedChange={(checked) => handlePostTypeChange(type, !!checked)}
                      />
                      <span className="text-sm">{type}</span>
                    </label>
                  ))}
                </div>
                {errors.post_type_preference && <p className="text-sm text-destructive mt-1">{errors.post_type_preference}</p>}
              </div>

              <div>
                <TagSelectDropdown
                  label="Content Type Preferences (Optional)"
                  selectedTags={formData.content_type_preferences}
                  onTagsChange={(ct) => setFormData({ ...formData, content_type_preferences: ct })}
                  tagType="contentTypes"
                  placeholder="Select content types..."
                />
              </div>

              <div>
                <TagSelectDropdown
                  label="Territory Preferences (Optional)"
                  selectedTags={formData.territory_preferences}
                  onTagsChange={(t) => setFormData({ ...formData, territory_preferences: t })}
                  tagType="territoryPreferences"
                  placeholder="Select territory preferences..."
                />
              </div>

              {/* Guardrails */}
              <div className="border-t pt-4">
                <Label className="text-base font-semibold">Quality Guardrails (Optional)</Label>
                <p className="text-xs text-muted-foreground mb-3">Constrain suggestion quality to prevent low-quality inventory.</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label className="text-xs">Min Median Views per Post</Label>
                    <Input
                      type="number"
                      placeholder="e.g. 5000"
                      value={formData.min_median_views ?? ""}
                      onChange={(e) => setFormData({ ...formData, min_median_views: e.target.value ? Number(e.target.value) : undefined })}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Max CP1K Target ($)</Label>
                    <Input
                      type="number"
                      placeholder="e.g. 15"
                      value={formData.max_cp1k ?? ""}
                      onChange={(e) => setFormData({ ...formData, max_cp1k: e.target.value ? Number(e.target.value) : undefined })}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Min Engagement Rate (%)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      placeholder="e.g. 2.0"
                      value={formData.min_engagement_rate ?? ""}
                      onChange={(e) => setFormData({ ...formData, min_engagement_rate: e.target.value ? Number(e.target.value) : undefined })}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={handleNext} size="lg" disabled={creatorsLoading}>
              {creatorsLoading ? "Loading creators..." : "Generate Campaign"}
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ===================== STEP 2 =====================
  if (step === 2 && campaignResult) {
    const t = campaignResult.totals;
    const allEligible = campaignResult.eligibleCreators;
    const selectedFirst = [...allEligible].sort((a, b) => {
      if (a.selected && !b.selected) return -1;
      if (!a.selected && b.selected) return 1;
      return b.ranking_score - a.ranking_score;
    });

    return (
      <div className="min-h-screen bg-background p-6">
        <div className="container mx-auto">
          <Breadcrumbs />
          <div className="mb-6">
            <h1 className="text-4xl font-bold text-foreground mb-2">CAMPAIGN BUILDER</h1>
            <p className="text-xl text-muted-foreground">Step 2 of 3: Creator Selection</p>
          </div>

          {/* Summary Strip */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-4">
            <Card><CardHeader className="p-3 pb-1"><CardTitle className="text-xs text-muted-foreground flex items-center gap-1"><Users className="h-3 w-3" />Creators</CardTitle></CardHeader><CardContent className="p-3 pt-0"><div className="text-xl font-bold">{t.total_creators}</div></CardContent></Card>
            <Card><CardHeader className="p-3 pb-1"><CardTitle className="text-xs text-muted-foreground">Total Posts</CardTitle></CardHeader><CardContent className="p-3 pt-0"><div className="text-xl font-bold">{t.total_posts || 0}</div></CardContent></Card>
            <Card><CardHeader className="p-3 pb-1"><CardTitle className="text-xs text-muted-foreground flex items-center gap-1"><DollarSign className="h-3 w-3" />Total Cost</CardTitle></CardHeader><CardContent className="p-3 pt-0"><div className="text-xl font-bold">{formatCurrency(t.total_cost)}</div></CardContent></Card>
            <Card><CardHeader className="p-3 pb-1"><CardTitle className="text-xs text-muted-foreground">Total Followers</CardTitle></CardHeader><CardContent className="p-3 pt-0"><div className="text-xl font-bold">{formatNumber(t.total_followers)}</div></CardContent></Card>
            <Card><CardHeader className="p-3 pb-1"><CardTitle className="text-xs text-muted-foreground flex items-center gap-1"><Eye className="h-3 w-3" />Median Views</CardTitle></CardHeader><CardContent className="p-3 pt-0"><div className="text-xl font-bold">{formatNumber(t.total_median_views)}</div></CardContent></Card>
            <Card><CardHeader className="p-3 pb-1"><CardTitle className="text-xs text-muted-foreground flex items-center gap-1"><Target className="h-3 w-3" />Avg CP1K</CardTitle></CardHeader><CardContent className="p-3 pt-0"><div className="text-xl font-bold">${(t.avg_cp1k || 0).toFixed(2)}</div></CardContent></Card>
            <Card><CardHeader className="p-3 pb-1"><CardTitle className="text-xs text-muted-foreground">Budget Left</CardTitle></CardHeader><CardContent className="p-3 pt-0"><div className="text-xl font-bold">{formatCurrency(t.budget_remaining)}</div></CardContent></Card>
          </div>

          {/* Allocation Insight */}
          <div className="text-sm text-muted-foreground bg-muted/30 border border-border/50 rounded-lg px-4 py-2 mb-4">
            {campaignResult.allocationInsight}
          </div>

          {/* Creator Table */}
          <Card className="mb-6">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-sm">Selected Creators ({campaignResult.selectedCreators.length} of {allEligible.length} eligible)</CardTitle>
                  <CardDescription className="text-xs">Toggle creators, edit posts, see projected views and CP1K update instantly</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleDeselectAll}><X className="h-3 w-3 mr-1" />Deselect All</Button>
                  <Button variant="outline" size="sm" onClick={handleReoptimize}><RefreshCw className="h-3 w-3 mr-1" />Re-optimize</Button>
                  <Button variant="outline" size="sm" onClick={handleReset}><BarChart3 className="h-3 w-3 mr-1" />Reset to Suggested</Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs w-[60px]">Select</TableHead>
                    <TableHead className="text-xs">Handle</TableHead>
                    <TableHead className="text-xs text-right">Followers</TableHead>
                    <TableHead className="text-xs text-right">Engage %</TableHead>
                    <TableHead className="text-xs text-right">Hist. Median Views</TableHead>
                    <TableHead className="text-xs text-right">Predicted Views</TableHead>
                    <TableHead className="text-xs text-right w-[70px]">Posts</TableHead>
                    <TableHead className="text-xs text-right">Rate/Reel</TableHead>
                    <TableHead className="text-xs text-right">Cost</TableHead>
                    <TableHead className="text-xs text-right">CP1K</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedFirst.map((c) => (
                    <TableRow key={c.id} className={c.selected ? "bg-primary/5" : ""}>
                      <TableCell><Switch checked={c.selected} onCheckedChange={() => toggleCreator(c.id)} /></TableCell>
                      <TableCell className="font-medium text-sm">@{c.instagram_handle}</TableCell>
                      <TableCell className="text-right text-sm">{c.followers > 0 ? fmtNum(c.followers) : "N/A"}</TableCell>
                      <TableCell className="text-right text-sm">{c.engagement_rate > 0 ? `${(c.engagement_rate * 100).toFixed(2)}%` : "N/A"}</TableCell>
                      <TableCell className="text-right text-sm">{fmtNum(c.median_views)}</TableCell>
                      <TableCell className="text-right text-sm">{fmtNum(c.predicted_views_per_post)}</TableCell>
                      <TableCell className="text-right">
                        {c.selected ? (
                          <Input
                            type="number"
                            min="1"
                            max="10"
                            value={c.posts_assigned}
                            onChange={(e) => handlePostsChange(c.id, parseInt(e.target.value) || 1)}
                            className="w-16 h-7 text-xs"
                          />
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right text-sm">${c.reel_rate}</TableCell>
                      <TableCell className="text-right text-sm">{c.selected ? formatCurrency(c.cost) : "—"}</TableCell>
                      <TableCell className="text-right text-sm">
                        {c.cp1k_predicted != null ? `$${c.cp1k_predicted.toFixed(2)}` : "N/A"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(1)}>
              <ArrowLeft className="h-4 w-4 mr-2" />Back
            </Button>
            <Button onClick={handleNext} size="lg">
              Finalize Campaign<ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ===================== STEP 3 =====================
  if (step === 3 && campaignResult) {
    const t = campaignResult.totals;
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="container mx-auto max-w-4xl">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-foreground mb-2">CAMPAIGN FINALIZED</h1>
            <p className="text-xl text-muted-foreground">Step 3 of 3: Export and Save</p>
          </div>

          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Final Campaign Summary</CardTitle>
              <CardDescription>{formData.campaign_name} - Ready for execution</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                <div>
                  <div className="text-2xl font-bold text-primary">{t.total_creators}</div>
                  <div className="text-xs text-muted-foreground uppercase">Creators Selected</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-primary">{t.total_posts || 0}</div>
                  <div className="text-xs text-muted-foreground uppercase">Total Posts</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-primary">{formatCurrency(t.total_cost)}</div>
                  <div className="text-xs text-muted-foreground uppercase">Total Cost</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-primary">{t.budget_utilization || 0}%</div>
                  <div className="text-xs text-muted-foreground uppercase">Budget Utilization</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">{formatNumber(t.total_followers)}</div>
                  <div className="text-xs text-muted-foreground uppercase">Total Followers</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">{formatNumber(t.projected_total_views || 0)}</div>
                  <div className="text-xs text-muted-foreground uppercase">Projected Views</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-primary">${(t.avg_cp1k || 0).toFixed(2)}</div>
                  <div className="text-xs text-muted-foreground uppercase">Avg CP1K</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(2)}>
              <ArrowLeft className="h-4 w-4 mr-2" />Back
            </Button>
            <div className="flex gap-4">
              <Button onClick={exportCampaign} variant="outline" size="lg">
                <Download className="h-4 w-4 mr-2" />Export CSV
              </Button>
              <Button onClick={saveCampaignDraft} size="lg">
                <Save className="h-4 w-4 mr-2" />Save Campaign
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
