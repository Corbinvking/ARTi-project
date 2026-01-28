"use client"

import * as React from "react";
import { Badge } from "./badge";
import { Button } from "./button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "./command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "./popover";
import { Check, ChevronDown, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface MultiSelectProps {
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
  max?: number;
  className?: string;
}

export function MultiSelect({
  options,
  selected,
  onChange,
  placeholder = "Select items...",
  max,
  className,
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false);
  const safeOptions = Array.isArray(options)
    ? options.filter((option) => typeof option === "string" && option.length > 0)
    : [];
  const safeSelected = Array.isArray(selected)
    ? selected.filter((option) => typeof option === "string" && option.length > 0)
    : [];

  const handleSelect = (value: string) => {
    if (safeSelected.includes(value)) {
      onChange(safeSelected.filter((item) => item !== value));
    } else {
      if (max && safeSelected.length >= max) return;
      onChange([...safeSelected, value]);
    }
  };

  const handleRemove = (value: string) => {
    onChange(safeSelected.filter((item) => item !== value));
  };

  return (
    <div className={cn("space-y-2", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
          >
            {safeSelected.length === 0 ? (
              placeholder
            ) : (
              <span className="text-muted-foreground">
                {safeSelected.length} selected
                {max && ` (max ${max})`}
              </span>
            )}
            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start">
          <Command>
            <CommandInput placeholder="Search..." />
            <CommandList>
              <CommandEmpty>No options found.</CommandEmpty>
              <CommandGroup>
                {safeOptions.map((option) => (
                  <CommandItem
                    key={option}
                    value={option}
                    onSelect={() => handleSelect(option)}
                    className="cursor-pointer"
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        safeSelected.includes(option) ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {option}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {safeSelected.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {safeSelected.map((item) => (
            <Badge key={item} variant="secondary" className="text-xs">
              {item}
              <Button
                variant="ghost"
                size="sm"
                className="ml-1 h-3 w-3 p-0 hover:bg-transparent"
                onClick={() => handleRemove(item)}
              >
                <X className="h-2 w-2" />
              </Button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}







