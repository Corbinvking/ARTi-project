'use client'

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Search, User, Target, Hash, MapPin, Music } from "lucide-react";
import { Creator, Campaign } from "../lib/types";
import { getCreators, getCampaigns } from "../lib/localStorage";

interface GlobalSearchProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SearchResult {
  type: 'creator' | 'campaign' | 'genre' | 'country';
  id: string;
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  data?: any;
}

export const GlobalSearch = ({ isOpen, onClose }: GlobalSearchProps) => {
  const [query, setQuery] = useState('');
  const [creators, setCreators] = useState<Creator[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const router = useRouter();

  useEffect(() => {
    if (isOpen) {
      const loadData = async () => {
        const [creatorsData, campaignsData] = await Promise.all([
          getCreators(),
          getCampaigns()
        ]);
        setCreators(creatorsData);
        setCampaigns(campaignsData);
      };
      loadData();
      setQuery('');
    }
  }, [isOpen]);

  const searchResults = useMemo(() => {
    if (!query.trim()) return [];
    
    const lowerQuery = query.toLowerCase();
    const results: SearchResult[] = [];

    // Search creators
    creators.forEach(creator => {
      if (
        creator.instagram_handle.toLowerCase().includes(lowerQuery) ||
        creator.base_country.toLowerCase().includes(lowerQuery) ||
        creator.email?.toLowerCase().includes(lowerQuery) ||
        creator.music_genres.some(genre => genre.toLowerCase().includes(lowerQuery)) ||
        creator.content_types.some(type => type.toLowerCase().includes(lowerQuery))
      ) {
        results.push({
          type: 'creator',
          id: creator.id,
          title: `@${creator.instagram_handle}`,
          subtitle: `${creator.followers.toLocaleString()} followers • ${creator.base_country}`,
          icon: <User className="h-4 w-4 text-primary" />,
          data: creator
        });
      }
    });

    // Search campaigns
    campaigns.forEach(campaign => {
      if (
        campaign.campaign_name.toLowerCase().includes(lowerQuery) ||
        campaign.form_data?.selected_genres?.some(genre => genre.toLowerCase().includes(lowerQuery)) ||
        campaign.status.toLowerCase().includes(lowerQuery)
      ) {
        results.push({
          type: 'campaign',
          id: campaign.id,
          title: campaign.campaign_name,
          subtitle: `${campaign.status} • ${campaign.form_data?.selected_genres?.join(', ') || 'No genres'}`,
          icon: <Target className="h-4 w-4 text-accent" />,
          data: campaign
        });
      }
    });

    // Search genres
    const allGenres = [...new Set(creators.flatMap(c => c.music_genres))];
    allGenres.forEach(genre => {
      if (genre.toLowerCase().includes(lowerQuery)) {
        const genreCreators = creators.filter(c => c.music_genres.includes(genre));
        results.push({
          type: 'genre',
          id: genre,
          title: genre,
          subtitle: `${genreCreators.length} creators`,
          icon: <Music className="h-4 w-4 text-success" />,
          data: { genre, creators: genreCreators }
        });
      }
    });

    // Search countries
    const allCountries = [...new Set(creators.map(c => c.base_country))];
    allCountries.forEach(country => {
      if (country.toLowerCase().includes(lowerQuery)) {
        const countryCreators = creators.filter(c => c.base_country === country);
        results.push({
          type: 'country',
          id: country,
          title: country,
          subtitle: `${countryCreators.length} creators`,
          icon: <MapPin className="h-4 w-4 text-warning" />,
          data: { country, creators: countryCreators }
        });
      }
    });

    return results.slice(0, 15); // Limit results
  }, [query, creators, campaigns]);

  const handleResultClick = (result: SearchResult) => {
    onClose();
    
    switch (result.type) {
      case 'creator':
        // Navigate to creator database with specific creator highlighted
        router.push(`/instagram/creators?filter=specific&q=${encodeURIComponent(result.data.instagram_handle)}`);
        break;
      case 'campaign':
        // Navigate to campaign history with specific campaign highlighted
        router.push(`/instagram/campaigns?filter=specific&campaignId=${result.data.id}`);
        break;
      case 'genre':
        router.push(`/instagram/creators?filter=genre&genre=${encodeURIComponent(result.data.genre)}`);
        break;
      case 'country':
        router.push(`/instagram/creators?filter=country&country=${encodeURIComponent(result.data.country)}`);
        break;
    }
  };

  const groupedResults = useMemo(() => {
    const groups: Record<string, SearchResult[]> = {
      creators: [],
      campaigns: [],
      genres: [],
      countries: []
    };

    searchResults.forEach(result => {
      switch (result.type) {
        case 'creator':
          groups.creators.push(result);
          break;
        case 'campaign':
          groups.campaigns.push(result);
          break;
        case 'genre':
          groups.genres.push(result);
          break;
        case 'country':
          groups.countries.push(result);
          break;
      }
    });

    return groups;
  }, [searchResults]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl p-0">
        <div className="flex items-center gap-3 p-4 border-b border-border">
          <Search className="h-5 w-5 text-muted-foreground" />
          <Input
            placeholder="Search creators, campaigns, genres, countries..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="border-0 focus-visible:ring-0 text-base"
            autoFocus
          />
          <Badge variant="outline" className="text-xs">
            Ctrl+K
          </Badge>
        </div>

        <div className="max-h-96 overflow-y-auto">
          {query && searchResults.length === 0 && (
            <div className="p-8 text-center text-muted-foreground">
              No results found for "{query}"
            </div>
          )}

          {!query && (
            <div className="p-8 text-center text-muted-foreground">
              <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Start typing to search across creators, campaigns, and more...</p>
            </div>
          )}

          {query && searchResults.length > 0 && (
            <div className="p-2">
              {Object.entries(groupedResults).map(([groupName, results]) => {
                if (results.length === 0) return null;
                
                return (
                  <div key={groupName}>
                    <div className="px-2 py-1 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      {groupName}
                    </div>
                    {results.map((result) => (
                      <div
                        key={`${result.type}-${result.id}`}
                        className="flex items-center gap-3 p-3 hover:bg-muted/50 rounded-md cursor-pointer"
                        onClick={() => handleResultClick(result)}
                      >
                        {result.icon}
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-foreground truncate">
                            {result.title}
                          </div>
                          {result.subtitle && (
                            <div className="text-sm text-muted-foreground truncate">
                              {result.subtitle}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    <Separator className="my-2" />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};