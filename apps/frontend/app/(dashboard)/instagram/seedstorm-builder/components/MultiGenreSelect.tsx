import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { X, Plus, Trash2 } from "lucide-react";
import { useNiches } from "../hooks/useNiches";

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
  placeholder = "Select niches"
}: MultiGenreSelectProps) => {
  const { niches, addNiche, removeNiche } = useNiches();
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newNicheValue, setNewNicheValue] = useState("");
  
  const availableNiches = niches.filter(n => !selectedGenres.includes(n));

  const handleSelectNiche = (selectedValue: string) => {
    if (selectedValue === "add_new") {
      setIsAddingNew(true);
      return;
    }
    if (!selectedGenres.includes(selectedValue)) {
      onGenresChange([...selectedGenres, selectedValue]);
    }
  };

  const handleRemoveFromSelection = (nicheToRemove: string) => {
    onGenresChange(selectedGenres.filter(n => n !== nicheToRemove));
  };

  const handleDeleteNiche = async (nicheToDelete: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await removeNiche(nicheToDelete);
      onGenresChange(selectedGenres.filter(n => n !== nicheToDelete));
    } catch {
      // silently ignore
    }
  };

  const handleAddNew = async () => {
    const trimmedValue = newNicheValue.trim();
    if (trimmedValue && !niches.includes(trimmedValue) && !selectedGenres.includes(trimmedValue)) {
      try {
        await addNiche(trimmedValue);
        onGenresChange([...selectedGenres, trimmedValue]);
      } catch {
        // silently ignore
      }
    }
    setNewNicheValue("");
    setIsAddingNew(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddNew();
    } else if (e.key === "Escape") {
      setNewNicheValue("");
      setIsAddingNew(false);
    }
  };

  return (
    <div className="space-y-3">
      {selectedGenres.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedGenres.map(niche => (
            <Badge key={niche} variant="secondary" className="flex items-center gap-1">
              {niche}
              <X 
                className="h-3 w-3 cursor-pointer hover:text-destructive" 
                onClick={() => handleRemoveFromSelection(niche)}
              />
            </Badge>
          ))}
        </div>
      )}

      {isAddingNew ? (
        <div className="flex gap-2">
          <Input
            value={newNicheValue}
            onChange={(e) => setNewNicheValue(e.target.value)}
            placeholder="Enter new niche..."
            onKeyDown={handleKeyDown}
            autoFocus
            className={error ? "border-destructive" : ""}
          />
          <Button onClick={handleAddNew} size="sm" disabled={!newNicheValue.trim()}>
            <Plus className="h-4 w-4" />
          </Button>
          <Button 
            onClick={() => {
              setNewNicheValue("");
              setIsAddingNew(false);
            }} 
            variant="outline" 
            size="sm"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <Select value="" onValueChange={handleSelectNiche}>
          <SelectTrigger className={error ? "border-destructive" : ""}>
            <SelectValue placeholder={selectedGenres.length > 0 ? "Add another niche..." : placeholder} />
          </SelectTrigger>
          <SelectContent className="bg-background z-50">
            <SelectItem value="add_new" className="text-primary">
              <div className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Add New Niche
              </div>
            </SelectItem>
            {availableNiches.map(niche => (
              <div key={niche} className="flex items-center justify-between group">
                <SelectItem value={niche} className="flex-1">{niche}</SelectItem>
                <button
                  className="opacity-0 group-hover:opacity-100 p-1 mr-2 text-muted-foreground hover:text-destructive transition-opacity"
                  onClick={(e) => handleDeleteNiche(niche, e)}
                  title={`Remove "${niche}" from list`}
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
};
