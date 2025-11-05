import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { X, Plus } from "lucide-react";
import { saveTagToCollection } from "../lib/tagStorage";
import { useTagSync } from "../hooks/useTagSync";

interface MultiGenreSelectProps {
  selectedGenres: string[];
  onGenresChange: (genres: string[]) => void;
  error?: boolean;
  placeholder?: string;
}

export const MultiGenreSelect = ({
  selectedGenres,
  onGenresChange,
  error,
  placeholder = "Select genres"
}: MultiGenreSelectProps) => {
  const { tags } = useTagSync();
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newGenreValue, setNewGenreValue] = useState("");
  
  const availableGenres = tags.genres.sort().filter(genre => !selectedGenres.includes(genre));

  const handleSelectGenre = (selectedValue: string) => {
    if (selectedValue === "add_new") {
      setIsAddingNew(true);
      return;
    }
    if (!selectedGenres.includes(selectedValue)) {
      onGenresChange([...selectedGenres, selectedValue]);
    }
  };

  const handleRemoveGenre = (genreToRemove: string) => {
    onGenresChange(selectedGenres.filter(genre => genre !== genreToRemove));
  };

  const handleAddNew = () => {
    const trimmedValue = newGenreValue.trim();
    if (trimmedValue && !tags.genres.includes(trimmedValue) && !selectedGenres.includes(trimmedValue)) {
      saveTagToCollection(trimmedValue, 'genres');
      onGenresChange([...selectedGenres, trimmedValue]);
      // Refresh the tag sync to update all dropdowns
      window.dispatchEvent(new CustomEvent('tagsUpdated'));
    }
    setNewGenreValue("");
    setIsAddingNew(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddNew();
    } else if (e.key === "Escape") {
      setNewGenreValue("");
      setIsAddingNew(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Selected Genres */}
      {selectedGenres.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedGenres.map(genre => (
            <Badge key={genre} variant="secondary" className="flex items-center gap-1">
              {genre}
              <X 
                className="h-3 w-3 cursor-pointer hover:text-destructive" 
                onClick={() => handleRemoveGenre(genre)}
              />
            </Badge>
          ))}
        </div>
      )}

      {/* Add New Genre Input */}
      {isAddingNew ? (
        <div className="flex gap-2">
          <Input
            value={newGenreValue}
            onChange={(e) => setNewGenreValue(e.target.value)}
            placeholder="Enter new genre..."
            onKeyDown={handleKeyDown}
            autoFocus
            className={error ? "border-destructive" : ""}
          />
          <Button onClick={handleAddNew} size="sm" disabled={!newGenreValue.trim()}>
            <Plus className="h-4 w-4" />
          </Button>
          <Button 
            onClick={() => {
              setNewGenreValue("");
              setIsAddingNew(false);
            }} 
            variant="outline" 
            size="sm"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        /* Genre Selector */
        <Select value="" onValueChange={handleSelectGenre}>
          <SelectTrigger className={error ? "border-destructive" : ""}>
            <SelectValue placeholder={selectedGenres.length > 0 ? "Add another genre..." : placeholder} />
          </SelectTrigger>
          <SelectContent className="bg-background z-50">
            <SelectItem value="add_new" className="text-primary">
              <div className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Add New Genre
              </div>
            </SelectItem>
            {availableGenres.map(genre => (
              <SelectItem key={genre} value={genre}>{genre}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
};