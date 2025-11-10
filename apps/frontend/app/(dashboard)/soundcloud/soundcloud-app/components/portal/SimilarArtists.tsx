"use client"

import React, { useState, useEffect } from 'react';
import { Users, Music, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '../../integrations/supabase/client';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../hooks/use-toast';

interface SimilarArtist {
  id: string;
  name: string;
  primary_email: string;
  soundcloud_url?: string;
  spotify_url?: string;
  families: string[];
  size_tier: string;
  commonGenres: string[];
  similarity_score: number;
}

interface GenreFamily {
  id: string;
  name: string;
}

export const SimilarArtists: React.FC = () => {
  const [similarArtists, setSimilarArtists] = useState<SimilarArtist[]>([]);
  const [genreFamilies, setGenreFamilies] = useState<GenreFamily[]>([]);
  const [loading, setLoading] = useState(true);
  const { member } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (member) {
      fetchSimilarArtists();
    }
  }, [member]);

  const fetchSimilarArtists = async () => {
    if (!member || !member.families?.length) {
      setLoading(false);
      return;
    }

    try {
      // First, fetch genre families for display names
      const { data: genres, error: genreError } = await supabase
        .from('genre_families')
        .select('id, name')
        .eq('active', true);

      if (genreError) throw genreError;
      setGenreFamilies(genres || []);

      // Fetch other members with similar genres
      const { data: members, error } = await supabase
        .from('members')
        .select('id, name, primary_email, soundcloud_url, families, size_tier')
        .eq('status', 'active')
        .neq('id', member.id);

      if (error) throw error;

      // Calculate similarity based on genre overlap
      const similar = members
        ?.map(artist => {
          const artistGenres = artist.families || [];
          const commonGenres = artistGenres.filter(genre => member.families?.includes(genre));
          const similarity_score = commonGenres.length / Math.max(member.families.length, artistGenres.length);
          
          return {
            ...artist,
            commonGenres,
            similarity_score
          };
        })
        .filter(artist => artist.commonGenres.length > 0)
        .sort((a, b) => b.similarity_score - a.similarity_score)
        .slice(0, 12) || [];

      setSimilarArtists(similar);
    } catch (error) {
      console.error('Error fetching similar artists:', error);
      toast({
        title: "Error",
        description: "Failed to load similar artists",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getGenreName = (genreId: string) => {
    return genreFamilies.find(g => g.id === genreId)?.name || genreId;
  };

  const getSimilarityLabel = (score: number) => {
    if (score >= 0.7) return { label: 'Very Similar', color: 'bg-green-500' };
    if (score >= 0.4) return { label: 'Similar', color: 'bg-blue-500' };
    return { label: 'Somewhat Similar', color: 'bg-yellow-500' };
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Similar Artists
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!member?.families?.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Similar Artists
          </CardTitle>
          <CardDescription>
            Set your genre preferences in your profile to discover similar artists
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={() => window.location.href = '/portal/profile'}>
            Update Genre Preferences
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Similar Artists
        </CardTitle>
        <CardDescription>
          Discover artists in the groups with similar genre preferences
        </CardDescription>
      </CardHeader>
      <CardContent>
        {similarArtists.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Music className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No similar artists found in the groups yet.</p>
            <p className="text-sm">Check back as more members join!</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {similarArtists.map((artist) => {
              const similarity = getSimilarityLabel(artist.similarity_score);
              return (
                <div key={artist.id} className="border border-border rounded-lg p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm truncate">{artist.name}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {artist.size_tier}
                        </Badge>
                        <div className={`text-xs px-2 py-1 rounded-full text-white ${similarity.color}`}>
                          {similarity.label}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Common Genres:</p>
                      <div className="flex flex-wrap gap-1">
                        {artist.commonGenres.slice(0, 3).map((genreId) => (
                          <Badge key={genreId} variant="secondary" className="text-xs">
                            {getGenreName(genreId)}
                          </Badge>
                        ))}
                        {artist.commonGenres.length > 3 && (
                          <Badge variant="secondary" className="text-xs">
                            +{artist.commonGenres.length - 3}
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      {artist.soundcloud_url && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 text-xs"
                          onClick={() => window.open(artist.soundcloud_url, '_blank')}
                        >
                          <ExternalLink className="w-3 h-3 mr-1" />
                          SoundCloud
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};