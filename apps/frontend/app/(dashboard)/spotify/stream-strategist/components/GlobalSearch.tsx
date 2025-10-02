"use client"

import { useState, useRef, useEffect } from "react";
import { Search, Command, File, Users, Music, Briefcase } from "lucide-react";
import { Input } from "./ui/input";
import { Command as CommandPrimitive, CommandEmpty, CommandGroup, CommandItem, CommandList } from "./ui/command";
import { useGlobalSearch, SearchResult } from "../hooks/useGlobalSearch";
import { useRouter } from "next/navigation";
import { cn } from "../lib/utils";

interface GlobalSearchProps {
  onSelect?: () => void;
}

const getIcon = (type: SearchResult['type']) => {
  switch (type) {
    case 'campaign':
      return <Briefcase className="h-4 w-4" />;
    case 'vendor':
      return <Users className="h-4 w-4" />;
    case 'client':
      return <Users className="h-4 w-4" />;
    case 'playlist':
      return <Music className="h-4 w-4" />;
    default:
      return <File className="h-4 w-4" />;
  }
};

const getTypeLabel = (type: SearchResult['type']) => {
  switch (type) {
    case 'campaign':
      return 'Campaign';
    case 'vendor':
      return 'Vendor';
    case 'client':
      return 'Client';
    case 'playlist':
      return 'Playlist';
    default:
      return '';
  }
};

export function GlobalSearch({ onSelect }: GlobalSearchProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const { data: results = [], isLoading } = useGlobalSearch(searchTerm);

  useEffect(() => {
    setSelectedIndex(0);
  }, [results]);

  const handleSelect = (result: SearchResult) => {
    router.push(`/spotify${result.href}`);
    setIsOpen(false);
    setSearchTerm("");
    onSelect?.();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen && e.key === 'Enter') {
      setIsOpen(true);
      return;
    }

    if (isOpen) {
      switch (e.key) {
        case 'Escape':
          setIsOpen(false);
          setSearchTerm("");
          break;
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => Math.min(prev + 1, results.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => Math.max(prev - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (results[selectedIndex]) {
            handleSelect(results[selectedIndex]);
          }
          break;
      }
    }
  };

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          id="global-search"
          placeholder="Search campaigns, vendors, clients..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setIsOpen(e.target.value.length > 0);
          }}
          onFocus={() => setIsOpen(searchTerm.length > 0)}
          onBlur={() => setTimeout(() => setIsOpen(false), 200)}
          onKeyDown={handleKeyDown}
          className="w-64 pl-10 pr-16 bg-input border-border"
        />
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
          <kbd className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
            ⌘K
          </kbd>
        </div>
      </div>

      {isOpen && (searchTerm.length >= 2 || results.length > 0) && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-md shadow-lg z-50">
          <CommandPrimitive className="rounded-md">
            <CommandList className="max-h-60">
              {isLoading ? (
                <div className="p-4 text-sm text-muted-foreground text-center">
                  Searching...
                </div>
              ) : results.length === 0 && searchTerm.length >= 2 ? (
                <CommandEmpty className="p-4 text-sm text-muted-foreground text-center">
                  No results found
                </CommandEmpty>
              ) : (
                <CommandGroup>
                  {results.map((result, index) => (
                    <CommandItem
                      key={`${result.type}-${result.id}`}
                      onSelect={() => handleSelect(result)}
                      className={cn(
                        "flex items-center gap-3 px-4 py-2 cursor-pointer",
                        index === selectedIndex && "bg-accent"
                      )}
                    >
                      {getIcon(result.type)}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm">{result.title}</div>
                        {result.subtitle && (
                          <div className="text-xs text-muted-foreground truncate">
                            {result.subtitle}
                          </div>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                        {getTypeLabel(result.type)}
                      </span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </CommandPrimitive>
        </div>
      )}
    </div>
  );
}








