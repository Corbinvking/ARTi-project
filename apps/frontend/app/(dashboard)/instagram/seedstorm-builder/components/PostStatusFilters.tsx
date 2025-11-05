import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Download, X, Search } from 'lucide-react';
import { PostStatusFilters as FilterType } from '../hooks/usePostStatusTracking';

interface PostStatusFiltersProps {
  filters: FilterType;
  onFiltersChange: (filters: FilterType) => void;
  onExport: () => void;
  campaignOptions: Array<{ id: string; name: string }>;
}

export const PostStatusFilters: React.FC<PostStatusFiltersProps> = ({
  filters,
  onFiltersChange,
  onExport,
  campaignOptions
}) => {
  const [campaignSearch, setCampaignSearch] = useState('');

  const handleStatusChange = (status: FilterType['status']) => {
    onFiltersChange({ ...filters, status });
  };


  const handleCampaignToggle = (campaignId: string) => {
    const currentCampaigns = filters.campaigns || [];
    const newCampaigns = currentCampaigns.includes(campaignId)
      ? currentCampaigns.filter(id => id !== campaignId)
      : [...currentCampaigns, campaignId];
    
    onFiltersChange({ 
      ...filters, 
      campaigns: newCampaigns.length > 0 ? newCampaigns : undefined 
    });
  };

  const clearAllFilters = () => {
    onFiltersChange({ status: 'not_posted' });
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (filters.status !== 'not_posted') count++;
    if (filters.campaigns && filters.campaigns.length > 0) count++;
    return count;
  };

  const filteredCampaigns = campaignOptions.filter(campaign =>
    campaign.name.toLowerCase().includes(campaignSearch.toLowerCase())
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Filters</CardTitle>
          <div className="flex items-center gap-2">
            {getActiveFilterCount() > 0 && (
              <Badge variant="secondary" className="text-xs">
                {getActiveFilterCount()} active
              </Badge>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={onExport}
              className="flex items-center gap-1"
            >
              <Download className="h-4 w-4" />
              Export
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Status Filter */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Post Status</label>
            <Select value={filters.status} onValueChange={handleStatusChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="z-50 bg-background border shadow-lg">
                <SelectItem value="not_posted">Not Posted</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="posted">Posted</SelectItem>
                <SelectItem value="all">All Status</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Campaign Filter */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Campaigns</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button 
                  variant="outline" 
                  className="w-full justify-start text-left font-normal"
                >
                  {filters.campaigns && filters.campaigns.length > 0
                    ? `${filters.campaigns.length} selected`
                    : "All campaigns"
                  }
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-0 bg-background border shadow-lg z-50" align="start">
                <div className="p-3 border-b">
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search campaigns..."
                      value={campaignSearch}
                      onChange={(e) => setCampaignSearch(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                </div>
                <div className="space-y-1 max-h-60 overflow-y-auto p-1">
                  {filteredCampaigns.length > 0 ? (
                    filteredCampaigns.map((campaign) => (
                      <div
                        key={campaign.id}
                        className="flex items-center space-x-2 cursor-pointer hover:bg-muted p-2 rounded"
                        onClick={() => handleCampaignToggle(campaign.id)}
                      >
                        <input
                          type="checkbox"
                          checked={filters.campaigns?.includes(campaign.id) || false}
                          onChange={() => handleCampaignToggle(campaign.id)}
                          className="h-4 w-4"
                        />
                        <span className="text-sm flex-1">{campaign.name}</span>
                      </div>
                    ))
                  ) : (
                    <div className="p-2 text-sm text-muted-foreground text-center">
                      No campaigns found
                    </div>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Active Filters Display */}
        {getActiveFilterCount() > 0 && (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t">
            <span className="text-sm text-muted-foreground">Active filters:</span>
            
            {filters.status !== 'not_posted' && (
              <Badge variant="secondary" className="gap-1">
                Status: {filters.status}
                <X 
                  className="h-3 w-3 cursor-pointer" 
                  onClick={() => handleStatusChange('not_posted')}
                />
              </Badge>
            )}
            
            {filters.campaigns && filters.campaigns.length > 0 && (
              <Badge variant="secondary" className="gap-1">
                Campaigns: {filters.campaigns.length} selected
                <X 
                  className="h-3 w-3 cursor-pointer" 
                  onClick={() => onFiltersChange({ ...filters, campaigns: undefined })}
                />
              </Badge>
            )}

            <Button
              variant="ghost"
              size="sm"
              onClick={clearAllFilters}
              className="text-xs h-6 px-2"
            >
              Clear all
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};