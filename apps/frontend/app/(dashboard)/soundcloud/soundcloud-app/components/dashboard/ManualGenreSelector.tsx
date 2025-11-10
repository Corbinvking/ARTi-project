"use client"

import React, { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Music, X, Plus } from 'lucide-react';
import { supabase } from '../../integrations/supabase/client';
import { useToast } from '../../hooks/use-toast';

interface GenreFamily {
  id: string;
  name: string;
}

interface Subgenre {
  id: string;
  name: string;
  family_id: string;
}

interface ManualGenreSelectorProps {
  selectedFamilyId?: string;
  selectedGenres: string[];
  genreNotes?: string;
  onFamilyChange: (familyId: string | undefined) => void;
  onGenresChange: (genres: string[]) => void;
  onNotesChange: (notes: string) => void;
  className?: string;
}

export const ManualGenreSelector: React.FC<ManualGenreSelectorProps> = ({
  selectedFamilyId,
  selectedGenres,
  genreNotes,
  onFamilyChange,
  onGenresChange,
  onNotesChange,
  className
}) => {
  const { toast } = useToast();
  const [genreFamilies, setGenreFamilies] = useState<GenreFamily[]>([]);
  const [subgenres, setSubgenres] = useState<Subgenre[]>([]);
  const [availableSubgenres, setAvailableSubgenres] = useState<Subgenre[]>([]);
  const [selectedSubgenre, setSelectedSubgenre] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGenreData();
  }, []);

  useEffect(() => {
    if (selectedFamilyId) {
      setAvailableSubgenres(subgenres.filter(s => s.family_id === selectedFamilyId));
    } else {
      setAvailableSubgenres([]);
    }
  }, [selectedFamilyId, subgenres]);

  const fetchGenreData = async () => {
    try {
      const [familiesResult, subgenresResult] = await Promise.all([
        supabase.from('genre_families').select('*').order('name'),
        supabase.from('subgenres').select('*').order('name')
      ]);

      if (familiesResult.error) throw familiesResult.error;
      if (subgenresResult.error) throw subgenresResult.error;

      setGenreFamilies(familiesResult.data || []);
      setSubgenres(subgenresResult.data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load genre data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFamilySelect = (familyId: string) => {
    onFamilyChange(familyId === 'none' ? undefined : familyId);
    // Clear existing subgenres when family changes
    onGenresChange([]);
  };

  const addSubgenre = () => {
    if (!selectedSubgenre || selectedGenres.includes(selectedSubgenre)) {
      return;
    }

    onGenresChange([...selectedGenres, selectedSubgenre]);
    setSelectedSubgenre('');
  };

  const removeGenre = (genreId: string) => {
    onGenresChange(selectedGenres.filter(id => id !== genreId));
  };

  const getGenreName = (genreId: string) => {
    const subgenre = subgenres.find(s => s.id === genreId);
    return subgenre?.name || genreId;
  };

  const getFamilyName = (familyId: string) => {
    const family = genreFamilies.find(f => f.id === familyId);
    return family?.name || 'Unknown Family';
  };

  if (loading) {
    return (
      <div className={className}>
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-muted rounded w-1/4"></div>
          <div className="h-10 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="space-y-4">
        <div>
          <Label className="text-sm font-medium flex items-center gap-2">
            <Music className="w-4 h-4" />
            Genre Classification
          </Label>
          <p className="text-xs text-muted-foreground mb-3">
            Manually assign genre family and subgenres for this member
          </p>
        </div>

        {/* Genre Family Selection */}
        <div>
          <Label htmlFor="genre_family" className="text-sm font-medium">Primary Genre Family</Label>
          <Select 
            value={selectedFamilyId || 'none'} 
            onValueChange={handleFamilySelect}
          >
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Select a genre family..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No family selected</SelectItem>
              {genreFamilies.map(family => (
                <SelectItem key={family.id} value={family.id}>
                  {family.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Subgenre Selection */}
        {selectedFamilyId && (
          <>
            <Separator />
            <div>
              <Label className="text-sm font-medium">Subgenres</Label>
              <p className="text-xs text-muted-foreground mb-2">
                Add specific subgenres within {getFamilyName(selectedFamilyId)}
              </p>
              
              <div className="flex gap-2 mb-3">
                <Select 
                  value={selectedSubgenre} 
                  onValueChange={setSelectedSubgenre}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select subgenre to add..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableSubgenres
                      .filter(sub => !selectedGenres.includes(sub.id))
                      .map(subgenre => (
                        <SelectItem key={subgenre.id} value={subgenre.id}>
                          {subgenre.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <Button 
                  type="button"
                  size="sm" 
                  onClick={addSubgenre}
                  disabled={!selectedSubgenre || selectedGenres.includes(selectedSubgenre)}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>

              {/* Selected Subgenres */}
              {selectedGenres.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {selectedGenres.map(genreId => (
                    <Badge 
                      key={genreId} 
                      variant="secondary" 
                      className="flex items-center gap-1"
                    >
                      {getGenreName(genreId)}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-auto p-0 hover:bg-transparent"
                        onClick={() => removeGenre(genreId)}
                      >
                        <X className="w-3 h-3 hover:text-destructive" />
                      </Button>
                    </Badge>
                  ))}
                </div>
              )}

              {availableSubgenres.length === 0 && (
                <p className="text-sm text-muted-foreground italic">
                  No subgenres available for this family
                </p>
              )}
            </div>
          </>
        )}

        {/* Genre Notes */}
        <Separator />
        <div>
          <Label htmlFor="genre_notes" className="text-sm font-medium">Genre Notes</Label>
          <Textarea
            id="genre_notes"
            value={genreNotes || ''}
            onChange={(e) => onNotesChange(e.target.value)}
            placeholder="Add notes about this member's musical style, influences, or genre characteristics..."
            className="mt-1 min-h-[80px]"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Optional notes to help with genre classification and member matching
          </p>
        </div>
      </div>
    </div>
  );
};