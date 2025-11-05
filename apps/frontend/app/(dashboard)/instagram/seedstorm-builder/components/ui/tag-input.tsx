import React, { useState, useRef, useEffect } from 'react';
import { Input } from './input';
import { Button } from './button';
import { Badge } from './badge';
import { Label } from './label';
import { Plus, X, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "./popover";
import { TagDeleteConfirmDialog } from '../TagDeleteConfirmDialog';
import { saveMultipleTagsToCollection } from '../lib/tagStorage';

interface TagInputProps {
  label: string;
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
  placeholder: string;
  existingTags: string[];
  onDeleteTag?: (tag: string) => void;
  className?: string;
  error?: string;
  tagType?: 'genres' | 'contentTypes' | 'territoryPreferences';
  onRefreshTags?: () => void;
}

export function TagInput({ 
  label, 
  selectedTags, 
  onTagsChange, 
  placeholder, 
  existingTags,
  onDeleteTag,
  className,
  error,
  tagType,
  onRefreshTags
}: TagInputProps) {
  const [newTagInput, setNewTagInput] = useState('');
  const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showAllTags, setShowAllTags] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [tagToDelete, setTagToDelete] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Filter suggestions based on input
  useEffect(() => {
    if (newTagInput.trim()) {
      const filtered = existingTags.filter(tag => 
        tag.toLowerCase().includes(newTagInput.toLowerCase()) &&
        !selectedTags.includes(tag)
      );
      setFilteredSuggestions(filtered);
      setShowSuggestions(filtered.length > 0);
    } else {
      setFilteredSuggestions([]);
      setShowSuggestions(false);
    }
  }, [newTagInput, existingTags, selectedTags]);

  const addTag = (tag: string) => {
    const trimmedTag = tag.trim();
    if (trimmedTag && !selectedTags.includes(trimmedTag)) {
      onTagsChange([...selectedTags, trimmedTag]);
      
      // Always auto-save new tags to storage immediately
      if (tagType && !existingTags.includes(trimmedTag)) {
        saveMultipleTagsToCollection([trimmedTag], tagType);
        onRefreshTags?.();
      }
      
      setNewTagInput('');
      setShowSuggestions(false);
    }
  };

  const removeTag = (tagToRemove: string) => {
    onTagsChange(selectedTags.filter(tag => tag !== tagToRemove));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredSuggestions.length > 0) {
        addTag(filteredSuggestions[0]);
      } else {
        addTag(newTagInput);
      }
    }
  };

  const availableTags = existingTags.filter(tag => !selectedTags.includes(tag));

  return (
    <div className={cn("space-y-3", className)}>
      <Label>{label}</Label>
      {error && <p className="text-sm text-destructive">{error}</p>}
      
      {selectedTags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedTags.map((tag) => (
            <Badge key={tag} variant="secondary" className="flex items-center gap-1">
              {tag}
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => removeTag(tag)} 
              />
            </Badge>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Input
            ref={inputRef}
            placeholder={placeholder}
            value={newTagInput}
            onChange={(e) => setNewTagInput(e.target.value)}
            onKeyPress={handleKeyPress}
            className={error ? 'border-destructive' : ''}
          />
          
          {showSuggestions && (
            <div className="absolute z-50 top-full mt-1 w-full bg-background border border-border rounded-md shadow-lg max-h-32 overflow-y-auto">
              {filteredSuggestions.map((suggestion) => (
                <div
                  key={suggestion}
                  className="px-3 py-2 cursor-pointer hover:bg-accent hover:text-accent-foreground text-sm"
                  onClick={() => addTag(suggestion)}
                >
                  {suggestion}
                </div>
              ))}
            </div>
          )}
        </div>
        
        <Button 
          type="button" 
          variant="outline" 
          onClick={() => addTag(newTagInput)}
          disabled={!newTagInput.trim()}
        >
          Add
        </Button>

        {existingTags.length > 0 && (
          <Popover open={showAllTags} onOpenChange={setShowAllTags}>
            <PopoverTrigger asChild>
              <Button type="button" variant="outline" size="icon">
                <Plus className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0">
              <div className="p-4">
                <h4 className="font-medium mb-3">Available {label}</h4>
                <div className="max-h-48 overflow-y-auto space-y-1">
                  {availableTags.map((tag) => (
                    <div
                      key={tag}
                      className="flex items-center justify-between p-2 hover:bg-accent rounded-sm group"
                    >
                      <span 
                        className="text-sm cursor-pointer flex-1"
                        onClick={() => {
                          addTag(tag);
                          setShowAllTags(false);
                        }}
                      >
                        {tag}
                      </span>
                      <div className="flex items-center gap-1">
                        <Plus 
                          className="h-3 w-3 cursor-pointer"
                          onClick={() => {
                            addTag(tag);
                            setShowAllTags(false);
                          }}
                        />
                        {onDeleteTag && (
                          <Trash2 
                            className="h-3 w-3 cursor-pointer text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => {
                              e.stopPropagation();
                              setTagToDelete(tag);
                              setDeleteConfirmOpen(true);
                            }}
                          />
                        )}
                      </div>
                    </div>
                  ))}
                  {availableTags.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No additional tags available
                    </p>
                  )}
                </div>
              </div>
            </PopoverContent>
          </Popover>
        )}
      </div>
      
      <TagDeleteConfirmDialog
        isOpen={deleteConfirmOpen}
        onClose={() => {
          setDeleteConfirmOpen(false);
          setTagToDelete(null);
        }}
        onConfirm={() => {
          if (tagToDelete && onDeleteTag) {
            onDeleteTag(tagToDelete);
            onRefreshTags?.();
          }
          setTagToDelete(null);
        }}
        tagName={tagToDelete || ''}
        tagType={label}
      />
    </div>
  );
}