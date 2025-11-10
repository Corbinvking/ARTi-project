"use client"

import React, { useState, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandInput } from '@/components/ui/command';
import { Check, Filter, X, Plus, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface GenreFamily {
  id: string;
  name: string;
  color?: string;
}

interface Subgenre {
  id: string;
  name: string;
  family_id: string;
}

interface GenreTagFilterProps {
  genreFamilies: GenreFamily[];
  subgenres: Subgenre[];
  selectedGenres: string[];
  onGenreChange: (genres: string[]) => void;
  placeholder?: string;
  maxDisplayTags?: number;
  availableGroups?: string[];
}

export const GenreTagFilter: React.FC<GenreTagFilterProps> = ({
  genreFamilies,
  subgenres,
  selectedGenres,
  onGenreChange,
  placeholder = "Filter by genres...",
  maxDisplayTags = 5,
  availableGroups = []
}) => {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');

  // Use groups as the primary genre source for filtering
  const allGenres = useMemo(() => {
    return availableGroups.map(group => ({
      id: group,
      name: group,
      type: 'group' as const,
      familyId: 'groups'
    }));
  }, [availableGroups]);

  const filteredGenres = useMemo(() => {
    if (!searchValue) return allGenres;
    
    return allGenres.filter(genre =>
      genre.name.toLowerCase().includes(searchValue.toLowerCase())
    );
  }, [allGenres, searchValue]);

  const groupedGenres = useMemo(() => {
    // Simple grouping by "Groups" since we're only using groups now
    return {
      'groups': filteredGenres
    };
  }, [filteredGenres]);

  const getGenreName = (genreId: string) => {
    const genre = allGenres.find(g => g.id === genreId);
    return genre?.name || genreId;
  };

  const getGenreFamily = (genreId: string) => {
    // Since we're only using groups now, return a simple groups object
    return { id: 'groups', name: 'Groups' };
  };

  const handleGenreSelect = (genreId: string) => {
    const newSelected = selectedGenres.includes(genreId)
      ? selectedGenres.filter(id => id !== genreId)
      : [...selectedGenres, genreId];
    
    onGenreChange(newSelected);
  };

  const handleRemoveGenre = (genreId: string) => {
    onGenreChange(selectedGenres.filter(id => id !== genreId));
  };

  const clearAll = () => {
    onGenreChange([]);
  };

  const displayedTags = selectedGenres.slice(0, maxDisplayTags);
  const hiddenCount = selectedGenres.length - maxDisplayTags;

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">Genre Filter</label>
      
      <div className="flex flex-wrap gap-2">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 border-dashed">
              <Plus className="h-4 w-4 mr-1" />
              Add Genre
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-0" align="start">
            <Command>
              <CommandInput 
                placeholder="Search genres..." 
                value={searchValue}
                onValueChange={setSearchValue}
              />
              <CommandEmpty>No genres found.</CommandEmpty>
              <ScrollArea className="h-64">
                <CommandGroup heading="Groups">
                  {filteredGenres.map(genre => (
                    <CommandItem
                      key={genre.id}
                      onSelect={() => handleGenreSelect(genre.id)}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {genre.name}
                        </span>
                      </div>
                      {selectedGenres.includes(genre.id) && (
                        <Check className="h-4 w-4" />
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </ScrollArea>
            </Command>
          </PopoverContent>
        </Popover>

        <AnimatePresence>
          {displayedTags.map(genreId => {
            const family = getGenreFamily(genreId);
            return (
              <motion.div
                key={genreId}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.15 }}
              >
                <Badge 
                  variant="secondary" 
                  className="flex items-center gap-1 px-2 py-1"
                >
                  <span className="text-xs">{getGenreName(genreId)}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto p-0 hover:bg-transparent"
                    onClick={() => handleRemoveGenre(genreId)}
                  >
                    <X className="h-3 w-3 hover:text-destructive" />
                  </Button>
                </Badge>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {hiddenCount > 0 && (
          <Badge variant="outline" className="text-xs">
            +{hiddenCount} more
          </Badge>
        )}

        {selectedGenres.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAll}
            className="h-8 text-xs text-muted-foreground hover:text-destructive"
          >
            Clear All
          </Button>
        )}
      </div>

      {selectedGenres.length > 0 && (
        <div className="text-xs text-muted-foreground">
          {selectedGenres.length} genre{selectedGenres.length === 1 ? '' : 's'} selected
        </div>
      )}
    </div>
  );
};