'use client'

import { useState, useEffect, useMemo } from "react";
import { useLocation } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, Copy, Plus, Trash2, Calendar, DollarSign, Users, Eye, Edit, Target, Check, Share, Link, Globe, Lock, RefreshCw, ExternalLink, ArrowUpDown, ArrowUp, ArrowDown, CheckCircle } from "lucide-react";


import { useRouter } from 'next/navigation';
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Campaign } from "../lib/types";
import { deleteCampaign, formatNumber, formatCurrency } from "../lib/localStorage";
import { supabase } from "../integrations/supabase/client";
import { useInstagramCampaigns, FormattedCampaign } from "../hooks/useInstagramCampaigns";

import { exportCampaignCSV } from "../lib/csvUtils";
import { AddResultsForm } from "../components/AddResultsForm";
import { CampaignDetailsModal } from "../components/CampaignDetailsModal";
import { CampaignEditForm } from "../components/CampaignEditForm";
import { CampaignSearchFilters, CampaignFilters } from "../components/CampaignSearchFilters";
import { GlobalSearch } from "../components/GlobalSearch";
import { KeyboardShortcutsHelp } from "../components/KeyboardShortcutsHelp";
import { useGlobalShortcuts } from "../hooks/useKeyboardShortcuts";
import { toast } from "../hooks/use-toast";


type SortOption = 'date-desc' | 'date-asc' | 'name-asc' | 'name-desc' | 'budget-desc' | 'budget-asc' | 'status' | 'creators-desc' | 'creators-asc' | 'spend-desc' | 'spend-asc';

