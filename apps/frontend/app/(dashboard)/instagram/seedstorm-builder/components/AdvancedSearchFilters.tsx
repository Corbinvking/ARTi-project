import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { X, Search, Filter } from "lucide-react";
import { useTagSync } from "../hooks/useTagSync";

export interface SearchFilters {
  query: string;
  genre: string;
  country: string;
  audienceTerritory: string;
  contentType: string;
  minFollowers: string;
  maxFollowers: string;
  minEngagement: string;
  maxEngagement: string;
}

interface AdvancedSearchFiltersProps {
  filters: SearchFilters;
  onFiltersChange: (filters: SearchFilters) => void;
  onClearFilters: () => void;
  availableCountries: string[];
}

export const AdvancedSearchFilters = ({ 
  filters, 
  onFiltersChange, 
  onClearFilters,
  availableCountries 
}: AdvancedSearchFiltersProps) => {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const { tags: allTags } = useTagSync();

  const updateFilter = (key: keyof SearchFilters, value: string) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const hasActiveFilters = Object.values(filters).some(value => value !== '');

  return (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Search className="h-5 w-5" />
            Search & Filter Creators
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAdvanced(!showAdvanced)}
            >
              <Filter className="h-4 w-4 mr-2" />
              {showAdvanced ? 'Basic' : 'Advanced'}
            </Button>
            {hasActiveFilters && (
              <Button
                variant="outline"
                size="sm"
                onClick={onClearFilters}
              >
                <X className="h-4 w-4 mr-2" />
                Clear All
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Basic Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search by handle, email, or any field..."
            value={filters.query}
            onChange={(e) => updateFilter('query', e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Quick Filter Buttons */}
        <div className="flex flex-wrap gap-2">
          <Select value={filters.genre || 'all'} onValueChange={(value) => updateFilter('genre', value === 'all' ? '' : value)}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Any Genre" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any Genre</SelectItem>
              {allTags.genres.sort().map(genre => (
                <SelectItem key={genre} value={genre}>{genre}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filters.country || 'all'} onValueChange={(value) => updateFilter('country', value === 'all' ? '' : value)}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Creator Location" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any Country</SelectItem>
              {availableCountries.sort().map(country => (
                <SelectItem key={country} value={country}>{country}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filters.audienceTerritory || 'all'} onValueChange={(value) => updateFilter('audienceTerritory', value === 'all' ? '' : value)}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Audience Territory" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any Territory</SelectItem>
              {availableCountries.sort().map(country => (
                <SelectItem key={country} value={country}>{country}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filters.contentType || 'all'} onValueChange={(value) => updateFilter('contentType', value === 'all' ? '' : value)}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Any Content Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any Content Type</SelectItem>
              {allTags.contentTypes.sort().map(type => (
                <SelectItem key={type} value={type}>{type}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Advanced Filters */}
        {showAdvanced && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t">
            <div className="space-y-2">
              <label className="text-sm font-medium">Min Followers</label>
              <Input
                type="number"
                placeholder="e.g. 10000"
                value={filters.minFollowers}
                onChange={(e) => updateFilter('minFollowers', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Max Followers</label>
              <Input
                type="number"
                placeholder="e.g. 1000000"
                value={filters.maxFollowers}
                onChange={(e) => updateFilter('maxFollowers', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Min Engagement (%)</label>
              <Input
                type="number"
                step="0.1"
                placeholder="e.g. 2.0"
                value={filters.minEngagement}
                onChange={(e) => updateFilter('minEngagement', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Max Engagement (%)</label>
              <Input
                type="number"
                step="0.1"
                placeholder="e.g. 10.0"
                value={filters.maxEngagement}
                onChange={(e) => updateFilter('maxEngagement', e.target.value)}
              />
            </div>
          </div>
        )}

        {/* Active Filters Display */}
        {hasActiveFilters && (
          <div className="flex flex-wrap gap-2 pt-2 border-t">
            {filters.genre && (
              <Badge variant="secondary" className="flex items-center gap-1">
                Genre: {filters.genre}
                <X 
                  className="h-3 w-3 cursor-pointer" 
                  onClick={() => updateFilter('genre', '')} 
                />
              </Badge>
            )}
            {filters.contentType && (
              <Badge variant="secondary" className="flex items-center gap-1">
                Content: {filters.contentType}
                <X 
                  className="h-3 w-3 cursor-pointer" 
                  onClick={() => updateFilter('contentType', '')} 
                />
              </Badge>
            )}
            {filters.audienceTerritory && (
              <Badge variant="secondary" className="flex items-center gap-1">
                Audience: {filters.audienceTerritory}
                <X 
                  className="h-3 w-3 cursor-pointer" 
                  onClick={() => updateFilter('audienceTerritory', '')} 
                />
              </Badge>
            )}
            {(filters.minFollowers || filters.maxFollowers) && (
              <Badge variant="secondary" className="flex items-center gap-1">
                Followers: {filters.minFollowers || '0'} - {filters.maxFollowers || '∞'}
                <X 
                  className="h-3 w-3 cursor-pointer" 
                  onClick={() => {
                    updateFilter('minFollowers', '');
                    updateFilter('maxFollowers', '');
                  }} 
                />
              </Badge>
            )}
            {(filters.minEngagement || filters.maxEngagement) && (
              <Badge variant="secondary" className="flex items-center gap-1">
                Engagement: {filters.minEngagement || '0'}% - {filters.maxEngagement || '∞'}%
                <X 
                  className="h-3 w-3 cursor-pointer" 
                  onClick={() => {
                    updateFilter('minEngagement', '');
                    updateFilter('maxEngagement', '');
                  }} 
                />
              </Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};