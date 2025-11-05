import { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, Upload, Download, Edit, Trash2, HelpCircle, ChevronUp, ChevronDown, Filter, X, CheckCircle2, AlertTriangle } from "lucide-react";
import { Creator } from '../lib/types';
import { getCreators, saveCreator, updateCreator, deleteCreator, importCreators } from '../lib/localStorage';
import { parseCreatorCSV } from '../lib/csvUtils';
import { AdvancedSearchFilters, SearchFilters } from '../components/AdvancedSearchFilters';
import { CreatorDetailModal } from '../components/CreatorDetailModal';
import { AddCreatorForm } from '../components/AddCreatorForm';
import { EditCreatorForm } from '../components/EditCreatorForm';
import { GlobalSearch } from '../components/GlobalSearch';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { KeyboardShortcutsHelp } from '../components/KeyboardShortcutsHelp';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { useTagSync } from '../hooks/useTagSync';
import { migrateCreatorsToSupabase, getSupabaseCreators } from '../lib/creatorMigration';
import { toast } from "../hooks/use-toast";
import { TableSkeleton, UploadProgress } from "../components/LoadingStates";

type SortField = 'instagram_handle' | 'followers' | 'median_views_per_video' | 'engagement_rate' | 'base_country' | 'reel_rate';
type SortDirection = 'asc' | 'desc';

