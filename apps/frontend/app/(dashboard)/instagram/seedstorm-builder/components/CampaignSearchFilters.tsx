import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { X, ChevronDown, ChevronUp, Filter, Search } from "lucide-react";
import { Campaign, MUSIC_GENRES } from "../lib/types";

export interface CampaignFilters {
  searchQuery: string;
  status: Campaign['status'][];
  dateRange: {
    from: string;
    to: string;
  };
  budgetRange: {
    min: number;
    max: number;
  };
  selectedGenres: string[];
  creatorCountRange: {
    min: number;
    max: number;
  };
  spendRange: {
    min: number;
    max: number;
  };
  publicAccess?: boolean;
}

interface CampaignSearchFiltersProps {
  filters: CampaignFilters;
  onFiltersChange: (filters: CampaignFilters) => void;
  onClearFilters: () => void;
  campaigns: Campaign[];
}

export const CampaignSearchFilters = ({
  filters,
  onFiltersChange,
  onClearFilters,
  campaigns
}: CampaignSearchFiltersProps) => {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const updateFilter = <K extends keyof CampaignFilters>(
    key: K,  
    value: CampaignFilters[K]
  ) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const handleStatusChange = (status: Campaign['status'], checked: boolean) => {
    const currentStatus = filters.status || [];
    if (checked) {
      updateFilter('status', [...currentStatus, status]);
    } else {
      updateFilter('status', currentStatus.filter(s => s !== status));
    }
  };

  const handleGenreChange = (genre: string, checked: boolean) => {
    const currentGenres = filters.selectedGenres || [];
    if (checked) {
      updateFilter('selectedGenres', [...currentGenres, genre]);
    } else {
      updateFilter('selectedGenres', currentGenres.filter(g => g !== genre));
    }
  };

  const clearFilter = (filterKey: keyof CampaignFilters) => {
    switch (filterKey) {
      case 'searchQuery':
        updateFilter('searchQuery', '');
        break;
      case 'status':
        updateFilter('status', []);
        break;
      case 'selectedGenres':
        updateFilter('selectedGenres', []);
        break;
      case 'dateRange':
        updateFilter('dateRange', { from: '', to: '' });
        break;
      case 'budgetRange':
        updateFilter('budgetRange', { min: 0, max: 1000000 });
        break;
      case 'creatorCountRange':
        updateFilter('creatorCountRange', { min: 0, max: 100 });
        break;
      case 'spendRange':
        updateFilter('spendRange', { min: 0, max: 500000 });
        break;
      case 'publicAccess':
        updateFilter('publicAccess', undefined);
        break;
    }
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (filters.searchQuery) count++;
    if (filters.status?.length) count++;
    if (filters.selectedGenres?.length) count++;
    if (filters.dateRange?.from || filters.dateRange?.to) count++;
    if (filters.budgetRange?.min > 0 || filters.budgetRange?.max < 1000000) count++;
    if (filters.creatorCountRange?.min > 0 || filters.creatorCountRange?.max < 100) count++;
    if (filters.spendRange?.min > 0 || filters.spendRange?.max < 500000) count++;
    if (filters.publicAccess !== undefined) count++;
    return count;
  };

  const hasActiveFilters = getActiveFiltersCount() > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Search & Filter Campaigns
            {hasActiveFilters && (
              <Badge variant="secondary" className="ml-2">
                {getActiveFiltersCount()} active
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClearFilters}
                className="text-muted-foreground hover:text-foreground"
              >
                Clear All
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-1"
            >
              Advanced
              {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Basic Search */}
        <div className="space-y-2">
          <Label htmlFor="search">Search Campaigns</Label>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              id="search"
              placeholder="Search by campaign name or creator handles..."
              value={filters.searchQuery}
              onChange={(e) => updateFilter('searchQuery', e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Status Filter */}
        <div className="space-y-3">
          <Label>Campaign Status</Label>
          <div className="flex flex-wrap gap-3">
            {(['Draft', 'Active', 'Completed'] as const).map((status) => (
              <div key={status} className="flex items-center space-x-2">
                <Checkbox
                  id={`status-${status}`}
                  checked={filters.status?.includes(status) || false}
                  onCheckedChange={(checked) => handleStatusChange(status, checked as boolean)}
                />
                <Label htmlFor={`status-${status}`} className="text-sm font-normal">
                  {status}
                </Label>
              </div>
            ))}
          </div>
        </div>

        {/* Public Access Filter */}
        <div className="space-y-3">
          <Label>Access Type</Label>
          <Select
            value={filters.publicAccess?.toString() || "all"}
            onValueChange={(value) => 
              updateFilter('publicAccess', value === "all" ? undefined : value === "true")
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="All campaigns" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All campaigns</SelectItem>
              <SelectItem value="true">Public campaigns only</SelectItem>
              <SelectItem value="false">Private campaigns only</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Advanced Filters */}
        {showAdvanced && (
          <div className="space-y-6 pt-4 border-t border-border">
            {/* Date Range */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date-from">Created From</Label>
                <Input
                  id="date-from"
                  type="date"
                  value={filters.dateRange?.from || ''}
                  onChange={(e) => updateFilter('dateRange', { 
                    ...filters.dateRange, 
                    from: e.target.value 
                  })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="date-to">Created To</Label>
                <Input
                  id="date-to"
                  type="date"
                  value={filters.dateRange?.to || ''}
                  onChange={(e) => updateFilter('dateRange', { 
                    ...filters.dateRange, 
                    to: e.target.value 
                  })}
                />
              </div>
            </div>

            {/* Budget Range */}
            <div className="space-y-3">
              <Label>Budget Range</Label>
              <div className="px-3">
                <Slider
                  value={[filters.budgetRange?.min || 0, filters.budgetRange?.max || 1000000]}
                  onValueChange={([min, max]) => updateFilter('budgetRange', { min, max })}
                  max={1000000}
                  step={5000}
                  className="w-full"
                />
                <div className="flex justify-between text-sm text-muted-foreground mt-2">
                  <span>${(filters.budgetRange?.min || 0).toLocaleString()}</span>
                  <span>${(filters.budgetRange?.max || 1000000).toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Creator Count Range */}
            <div className="space-y-3">
              <Label>Creator Count Range</Label>
              <div className="px-3">
                <Slider
                  value={[filters.creatorCountRange?.min || 0, filters.creatorCountRange?.max || 100]}
                  onValueChange={([min, max]) => updateFilter('creatorCountRange', { min, max })}
                  max={100}
                  step={1}
                  className="w-full"
                />
                <div className="flex justify-between text-sm text-muted-foreground mt-2">
                  <span>{filters.creatorCountRange?.min || 0} creators</span>
                  <span>{filters.creatorCountRange?.max || 100} creators</span>
                </div>
              </div>
            </div>

            {/* Spend Range */}
            <div className="space-y-3">
              <Label>Total Spend Range</Label>
              <div className="px-3">
                <Slider
                  value={[filters.spendRange?.min || 0, filters.spendRange?.max || 500000]}
                  onValueChange={([min, max]) => updateFilter('spendRange', { min, max })}
                  max={500000}
                  step={1000}
                  className="w-full"
                />
                <div className="flex justify-between text-sm text-muted-foreground mt-2">
                  <span>${(filters.spendRange?.min || 0).toLocaleString()}</span>
                  <span>${(filters.spendRange?.max || 500000).toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Genre Filter */}
            <div className="space-y-3">
              <Label>Music Genres</Label>
              <div className="max-h-32 overflow-y-auto space-y-2">
                {MUSIC_GENRES.map((genre) => (
                  <div key={genre} className="flex items-center space-x-2">
                    <Checkbox
                      id={`genre-${genre}`}
                      checked={filters.selectedGenres?.includes(genre) || false}
                      onCheckedChange={(checked) => handleGenreChange(genre, checked as boolean)}
                    />
                    <Label htmlFor={`genre-${genre}`} className="text-sm font-normal">
                      {genre}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Active Filters */}
        {hasActiveFilters && (
          <div className="space-y-2">
            <Label>Active Filters</Label>
            <div className="flex flex-wrap gap-2">
              {filters.searchQuery && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  Search: "{filters.searchQuery}"
                  <X 
                    className="h-3 w-3 cursor-pointer hover:text-destructive" 
                    onClick={() => clearFilter('searchQuery')}
                  />
                </Badge>
              )}
              {filters.status?.map((status) => (
                <Badge key={status} variant="secondary" className="flex items-center gap-1">
                  Status: {status}
                  <X 
                    className="h-3 w-3 cursor-pointer hover:text-destructive" 
                    onClick={() => handleStatusChange(status, false)}
                  />
                </Badge>
              ))}
              {filters.selectedGenres?.map((genre) => (
                <Badge key={genre} variant="secondary" className="flex items-center gap-1">
                  Genre: {genre}
                  <X 
                    className="h-3 w-3 cursor-pointer hover:text-destructive" 
                    onClick={() => handleGenreChange(genre, false)}
                  />
                </Badge>
              ))}
              {filters.publicAccess !== undefined && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  {filters.publicAccess ? 'Public' : 'Private'} only
                  <X 
                    className="h-3 w-3 cursor-pointer hover:text-destructive" 
                    onClick={() => clearFilter('publicAccess')}
                  />
                </Badge>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};