import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X, Plus, Trash2 } from "lucide-react";
import { saveTagToCollection, TagCollections } from "../lib/tagStorage";
import { useTagSync } from "../hooks/useTagSync";
import { useNiches } from "../hooks/useNiches";

interface TagSelectDropdownProps {
  label: string;
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
  tagType: keyof TagCollections;
  placeholder?: string;
  error?: string;
  maxTags?: number;
}

export const TagSelectDropdown = ({
  label,
  selectedTags,
  onTagsChange,
  tagType,
  placeholder = "Select...",
  error,
  maxTags
}: TagSelectDropdownProps) => {
  const { tags } = useTagSync();
  const { niches, addNiche, removeNiche } = useNiches();
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newTagValue, setNewTagValue] = useState("");

  const isNicheType = tagType === 'genres';
  const sourceList = isNicheType ? niches : tags[tagType];
  const availableTags = sourceList.sort();
  const unselectedTags = availableTags.filter(tag => !selectedTags.includes(tag));

  const handleSelectTag = (value: string) => {
    if (value === "add_new") {
      setIsAddingNew(true);
      return;
    }
    
    if (!selectedTags.includes(value) && (!maxTags || selectedTags.length < maxTags)) {
      onTagsChange([...selectedTags, value]);
    }
  };

  const handleAddNew = async () => {
    const trimmedValue = newTagValue.trim();
    if (trimmedValue && !availableTags.includes(trimmedValue) && !selectedTags.includes(trimmedValue)) {
      if (isNicheType) {
        try {
          await addNiche(trimmedValue);
        } catch {
          // silently ignore
        }
      } else {
        saveTagToCollection(trimmedValue, tagType);
      }
      onTagsChange([...selectedTags, trimmedValue]);
    }
    setNewTagValue("");
    setIsAddingNew(false);
  };

  const handleRemoveTag = (tagToRemove: string) => {
    onTagsChange(selectedTags.filter(tag => tag !== tagToRemove));
  };

  const handleDeleteFromList = async (tagToDelete: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (isNicheType) {
      try {
        await removeNiche(tagToDelete);
        onTagsChange(selectedTags.filter(t => t !== tagToDelete));
      } catch {
        // silently ignore
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddNew();
    } else if (e.key === "Escape") {
      setNewTagValue("");
      setIsAddingNew(false);
    }
  };

  return (
    <div className="space-y-2">
      <Label className={error ? "text-destructive" : ""}>{label}</Label>
      
      {isAddingNew ? (
        <div className="flex gap-2">
          <Input
            value={newTagValue}
            onChange={(e) => setNewTagValue(e.target.value)}
            placeholder={`Enter new ${label.toLowerCase()}...`}
            onKeyDown={handleKeyDown}
            autoFocus
          />
          <Button onClick={handleAddNew} size="sm" disabled={!newTagValue.trim()}>
            <Plus className="h-4 w-4" />
          </Button>
          <Button 
            onClick={() => {
              setNewTagValue("");
              setIsAddingNew(false);
            }} 
            variant="outline" 
            size="sm"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <Select value="" onValueChange={handleSelectTag} disabled={maxTags && selectedTags.length >= maxTags}>
          <SelectTrigger className={error ? "border-destructive" : ""}>
            <SelectValue placeholder={
              maxTags && selectedTags.length >= maxTags 
                ? `Maximum ${maxTags} selected` 
                : placeholder
            } />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="add_new" className="text-primary">
              <div className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Add New {label.endsWith('s') ? label.slice(0, -1) : label}
              </div>
            </SelectItem>
            {unselectedTags.map(tag => (
              <div key={tag} className="flex items-center justify-between group">
                <SelectItem value={tag} className="flex-1">{tag}</SelectItem>
                {isNicheType && (
                  <button
                    className="opacity-0 group-hover:opacity-100 p-1 mr-2 text-muted-foreground hover:text-destructive transition-opacity"
                    onClick={(e) => handleDeleteFromList(tag, e)}
                    title={`Remove "${tag}" from list`}
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                )}
              </div>
            ))}
          </SelectContent>
        </Select>
      )}

      {selectedTags.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {selectedTags.map(tag => (
            <Badge key={tag} variant="secondary" className="flex items-center gap-1">
              {tag}
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => handleRemoveTag(tag)} 
              />
            </Badge>
          ))}
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
};
