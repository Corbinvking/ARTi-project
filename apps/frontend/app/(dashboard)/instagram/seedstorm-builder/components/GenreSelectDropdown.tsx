import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Plus } from "lucide-react";
import { saveTagToCollection } from "../lib/tagStorage";
import { useTagSync } from "../hooks/useTagSync";

interface GenreSelectDropdownProps {
  value: string;
  onValueChange: (value: string) => void;
  error?: boolean;
  placeholder?: string;
}

export const GenreSelectDropdown = ({
  value,
  onValueChange,
  error,
  placeholder = "Select primary genre"
}: GenreSelectDropdownProps) => {
  const { tags } = useTagSync();
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newGenreValue, setNewGenreValue] = useState("");
  
  const availableGenres = tags.genres.sort();

  const handleSelectGenre = (selectedValue: string) => {
    if (selectedValue === "add_new") {
      setIsAddingNew(true);
      return;
    }
    onValueChange(selectedValue);
  };

  const handleAddNew = () => {
    const trimmedValue = newGenreValue.trim();
    if (trimmedValue && !availableGenres.includes(trimmedValue)) {
      saveTagToCollection(trimmedValue, 'genres');
      onValueChange(trimmedValue);
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

  if (isAddingNew) {
    return (
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
    );
  }

  return (
    <Select value={value} onValueChange={handleSelectGenre}>
      <SelectTrigger className={error ? "border-destructive" : ""}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
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
  );
};