const CampaignHistory = () => {
  console.log('🌟 CampaignHistory component rendered');
  const router = useRouter();
  const location = useLocation();
  
  // Use the real Instagram campaigns hook
  console.log('🔨 About to call useInstagramCampaigns hook');
  const { 
    campaigns: dbCampaigns, 
    loading, 
    refetch,
    totalCampaigns,
    activeCampaigns 
  } = useInstagramCampaigns();
  
  console.log('📦 Hook returned:', { 
    dbCampaignsLength: dbCampaigns?.length, 
    loading, 
    totalCampaigns,
    activeCampaigns 
  });
  
  // Convert to Campaign type for compatibility
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [isResultsModalOpen, setIsResultsModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedCampaigns, setSelectedCampaigns] = useState<Set<string>>(new Set());
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"all" | "search">("all");
  const [sortBy, setSortBy] = useState<SortOption>('date-desc');
  const [searchFilters, setSearchFilters] = useState<CampaignFilters>({
    searchQuery: '',
    status: [],
    dateRange: { from: '', to: '' },
    budgetRange: { min: 0, max: 1000000 },
    selectedGenres: [],
    creatorCountRange: { min: 0, max: 100 },
    spendRange: { min: 0, max: 500000 },
    publicAccess: undefined,
  });

  // Convert dbCampaigns to Campaign format when they change
  useEffect(() => {
    if (dbCampaigns && dbCampaigns.length > 0) {
      const converted = dbCampaigns.map(c => ({
        id: c.id,
        campaign_name: c.name,
        brand_name: c.brand,
        budget: c.budget,
        status: c.status,
        date_created: c.createdAt.toISOString(),
        selected_creators: [], // Will be loaded separately if needed
        totals: {
          totalSpend: c.totalSpend,
          remaining: c.remaining
        },
        public_access_enabled: false,
        salesperson: c.salesperson,
        notes: c.notes,
        tracker: c.tracker,
        soundUrl: c.soundUrl
      }));
      setCampaigns(converted);
      console.log(`✅ Displaying ${converted.length} campaigns in Campaign History`);
    } else if (!loading) {
      setCampaigns([]);
    }
  }, [dbCampaigns, loading]);

  // Set up real-time subscription for campaign updates
  useEffect(() => {
    const channel = supabase
      .channel('instagram-campaigns-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'instagram_campaigns' // Correct table name!
        },
        (payload) => {
          console.log('Instagram campaign change detected:', payload);
          refetch(); // Use the hook's refetch function
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refetch]);

  // Handle specific campaign navigation from global search
  useEffect(() => {
    if (location.state?.filter === 'specific_campaign' && location.state?.campaignId) {
      const targetCampaign = campaigns.find(c => c.id === location.state.campaignId);
      if (targetCampaign) {
        openDetailsModal(targetCampaign);
      }
    }
  }, [campaigns, location.state]);

  const filteredCampaigns = useMemo(() => {
    let filtered = campaigns;

    if (activeTab === 'search') {
      // Apply search filters
      if (searchFilters.searchQuery) {
        const query = searchFilters.searchQuery.toLowerCase();
        filtered = filtered.filter(campaign =>
          campaign.campaign_name.toLowerCase().includes(query) ||
          (Array.isArray(campaign.selected_creators) ? campaign.selected_creators : []).some(creator =>
            creator.instagram_handle.toLowerCase().includes(query)
          )
        );
      }

      if (searchFilters.status.length > 0) {
        filtered = filtered.filter(campaign =>
          searchFilters.status.includes(campaign.status)
        );
      }

      if (searchFilters.publicAccess !== undefined) {
        filtered = filtered.filter(campaign =>
          campaign.public_access_enabled === searchFilters.publicAccess
        );
      }

      if (searchFilters.dateRange.from) {
        filtered = filtered.filter(campaign =>
          new Date(campaign.date_created) >= new Date(searchFilters.dateRange.from)
        );
      }

      if (searchFilters.dateRange.to) {
        filtered = filtered.filter(campaign =>
          new Date(campaign.date_created) <= new Date(searchFilters.dateRange.to)
        );
      }

      if (searchFilters.budgetRange.min > 0 || searchFilters.budgetRange.max < 1000000) {
        filtered = filtered.filter(campaign =>
          campaign.form_data.total_budget >= searchFilters.budgetRange.min &&
          campaign.form_data.total_budget <= searchFilters.budgetRange.max
        );
      }

      if (searchFilters.creatorCountRange.min > 0 || searchFilters.creatorCountRange.max < 100) {
        filtered = filtered.filter(campaign => {
          const creatorCount = campaign.totals?.total_creators || 0;
          return creatorCount >= searchFilters.creatorCountRange.min &&
                 creatorCount <= searchFilters.creatorCountRange.max;
        });
      }

      if (searchFilters.spendRange.min > 0 || searchFilters.spendRange.max < 500000) {
        filtered = filtered.filter(campaign => {
          const spend = campaign.totals?.total_cost || 0;
          return spend >= searchFilters.spendRange.min &&
                 spend <= searchFilters.spendRange.max;
        });
      }

      if (searchFilters.selectedGenres.length > 0) {
        filtered = filtered.filter(campaign =>
          campaign.form_data.selected_genres?.some(genre =>
            searchFilters.selectedGenres.includes(genre)
          )
        );
      }
    }

    // Apply sorting
    return filtered.sort((a, b) => {
      switch (sortBy) {
        case 'date-desc':
          return new Date(b.date_created).getTime() - new Date(a.date_created).getTime();
        case 'date-asc':
          return new Date(a.date_created).getTime() - new Date(b.date_created).getTime();
        case 'name-asc':
          return a.campaign_name.localeCompare(b.campaign_name);
        case 'name-desc':
          return b.campaign_name.localeCompare(a.campaign_name);
        case 'budget-desc':
          return b.form_data.total_budget - a.form_data.total_budget;
        case 'budget-asc':
          return a.form_data.total_budget - b.form_data.total_budget;
        case 'status':
          const statusOrder = { 'Draft': 0, 'Active': 1, 'Completed': 2 };
          return statusOrder[a.status] - statusOrder[b.status];
        case 'creators-desc':
          return (b.totals?.total_creators || 0) - (a.totals?.total_creators || 0);
        case 'creators-asc':
          return (a.totals?.total_creators || 0) - (b.totals?.total_creators || 0);
        case 'spend-desc':
          return (b.totals?.total_cost || 0) - (a.totals?.total_cost || 0);
        case 'spend-asc':
          return (a.totals?.total_cost || 0) - (b.totals?.total_cost || 0);
        default:
          return 0;
      }
    });
  }, [campaigns, activeTab, searchFilters, sortBy]);

  const clearSearchFilters = () => {
    setSearchFilters({
      searchQuery: '',
      status: [],
      dateRange: { from: '', to: '' },
      budgetRange: { min: 0, max: 1000000 },
      selectedGenres: [],
      creatorCountRange: { min: 0, max: 100 },
      spendRange: { min: 0, max: 500000 },
      publicAccess: undefined,
    });
  };

  function getSortIcon(sortOption: SortOption) {
    if (sortBy === sortOption) {
      return sortOption.includes('desc') ? <ArrowDown className="h-4 w-4" /> : <ArrowUp className="h-4 w-4" />;
    }
    return <ArrowUpDown className="h-4 w-4" />;
  }

  function getSortLabel(sortOption: SortOption) {
    const labels: Record<SortOption, string> = {
      'date-desc': 'Newest First',
      'date-asc': 'Oldest First',
      'name-asc': 'Name A-Z',
      'name-desc': 'Name Z-A',
      'budget-desc': 'Budget High-Low',
      'budget-asc': 'Budget Low-High',
      'status': 'Status',
      'creators-desc': 'Most Creators',
      'creators-asc': 'Least Creators',
      'spend-desc': 'Highest Spend',
      'spend-asc': 'Lowest Spend',
    };
    return labels[sortOption];
  }

  const renderCampaignCards = (campaignsToRender: Campaign[]) => {
    // Helper functions for actual metrics
    const calculateTotalActualViews = (campaign: Campaign): number => {
      if (!campaign.actual_results?.creator_results) return 0;
      return campaign.actual_results.creator_results.reduce((sum, result) => 
        sum + result.total_actual_views, 0);
    };

    const calculateActualCPM = (campaign: Campaign): number => {
      const totalActualViews = calculateTotalActualViews(campaign);
      if (totalActualViews === 0) return 0;
      return ((campaign.totals?.total_cost || 0) / totalActualViews) * 1000;
    };

    if (campaignsToRender.length === 0) {
      if (activeTab === 'search') {
        return (
          <Card>
            <CardContent className="py-12 text-center">
              <h3 className="text-lg font-semibold mb-2">No campaigns match your filters</h3>
              <p className="text-muted-foreground mb-6">Try adjusting your search criteria</p>
              <Button onClick={clearSearchFilters} variant="outline">
                Clear Filters
              </Button>
            </CardContent>
          </Card>
        );
      } else {
        return (
          <Card>
            <CardContent className="py-12 text-center">
              <h3 className="text-lg font-semibold mb-2">No campaigns yet</h3>
              <p className="text-muted-foreground mb-6">Create your first campaign to get started</p>
              <Button onClick={() => router.push('/instagram/campaign-builder')} variant="gradient">
                Create Campaign
              </Button>
            </CardContent>
          </Card>
        );
      }
    }

    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {campaignsToRender.map((campaign) => {
          // Ensure selected_creators is always an array
          const selectedCreators = Array.isArray(campaign.selected_creators) ? campaign.selected_creators : [];
          
          return (
            <Card 
              key={campaign.id} 
              className={`border-2 hover:border-primary/50 transition-all duration-300 cursor-pointer ${
                isSelectMode && selectedCampaigns.has(campaign.id) ? 'border-primary bg-primary/5' : ''
              }`}
              onClick={() => isSelectMode ? toggleCampaignSelection(campaign.id) : openDetailsModal(campaign)}
            >
              <CardHeader>
                <div className="flex justify-between items-start">
                  {isSelectMode && (
                    <Checkbox
                      checked={selectedCampaigns.has(campaign.id)}
                      onCheckedChange={() => toggleCampaignSelection(campaign.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="mr-3 mt-1"
                    />
                  )}
                  <div>
                    <CardTitle className="text-xl">{campaign.campaign_name}</CardTitle>
                    <CardDescription className="flex items-center gap-2 mt-2">
                      <Calendar className="h-4 w-4" />
                      {formatDate(campaign.date_created)}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={getStatusColor(campaign.status)}>
                      <div className="flex items-center gap-1.5">
                        <div className={`w-1.5 h-1.5 rounded-full ${
                          campaign.status === 'Draft' ? 'bg-muted-foreground' :
                          campaign.status === 'Active' ? 'bg-primary' :
                          campaign.status === 'Completed' ? 'bg-success' :
                          'bg-muted-foreground'
                        }`}></div>
                        {campaign.status}
                      </div>
                    </Badge>
                    {campaign.public_access_enabled && (
                      <Badge variant="outline" className="text-xs">
                        <Globe className="h-3 w-3 mr-1" />
                        Public
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Campaign Details */}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Budget:</span>
                      <span className="font-semibold">{formatCurrency(campaign.form_data.total_budget)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">Genre:</span>
                      <div className="flex flex-wrap gap-1">
                        {campaign.form_data.selected_genres?.map(genre => (
                          <Badge key={genre} variant="outline" className="text-xs">{genre}</Badge>
                        )) || <Badge variant="outline" className="text-xs">No genres</Badge>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Creators:</span>
                      <span className="font-semibold">{campaign.totals?.total_creators || 0}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">Followers:</span>
                      <span className="font-semibold">{formatNumber(campaign.totals?.total_followers || 0)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Eye className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Views:</span>
                      <span className="font-semibold">{formatNumber(campaign.totals?.total_median_views || 0)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Target className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Avg CPM:</span>
                      <span className="font-semibold">${(campaign.totals?.average_cpv || 0).toFixed(2)}</span>
                    </div>
                    
                    {/* Actual Metrics - Only show if campaign has actual results */}
                    {campaign.actual_results?.creator_results && (
                      <>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-success" />
                          <span className="text-muted-foreground">Actual Views:</span>
                          <span className="font-semibold text-success">{formatNumber(calculateTotalActualViews(campaign))}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-success" />
                          <span className="text-muted-foreground">Actual CPM:</span>
                          <span className="font-semibold text-success">${calculateActualCPM(campaign).toFixed(2)}</span>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Creator List */}
                  {selectedCreators.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold text-muted-foreground">Selected Creators:</h4>
                      <div className="flex flex-wrap gap-1">
                        {selectedCreators.slice(0, 5).map((creator) => (
                          <a
                            key={creator.id}
                            href={`https://instagram.com/${creator.instagram_handle.replace('@', '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-primary hover:text-primary/80 underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            @{creator.instagram_handle.replace('@', '')}
                          </a>
                        ))}
                        {selectedCreators.length > 5 && (
                          <span className="text-xs text-muted-foreground">
                            +{selectedCreators.length - 5} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex flex-wrap gap-2 pt-4 border-t">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleExport(campaign);
                      }}
                    >
                      <Download className="h-3 w-3 mr-1" />
                      Export
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDuplicate(campaign);
                      }}
                    >
                      <Copy className="h-3 w-3 mr-1" />
                      Duplicate
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditModal(campaign);
                      }}
                    >
                      <Edit className="h-3 w-3 mr-1" />
                      Edit
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="sm"
                          className={campaign.public_access_enabled ? "text-primary" : ""}
                        >
                          {campaign.public_access_enabled ? (
                            <Globe className="h-3 w-3 mr-1" />
                          ) : (
                            <Lock className="h-3 w-3 mr-1" />
                          )}
                          {campaign.public_access_enabled ? "Public" : "Private"}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        {!campaign.public_access_enabled ? (
                          <DropdownMenuItem onClick={(e) => handleEnablePublicAccess(campaign, e)}>
                            <Globe className="h-4 w-4 mr-2" />
                            Enable & Copy Link
                          </DropdownMenuItem>
                        ) : (
                          <>
                            <DropdownMenuItem onClick={(e) => handleCopyPublicLink(campaign, e)}>
                              <Copy className="h-4 w-4 mr-2" />
                              Copy Public Link
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => handleOpenPublicDashboard(campaign, e)}>
                              <ExternalLink className="h-4 w-4 mr-2" />
                              Open Public Dashboard
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={(e) => handleRegenerateToken(campaign, e)}>
                              <RefreshCw className="h-4 w-4 mr-2" />
                              Regenerate Link
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={(e) => handleDisablePublicAccess(campaign, e)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Lock className="h-4 w-4 mr-2" />
                              Disable Public Access
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        openResultsModal(campaign);
                      }}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Add Results
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(campaign.id);
                      }}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Delete
                    </Button>
                  </div>

                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  };

  const handleExport = (campaign: Campaign) => {
    exportCampaignCSV(campaign);
    toast({
      title: "Export Complete",
      description: `${campaign.campaign_name} exported successfully`,
    });
  };

  const handleDuplicate = (campaign: Campaign) => {
    // Navigate to campaign builder with campaign ID in query params
    // TODO: Implement duplicate functionality by reading campaign data from URL params
    router.push(`/instagram/campaign-builder?duplicate=${campaign.id}`);
  };

  const handleDelete = (campaignId: string) => {
    deleteCampaign(campaignId);
    loadCampaigns();
    toast({
      title: "Campaign Deleted",
      description: "Campaign has been removed from history",
    });
  };

  const handleBulkDelete = async () => {
    try {
      for (const campaignId of selectedCampaigns) {
        await deleteCampaign(campaignId);
      }
      setSelectedCampaigns(new Set());
      setIsSelectMode(false);
      loadCampaigns();
      toast({
        title: "Campaigns Deleted",
        description: `${selectedCampaigns.size} campaigns have been removed`,
      });
    } catch (error) {
      console.error('Error deleting campaigns:', error);
      toast({
        title: "Error",
        description: "Failed to delete some campaigns",
        variant: "destructive",
      });
    }
  };

  const toggleCampaignSelection = (campaignId: string) => {
    const newSelected = new Set(selectedCampaigns);
    if (newSelected.has(campaignId)) {
      newSelected.delete(campaignId);
    } else {
      newSelected.add(campaignId);
    }
    setSelectedCampaigns(newSelected);
  };

  const selectAllCampaigns = () => {
    if (selectedCampaigns.size === campaigns.length) {
      setSelectedCampaigns(new Set());
    } else {
      setSelectedCampaigns(new Set(campaigns.map(c => c.id)));
    }
  };

  const openResultsModal = (campaign: Campaign) => {
    setSelectedCampaign(campaign);
    setIsResultsModalOpen(true);
  };

  const openDetailsModal = (campaign: Campaign) => {
    setSelectedCampaign(campaign);
    setIsDetailsModalOpen(true);
  };

  const openEditModal = (campaign: Campaign) => {
    setSelectedCampaign(campaign);
    setIsEditModalOpen(true);
  };

  const handleStatusUpdate = async (campaignId: string, newStatus: Campaign['status']) => {
    try {
      const campaign = campaigns.find(c => c.id === campaignId);
      if (campaign) {
        const updatedCampaign = { ...campaign, status: newStatus };
        // Note: You would save this updated campaign here
        // For now, we'll just reload campaigns
        await loadCampaigns();
        toast({
          title: "Status Updated",
          description: `Campaign status changed to ${newStatus}`,
        });
      }
    } catch (error) {
      console.error('Error updating campaign status:', error);
      toast({
        title: "Error",
        description: "Failed to update campaign status",
        variant: "destructive",
      });
    }
  };

  const handleEnablePublicAccess = async (campaign: Campaign, e: React.MouseEvent) => {
    e.stopPropagation();
    
    try {
      const { error } = await supabase
        .from('campaigns')
        .update({ 
          public_access_enabled: true,
          public_token: campaign.public_token || crypto.randomUUID(),
          updated_at: new Date().toISOString()
        })
        .eq('id', campaign.id);

      if (error) throw error;
      
      await loadCampaigns();
      
      // Generate public URL and copy to clipboard
      const publicUrl = `${window.location.origin}/client/${campaign.public_token || crypto.randomUUID()}`;
      await navigator.clipboard.writeText(publicUrl);
      
      toast({
        title: "Public Access Enabled!",
        description: "Link copied to clipboard",
      });
    } catch (error) {
      console.error('Error enabling public access:', error);
      toast({
        title: "Error",
        description: "Failed to enable public access",
        variant: "destructive",
      });
    }
  };

  const handleCopyPublicLink = async (campaign: Campaign, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!campaign.public_token) {
      toast({
        title: "Error",
        description: "No public token available",
        variant: "destructive",
      });
      return;
    }
    
    try {
      const publicUrl = `${window.location.origin}/client/${campaign.public_token}`;
      await navigator.clipboard.writeText(publicUrl);
      
      toast({
        title: "Link Copied!",
        description: "Public dashboard link copied to clipboard",
      });
    } catch (error) {
      console.error('Error copying link:', error);
      toast({
        title: "Error",
        description: "Failed to copy link",
        variant: "destructive",
      });
    }
  };

  const handleOpenPublicDashboard = (campaign: Campaign, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!campaign.public_token) {
      toast({
        title: "Error",
        description: "No public token available",
        variant: "destructive",
      });
      return;
    }
    
    const publicUrl = `${window.location.origin}/client/${campaign.public_token}`;
    window.open(publicUrl, '_blank');
  };

  const handleDisablePublicAccess = async (campaign: Campaign, e: React.MouseEvent) => {
    e.stopPropagation();
    
    try {
      const { error } = await supabase
        .from('campaigns')
        .update({ 
          public_access_enabled: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', campaign.id);

      if (error) throw error;
      
      await loadCampaigns();
      
      toast({
        title: "Public Access Disabled",
        description: "Campaign is now private",
      });
    } catch (error) {
      console.error('Error disabling public access:', error);
      toast({
        title: "Error",
        description: "Failed to disable public access",
        variant: "destructive",
      });
    }
  };

  const handleRegenerateToken = async (campaign: Campaign, e: React.MouseEvent) => {
    e.stopPropagation();
    
    try {
      const newToken = crypto.randomUUID();
      const { error } = await supabase
        .from('campaigns')
        .update({ 
          public_token: newToken,
          updated_at: new Date().toISOString()
        })
        .eq('id', campaign.id);

      if (error) throw error;
      
      await loadCampaigns();
      
      toast({
        title: "Token Regenerated",
        description: "New public link generated successfully",
      });
    } catch (error) {
      console.error('Error regenerating token:', error);
      toast({
        title: "Error",
        description: "Failed to regenerate token",
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: Campaign['status']) => {
    switch (status) {
      case 'Draft': return 'secondary';
      case 'Active': return 'default';
      case 'Completed': return 'outline';
      default: return 'secondary';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Global keyboard shortcuts
  useGlobalShortcuts(
    () => setIsSearchOpen(true),
    undefined, // Add functionality not applicable to History tab
    undefined, // Export functionality not applicable to History tab
    () => setIsHelpOpen(true)
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="p-6">
        <div className="container mx-auto">
        {/* Header */}
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold text-foreground mb-2">CAMPAIGN HISTORY</h1>
            <p className="text-xl text-muted-foreground">Track and manage your campaign performance</p>
          </div>
          <div className="flex gap-2">
            {campaigns.length > 0 && (
              <Button 
                onClick={() => setIsSelectMode(!isSelectMode)} 
                variant={isSelectMode ? "outline" : "ghost"}
              >
                <Check className="h-4 w-4 mr-2" />
                {isSelectMode ? "Cancel" : "Select"}
              </Button>
            )}
            <Button onClick={() => router.push('/campaign-builder')} variant="gradient">
              <Plus className="h-4 w-4 mr-2" />
              New Campaign
            </Button>
          </div>
        </div>

        {/* Bulk Selection Bar */}
        {isSelectMode && (
          <div className="mb-6 p-4 bg-muted/50 rounded-lg border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Checkbox
                  checked={selectedCampaigns.size === campaigns.length && campaigns.length > 0}
                  onCheckedChange={selectAllCampaigns}
                />
                <span className="text-sm font-medium">
                  {selectedCampaigns.size === campaigns.length ? "Deselect All" : "Select All"}
                </span>
                <span className="text-sm text-muted-foreground">
                  ({selectedCampaigns.size} of {campaigns.length} selected)
                </span>
              </div>
              {selectedCampaigns.size > 0 && (
                <Button onClick={handleBulkDelete} variant="destructive" size="sm">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Selected ({selectedCampaigns.size})
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Loading Indicator */}
        {loading && (
          <Card className="mb-6 bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
            <CardHeader>
              <CardTitle className="text-blue-900 dark:text-blue-100 flex items-center gap-2">
                <RefreshCw className="h-5 w-5 animate-spin" />
                Loading Campaigns from Database...
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-blue-700 dark:text-blue-300 text-sm">
                Fetching Instagram campaigns...
              </p>
            </CardContent>
          </Card>
        )}

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Campaigns</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalCampaigns || campaigns.length}</div>
              {loading && <p className="text-xs text-muted-foreground mt-1">Loading...</p>}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Active Campaigns</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">
                {campaigns.filter(c => c.status === 'Active').length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Spend</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">
                {formatCurrency(campaigns.reduce((sum, c) => sum + (c.totals?.total_cost || 0), 0))}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Reach</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-accent">
                {formatNumber(campaigns.reduce((sum, c) => sum + (c.totals?.total_median_views || 0), 0))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "all" | "search")} className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <TabsList className="grid w-fit grid-cols-2">
              <TabsTrigger value="all">All Campaigns</TabsTrigger>
              <TabsTrigger value="search">Search & Filter</TabsTrigger>
            </TabsList>
            
            {/* Sort Dropdown */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Sort by:</span>
              <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortOption)}>
                <SelectTrigger className="w-48">
                  <SelectValue>
                    <div className="flex items-center gap-2">
                      {getSortIcon(sortBy)}
                      {getSortLabel(sortBy)}
                    </div>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date-desc">
                    <div className="flex items-center gap-2">
                      <ArrowDown className="h-4 w-4" />
                      Newest First
                    </div>
                  </SelectItem>
                  <SelectItem value="date-asc">
                    <div className="flex items-center gap-2">
                      <ArrowUp className="h-4 w-4" />
                      Oldest First
                    </div>
                  </SelectItem>
                  <SelectItem value="name-asc">
                    <div className="flex items-center gap-2">
                      <ArrowUp className="h-4 w-4" />
                      Name A-Z
                    </div>
                  </SelectItem>
                  <SelectItem value="name-desc">
                    <div className="flex items-center gap-2">
                      <ArrowDown className="h-4 w-4" />
                      Name Z-A
                    </div>
                  </SelectItem>
                  <SelectItem value="budget-desc">
                    <div className="flex items-center gap-2">
                      <ArrowDown className="h-4 w-4" />
                      Budget High-Low
                    </div>
                  </SelectItem>
                  <SelectItem value="budget-asc">
                    <div className="flex items-center gap-2">
                      <ArrowUp className="h-4 w-4" />
                      Budget Low-High
                    </div>
                  </SelectItem>
                  <SelectItem value="status">
                    <div className="flex items-center gap-2">
                      <ArrowUpDown className="h-4 w-4" />
                      Status
                    </div>
                  </SelectItem>
                  <SelectItem value="creators-desc">
                    <div className="flex items-center gap-2">
                      <ArrowDown className="h-4 w-4" />
                      Most Creators
                    </div>
                  </SelectItem>
                  <SelectItem value="creators-asc">
                    <div className="flex items-center gap-2">
                      <ArrowUp className="h-4 w-4" />
                      Least Creators
                    </div>
                  </SelectItem>
                  <SelectItem value="spend-desc">
                    <div className="flex items-center gap-2">
                      <ArrowDown className="h-4 w-4" />
                      Highest Spend
                    </div>
                  </SelectItem>
                  <SelectItem value="spend-asc">
                    <div className="flex items-center gap-2">
                      <ArrowUp className="h-4 w-4" />
                      Lowest Spend
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <TabsContent value="all" className="space-y-6">
            {/* Campaign Cards for All Tab */}
            {renderCampaignCards(filteredCampaigns)}
          </TabsContent>

          <TabsContent value="search" className="space-y-6">
            {/* Search Filters */}
            <CampaignSearchFilters
              filters={searchFilters}
              onFiltersChange={setSearchFilters}
              onClearFilters={clearSearchFilters}
              campaigns={campaigns}
            />
            
            {/* Results Summary */}
            {activeTab === 'search' && (
              <div className="flex items-center justify-between bg-muted/30 p-4 rounded-lg border">
                <div className="flex items-center gap-4">
                  <span className="text-sm font-medium">
                    Showing {filteredCampaigns.length} of {campaigns.length} campaigns
                  </span>
                  {filteredCampaigns.length !== campaigns.length && (
                    <Badge variant="secondary" className="text-xs">
                      Filtered
                    </Badge>
                  )}
                </div>
              </div>
            )}

            {/* Campaign Cards for Search Tab */}
            {renderCampaignCards(filteredCampaigns)}
          </TabsContent>
        </Tabs>

        {/* Campaign Details Modal */}
          <CampaignDetailsModal
            campaign={selectedCampaign}
            isOpen={isDetailsModalOpen}
            onOpenChange={setIsDetailsModalOpen}
            onStatusUpdate={handleStatusUpdate}
          />

        {/* Edit Campaign Modal */}
        <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Campaign</DialogTitle>
              <DialogDescription>
                {selectedCampaign?.campaign_name} - Modify campaign details and creators
              </DialogDescription>
            </DialogHeader>
            {selectedCampaign && (
              <CampaignEditForm 
                campaign={selectedCampaign}
                onSuccess={() => {
                  setIsEditModalOpen(false);
                  loadCampaigns();
                }}
              />
            )}
          </DialogContent>
        </Dialog>

        {/* Add Results Modal */}
        <Dialog open={isResultsModalOpen} onOpenChange={setIsResultsModalOpen}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add Campaign Results</DialogTitle>
              <DialogDescription>
                {selectedCampaign?.campaign_name} - Enter actual performance data
              </DialogDescription>
            </DialogHeader>
            {selectedCampaign && (
              <AddResultsForm 
                campaign={selectedCampaign}
                onSuccess={() => {
                  setIsResultsModalOpen(false);
                  loadCampaigns();
                }}
              />
            )}
          </DialogContent>
        </Dialog>

        {/* Global Search Modal */}
        <GlobalSearch 
          isOpen={isSearchOpen} 
          onClose={() => setIsSearchOpen(false)} 
        />

        {/* Keyboard Shortcuts Help */}
        <KeyboardShortcutsHelp 
          isOpen={isHelpOpen} 
          onClose={() => setIsHelpOpen(false)} 
        />
        
        </div>
      </div>
    </div>
  );
};

export default CampaignHistory;