const CreatorDatabase = () => {
  const location = useLocation();
  const [creators, setCreators] = useState<Creator[]>([]);
  const [filteredCreators, setFilteredCreators] = useState<Creator[]>([]);
  const [isUnderutilizedView, setIsUnderutilizedView] = useState(false);
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCsvInfoModalOpen, setIsCsvInfoModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [editingCreator, setEditingCreator] = useState<Creator | null>(null);
  const [viewingCreator, setViewingCreator] = useState<Creator | null>(null);
  const [selectedCreators, setSelectedCreators] = useState<Set<string>>(new Set());
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [creatorToDelete, setCreatorToDelete] = useState<Creator | null>(null);
  const [searchFilters, setSearchFilters] = useState({
    query: '',
    genre: '',
    country: '',
    audienceTerritory: '',
    contentType: '',
    minFollowers: '',
    maxFollowers: '',
    minEngagement: '',
    maxEngagement: ''
  });
  const [isLoading, setIsLoading] = useState(true);
  const [uploadProgress, setUploadProgress] = useState<{ fileName: string; progress: number; status: string } | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { tags } = useTagSync();

  const migrateCreatorsIfNeeded = async () => {
    try {
      const result = await migrateCreatorsToSupabase();
      if (result.success && result.migrated > 0) {
        toast({
          title: "Migration Complete",
          description: `Successfully migrated ${result.migrated} creators to database`,
        });
        // Reload creators from Supabase after migration
        await loadCreators();
      }
    } catch (error) {
      console.error('Migration failed:', error);
    }
  };

  useEffect(() => {
    migrateCreatorsIfNeeded();
    loadCreators();
  }, []);

  useEffect(() => {
    // Check if we're viewing filtered creators from dashboard/recommendations
    if (location.state?.filter === 'underutilized' && location.state?.creators) {
      setIsUnderutilizedView(true);
      // Set the filtered creators and apply engagement filter
      setFilteredCreators(location.state.creators);
      setSearchFilters(prev => ({
        ...prev,
        minEngagement: location.state.engagementFilter?.min?.toString() || '5'
      }));
    } else if (location.state?.filter === 'performance' && location.state?.performanceFilter) {
      // Apply performance-based filters
      const { min, max } = location.state.performanceFilter;
      setSearchFilters(prev => ({
        ...prev,
        minEngagement: min ? min.toString() : '',
        maxEngagement: max ? max.toString() : ''
      }));
    } else if (location.state?.engagementFilter) {
      // Apply engagement filter from underutilized view
      const { min } = location.state.engagementFilter;
      setSearchFilters(prev => ({
        ...prev,
        minEngagement: min ? min.toString() : ''
      }));
    } else if (location.state?.filter === 'specific_creator' && location.state?.searchQuery) {
      // Search for specific creator
      setSearchFilters(prev => ({
        ...prev,
        query: location.state.searchQuery
      }));
    } else if (location.state?.filter === 'genre' && location.state?.genreFilter) {
      // Filter by genre
      setSearchFilters(prev => ({
        ...prev,
        genre: location.state.genreFilter
      }));
    } else if (location.state?.filter === 'country' && location.state?.countryFilter) {
      // Filter by country
      setSearchFilters(prev => ({
        ...prev,
        country: location.state.countryFilter
      }));
    }
  }, [location.state]);

  useEffect(() => {
    handleFiltering();
  }, [creators, searchFilters, sortField, sortDirection]);

  const loadCreators = async () => {
    setIsLoading(true);
    try {
      // Try to load from Supabase first, fallback to localStorage
      let loadedCreators: Creator[] = [];
      try {
        const supabaseCreators = await getSupabaseCreators();
        if (supabaseCreators.length > 0) {
          // Convert Supabase creators to UI format
          loadedCreators = supabaseCreators.map(creator => ({
            id: creator.id,
            instagram_handle: creator.instagram_handle,
            email: '', // Email not available in public RPC for security
            base_country: creator.base_country,
            followers: Number(creator.followers),
            median_views_per_video: Number(creator.median_views_per_video),
            engagement_rate: Number(creator.engagement_rate),
            reel_rate: creator.reel_rate || 0,
            carousel_rate: creator.carousel_rate || 0,
            story_rate: creator.story_rate || 0,
            content_types: creator.content_types || [],
            music_genres: creator.music_genres || [],
            audience_countries: creator.audience_territories || [],
            created_at: creator.created_at,
            updated_at: creator.updated_at
          }));
        } else {
          // Fallback to localStorage if no creators in Supabase
          loadedCreators = await getCreators();
        }
      } catch (supabaseError) {
        console.warn('Failed to load from Supabase, using localStorage:', supabaseError);
        loadedCreators = await getCreators();
      }
      
      setCreators(loadedCreators);
    } catch (error) {
      toast({
        title: "Error", 
        description: "Failed to load creators",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFiltering = () => {
    // Use underutilized creators as base if in that mode, otherwise use all creators
    let filtered = isUnderutilizedView && location.state?.creators ? location.state.creators : creators;
    
    // Apply text search across all fields
    if (searchFilters.query.trim()) {
      const query = searchFilters.query.toLowerCase();
      filtered = filtered.filter(creator => 
        creator.instagram_handle.toLowerCase().includes(query) ||
        creator.base_country.toLowerCase().includes(query) ||
        creator.email?.toLowerCase().includes(query) ||
        creator.music_genres.some(genre => genre.toLowerCase().includes(query)) ||
        creator.content_types.some(type => type.toLowerCase().includes(query))
      );
    }

    // Apply specific filters
    if (searchFilters.genre) {
      filtered = filtered.filter(creator => 
        creator.music_genres.includes(searchFilters.genre)
      );
    }

    if (searchFilters.country) {
      filtered = filtered.filter(creator => 
        creator.base_country === searchFilters.country
      );
    }

    if (searchFilters.audienceTerritory) {
      filtered = filtered.filter(creator => 
        creator.audience_countries?.includes(searchFilters.audienceTerritory)
      );
    }

    if (searchFilters.contentType) {
      filtered = filtered.filter(creator => 
        creator.content_types.includes(searchFilters.contentType)
      );
    }

    // Apply numeric filters
    if (searchFilters.minFollowers) {
      filtered = filtered.filter(creator => 
        creator.followers >= parseInt(searchFilters.minFollowers)
      );
    }

    if (searchFilters.maxFollowers) {
      filtered = filtered.filter(creator => 
        creator.followers <= parseInt(searchFilters.maxFollowers)
      );
    }

    if (searchFilters.minEngagement) {
      filtered = filtered.filter(creator => 
        creator.engagement_rate >= parseFloat(searchFilters.minEngagement)
      );
    }

    if (searchFilters.maxEngagement) {
      filtered = filtered.filter(creator => 
        creator.engagement_rate <= parseFloat(searchFilters.maxEngagement)
      );
    }

    // Apply sorting
    if (sortField) {
      filtered = [...filtered].sort((a, b) => {
        let aValue: any = a[sortField];
        let bValue: any = b[sortField];

        // Handle string values
        if (typeof aValue === 'string' && typeof bValue === 'string') {
          aValue = aValue.toLowerCase();
          bValue = bValue.toLowerCase();
        }

        // Handle numeric values
        if (typeof aValue === 'number' && typeof bValue === 'number') {
          return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
        }

        // Handle string comparison
        if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }

    setFilteredCreators(filtered);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Show upload progress
    setUploadProgress({ fileName: file.name, progress: 0, status: 'uploading' });

    try {
      // Simulate upload progress
      for (let i = 0; i <= 100; i += 20) {
        setUploadProgress({ fileName: file.name, progress: i, status: 'uploading' });
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      setUploadProgress({ fileName: file.name, progress: 100, status: 'processing' });
      
      console.log('🔄 Starting CSV parsing...');
      const parsedCreators = await parseCreatorCSV(file);
      console.log(`✅ CSV parsed successfully: ${parsedCreators.length} creators found`);
      
      if (parsedCreators.length === 0) {
        throw new Error('No valid creators found in CSV file. Please check the format.');
      }

      console.log('🔄 Starting database import...');
      
      // Clear any existing creators first if this is a full reimport
      console.log('💾 Importing creators to database...');
      await importCreators(parsedCreators);
      
      console.log('✅ Database import completed');
      
      setUploadProgress({ fileName: file.name, progress: 100, status: 'complete' });
      
      console.log('🔄 Refreshing creator list...');
      await loadCreators(); // Wait for the reload to complete
      console.log('✅ Creator list refreshed');
      
      toast({
        title: "Success",
        description: `Imported ${parsedCreators.length} creators successfully`,
      });

      // Clear progress after delay
      setTimeout(() => setUploadProgress(null), 2000);
    } catch (error) {
      console.error('❌ Import failed:', error);
      setUploadProgress({ fileName: file.name, progress: 100, status: 'error' });
      toast({
        title: "Import Failed",
        description: error instanceof Error ? error.message : "Failed to import CSV",
        variant: "destructive",
      });
      setTimeout(() => setUploadProgress(null), 3000);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleView = (creator: Creator) => {
    setViewingCreator(creator);
    setIsDetailModalOpen(true);
  };

  const handleEdit = (creator: Creator) => {
    setEditingCreator(creator);
    setIsEditModalOpen(true);
  };

  const confirmDelete = (creator: Creator) => {
    setCreatorToDelete(creator);
    setIsDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!creatorToDelete) return;
    
    try {
      await deleteCreator(creatorToDelete.id);
      await loadCreators();
      toast({
        title: "Creator Deleted",
        description: "Creator has been removed from the database",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete creator",
        variant: "destructive",
      });
    }
    
    setIsDeleteDialogOpen(false);
    setCreatorToDelete(null);
  };

  const handleBulkDelete = async () => {
    if (selectedCreators.size === 0) return;
    
    try {
      await Promise.all(Array.from(selectedCreators).map(id => deleteCreator(id)));
      await loadCreators();
      setSelectedCreators(new Set());
      toast({
        title: "Creators Deleted",
        description: `${selectedCreators.size} creators have been removed from the database`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete creators",
        variant: "destructive",
      });
    }
  };

  const toggleCreatorSelection = (creatorId: string) => {
    const newSelected = new Set(selectedCreators);
    if (newSelected.has(creatorId)) {
      newSelected.delete(creatorId);
    } else {
      newSelected.add(creatorId);
    }
    setSelectedCreators(newSelected);
  };

  const selectAllCreators = () => {
    if (selectedCreators.size === filteredCreators.length) {
      setSelectedCreators(new Set());
    } else {
      setSelectedCreators(new Set(filteredCreators.map(c => c.id)));
    }
  };

  const clearAllFilters = () => {
    setSearchFilters({
      query: '',
      genre: '',
      country: '',
      audienceTerritory: '',
      contentType: '',
      minFollowers: '',
      maxFollowers: '',
      minEngagement: '',
      maxEngagement: ''
    });
    setSortField(null);
    setSortDirection('asc');
  };

  const hasActiveFilters = Object.values(searchFilters).some(value => value !== '') || sortField;
  const uniqueCountries = [...new Set(creators.map(c => c.base_country))].sort();

  const handleExport = () => {
    const csvContent = formatCreatorsAsCSV(filteredCreators);
    downloadCSV(csvContent, 'creators.csv');
    toast({
      title: "Export Complete",
      description: "Creator database exported successfully",
    });
  };

  const formatCreatorsAsCSV = (creators: Creator[]) => {
    const headers = ['instagram_handle', 'followers', 'median_views_per_video', 'engagement_rate', 'base_country', 'music_genres', 'content_types', 'reel_rate'];
    const rows = creators.map(creator => [
      creator.instagram_handle,
      creator.followers,
      creator.median_views_per_video, 
      creator.engagement_rate,
      creator.base_country,
      creator.music_genres.join(';'),
      creator.content_types.join(';'),
      creator.reel_rate
    ]);
    return [headers, ...rows].map(row => row.join(',')).join('\n');
  };

  const downloadCSV = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const calculateCPV = (creator: Creator) => {
    return creator.median_views_per_video > 0 
      ? (creator.reel_rate / creator.median_views_per_video * 1000).toFixed(2)
      : '0.00';
  };

  // Global keyboard shortcuts
  useKeyboardShortcuts([
    { key: 'k', ctrl: true, description: 'Search', action: () => setIsSearchOpen(true) },
    { key: 'n', ctrl: true, description: 'Add Creator', action: () => setIsAddModalOpen(true) },
    { key: 'e', ctrl: true, description: 'Export', action: handleExport },
    { key: 'h', ctrl: true, description: 'Help', action: () => setIsHelpOpen(true) }
  ]);

  return (
    <div className="min-h-screen bg-background">
      <div className="p-8">
        <div className="container mx-auto max-w-7xl">
          <Breadcrumbs />
          {/* Header */}
          <div className="mb-10">
            <h1 className="text-5xl font-bebas text-accent mb-3 tracking-wider">CREATOR DATABASE</h1>
            <p className="text-xl text-muted-foreground font-medium">Manage your Instagram creator database</p>
          </div>

          {/* Underutilized Creators Alert */}
          {isUnderutilizedView && (
            <div className="mb-8">
              <div className="flex items-center gap-3 p-4 bg-warning/10 rounded-lg border border-warning/30">
                <AlertTriangle className="h-5 w-5 text-warning flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-foreground">Underutilized High Performers</h3>
                  <p className="text-sm text-muted-foreground">
                    These creators have 5%+ engagement and haven't been used in campaigns within the last 60 days.
                  </p>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    setIsUnderutilizedView(false);
                    setSearchFilters(prev => ({ ...prev, minEngagement: '' }));
                    loadCreators();
                  }}
                  className="ml-auto"
                >
                  View All Creators
                </Button>
              </div>
            </div>
          )}

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Total Creators</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-foreground">{creators.length}</div>
              </CardContent>
            </Card>
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Total Followers</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-foreground">
                  {(creators.reduce((sum, c) => sum + c.followers, 0) / 1000000).toFixed(1)}M
                </div>
              </CardContent>
            </Card>
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Total Median Views</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-accent">
                  {(creators.reduce((sum, c) => sum + c.median_views_per_video, 0) / 1000000).toFixed(1)}M
                </div>
              </CardContent>
            </Card>
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Showing Results</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-foreground">{filteredCreators.length}</div>
              </CardContent>
            </Card>
          </div>

          {/* Advanced Search Filters */}
          <AdvancedSearchFilters
            filters={searchFilters}
            onFiltersChange={setSearchFilters}
            onClearFilters={clearAllFilters}
            availableCountries={uniqueCountries}
          />

          {/* Actions Bar */}
          <div className="space-y-6 mb-10">
            <div className="flex flex-col md:flex-row gap-6 justify-end">
            
              <div className="flex gap-3">
                <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
                  <DialogTrigger asChild>
                    <Button variant="gradient" className="flex items-center gap-2">
                      <Plus className="h-4 w-4" />
                      Add Creator
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Add New Creator</DialogTitle>
                      <DialogDescription>
                        Add a new Instagram creator to your database
                      </DialogDescription>
                    </DialogHeader>
                    <AddCreatorForm 
                      onSuccess={() => {
                        setIsAddModalOpen(false);
                        loadCreators();
                      }}
                    />
                  </DialogContent>
                </Dialog>

                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept=".csv"
                  className="hidden"
                />
                <Dialog open={isCsvInfoModalOpen} onOpenChange={setIsCsvInfoModalOpen}>
                  <DialogTrigger asChild>
                    <Button 
                      variant="outline"
                      className="flex items-center gap-2"
                    >
                      <Upload className="h-4 w-4" />
                      Import CSV
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-lg">
                    <DialogHeader>
                      <DialogTitle>CSV Import Format</DialogTitle>
                      <DialogDescription>
                        Your CSV file should include these columns in order:
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3">
                      <div className="bg-muted/50 p-4 rounded-md">
                        <p className="text-sm font-medium mb-2">Required columns:</p>
                        <ul className="text-sm space-y-1 text-muted-foreground">
                          <li>1. instagram_handle (without @)</li>
                          <li>2. followers (number)</li>
                          <li>3. median_views_per_video (number)</li>
                          <li>4. engagement_rate (percentage as decimal, e.g., 4.5)</li>
                          <li>5. base_country (e.g., "United States")</li>
                          <li>6. music_genres (comma-separated, e.g., "Pop,Rock")</li>
                          <li>7. content_types (comma-separated, e.g., "Dance,Lifestyle")</li>
                          <li>8. reel_rate (number, e.g., 350)</li>
                          <li>9. carousel_rate (optional number)</li>
                          <li>10. story_rate (optional number)</li>
                        </ul>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          onClick={() => {
                            setIsCsvInfoModalOpen(false);
                            fileInputRef.current?.click();
                          }}
                          className="flex-1"
                        >
                          Choose File
                        </Button>
                        <Button 
                          variant="outline" 
                          onClick={() => setIsCsvInfoModalOpen(false)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>

                <Button 
                  variant="secondary"
                  onClick={handleExport}
                  className="flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Export CSV
                </Button>
              </div>
            </div>


            {/* Bulk Actions */}
            {selectedCreators.size > 0 && (
              <div className="flex items-center gap-3 p-3 bg-primary/10 rounded-lg border border-primary/20">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">
                  {selectedCreators.size} creator{selectedCreators.size > 1 ? 's' : ''} selected
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const csvContent = formatCreatorsAsCSV(filteredCreators.filter(c => selectedCreators.has(c.id)));
                    downloadCSV(csvContent, 'selected_creators.csv');
                  }}
                >
                  <Download className="h-3 w-3 mr-1" />
                  Export Selected
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleBulkDelete}
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  Delete Selected
                </Button>
              </div>
            )}
          </div>

          {/* Creator Table */}
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border/50 hover:bg-muted/50">
                        <TableHead className="font-bold text-foreground uppercase tracking-wide py-4 w-12">
                          <Checkbox
                            checked={selectedCreators.size === filteredCreators.length && filteredCreators.length > 0}
                            onCheckedChange={selectAllCreators}
                          />
                        </TableHead>
                        <TableHead className="font-bold text-foreground uppercase tracking-wide py-4">
                          <button 
                            className="flex items-center gap-1 hover:text-primary transition-colors group"
                            onClick={() => handleSort('instagram_handle')}
                          >
                            HANDLE
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                              {sortField === 'instagram_handle' ? (
                                sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronUp className="h-4 w-4" />
                              )}
                            </div>
                          </button>
                        </TableHead>
                        <TableHead className="font-bold text-foreground uppercase tracking-wide py-4">
                          <button 
                            className="flex items-center gap-1 hover:text-primary transition-colors group"
                            onClick={() => handleSort('followers')}
                          >
                            FOLLOWERS
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                              {sortField === 'followers' ? (
                                sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronUp className="h-4 w-4" />
                              )}
                            </div>
                          </button>
                        </TableHead>
                        <TableHead className="font-bold text-foreground uppercase tracking-wide py-4">
                          <button 
                            className="flex items-center gap-1 hover:text-primary transition-colors group"
                            onClick={() => handleSort('median_views_per_video')}
                          >
                            MEDIAN VIEWS
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                              {sortField === 'median_views_per_video' ? (
                                sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronUp className="h-4 w-4" />
                              )}
                            </div>
                          </button>
                        </TableHead>
                        <TableHead className="font-bold text-foreground uppercase tracking-wide py-4">
                          <button 
                            className="flex items-center gap-1 hover:text-primary transition-colors group"
                            onClick={() => handleSort('engagement_rate')}
                          >
                            ENGAGEMENT
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                              {sortField === 'engagement_rate' ? (
                                sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronUp className="h-4 w-4" />
                              )}
                            </div>
                          </button>
                        </TableHead>
                        <TableHead className="font-bold text-foreground uppercase tracking-wide py-4">
                          <button 
                            className="flex items-center gap-1 hover:text-primary transition-colors group"
                            onClick={() => handleSort('base_country')}
                          >
                            COUNTRY
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                              {sortField === 'base_country' ? (
                                sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronUp className="h-4 w-4" />
                              )}
                            </div>
                          </button>
                        </TableHead>
                        <TableHead className="font-bold text-foreground uppercase tracking-wide py-4">AUDIENCE</TableHead>
                        <TableHead className="font-bold text-foreground uppercase tracking-wide py-4">GENRES</TableHead>
                        <TableHead className="font-bold text-foreground uppercase tracking-wide py-4">CONTENT TYPES</TableHead>
                        <TableHead className="font-bold text-foreground uppercase tracking-wide py-4">
                          <button 
                            className="flex items-center gap-1 hover:text-primary transition-colors group"
                            onClick={() => handleSort('reel_rate')}
                          >
                            REEL RATE
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                              {sortField === 'reel_rate' ? (
                                sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronUp className="h-4 w-4" />
                              )}
                            </div>
                          </button>
                        </TableHead>
                        <TableHead className="font-bold text-foreground uppercase tracking-wide py-4">CPV</TableHead>
                        <TableHead className="font-bold text-foreground uppercase tracking-wide py-4">ACTIONS</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredCreators.map((creator) => (
                        <TableRow key={creator.id} className="border-border/50 hover:bg-muted/30 transition-colors">
                          <TableCell className="w-12">
                            <Checkbox
                              checked={selectedCreators.has(creator.id)}
                              onCheckedChange={() => toggleCreatorSelection(creator.id)}
                            />
                          </TableCell>
                          <TableCell className="font-bold text-foreground py-4">
                            <button 
                              className="text-left hover:text-primary transition-colors cursor-pointer"
                              onClick={() => handleView(creator)}
                            >
                              @{creator.instagram_handle}
                            </button>
                          </TableCell>
                          <TableCell className="font-medium text-foreground py-4">{(creator.followers / 1000).toFixed(0)}K</TableCell>
                          <TableCell className="font-medium text-foreground py-4">{(creator.median_views_per_video / 1000).toFixed(0)}K</TableCell>
                          <TableCell className="font-medium text-foreground py-4">{creator.engagement_rate}%</TableCell>
                          <TableCell className="py-4">
                            <Badge variant="secondary" className="font-medium">{creator.base_country}</Badge>
                          </TableCell>
                          <TableCell className="py-4">
                            <div className="flex flex-wrap gap-1">
                              {creator.audience_countries?.slice(0, 2).map((country) => (
                                <Badge key={country} variant="outline" className="text-xs font-medium">
                                  {country}
                                </Badge>
                              )) || <span className="text-muted-foreground text-xs">None set</span>}
                              {(creator.audience_countries?.length || 0) > 2 && (
                                <Badge variant="outline" className="text-xs font-medium">
                                  +{(creator.audience_countries?.length || 0) - 2}
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="py-4">
                            <div className="flex flex-wrap gap-1">
                              {creator.music_genres.slice(0, 2).map((genre) => (
                                <Badge key={genre} variant="default" className="text-xs font-medium">
                                  {genre}
                                </Badge>
                              ))}
                              {creator.music_genres.length > 2 && (
                                <Badge 
                                  variant="default" 
                                  className="text-xs font-medium" 
                                  title={creator.music_genres.slice(2).join(', ')}
                                >
                                  +{creator.music_genres.length - 2}
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="py-4">
                            <div className="flex flex-wrap gap-1">
                              {creator.content_types.slice(0, 2).map((type) => (
                                <Badge key={type} variant="outline" className="text-xs font-medium">
                                  {type}
                                </Badge>
                              ))}
                              {creator.content_types.length > 2 && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Badge variant="outline" className="text-xs font-medium cursor-help">
                                      +{creator.content_types.length - 2}
                                    </Badge>
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-xs">
                                    <div className="space-y-1">
                                      {creator.content_types.slice(2).map((type) => (
                                        <div key={type} className="text-xs">{type}</div>
                                      ))}
                                    </div>
                                  </TooltipContent>
                                </Tooltip>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="font-bold text-accent py-4">${creator.reel_rate}</TableCell>
                          <TableCell className="font-bold text-foreground py-4">${calculateCPV(creator)}</TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => handleEdit(creator)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => confirmDelete(creator)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

          {filteredCreators.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground text-lg">
                {hasActiveFilters ? 'No creators found matching your search.' : 'No creators in database.'}
              </p>
            </div>
          )}

          {/* Creator Detail Modal */}
          <CreatorDetailModal
            creator={viewingCreator}
            isOpen={isDetailModalOpen}
            onClose={() => {
              setIsDetailModalOpen(false);
              setViewingCreator(null);
            }}
            onEdit={(creator) => {
              setIsDetailModalOpen(false);
              setViewingCreator(null);
              handleEdit(creator);
            }}
          />

          {/* Edit Creator Modal */}
          <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Edit Creator</DialogTitle>
                <DialogDescription>
                  Update creator information
                </DialogDescription>
              </DialogHeader>
              {editingCreator && (
                <EditCreatorForm 
                  creator={editingCreator}
                  onSuccess={() => {
                    setIsEditModalOpen(false);
                    setEditingCreator(null);
                    loadCreators();
                  }}
                />
              )}
            </DialogContent>
          </Dialog>

          {/* Upload Progress */}
          {uploadProgress && (
            <div className="fixed bottom-4 right-4 z-50">
              <UploadProgress 
                fileName={uploadProgress.fileName}
                progress={uploadProgress.progress}
                status={uploadProgress.status as any}
              />
            </div>
          )}

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

          {/* Delete Confirmation Dialog */}
          <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete the creator
                  {creatorToDelete && ` @${creatorToDelete.instagram_handle}`} from your database.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  );
};

export default CreatorDatabase;