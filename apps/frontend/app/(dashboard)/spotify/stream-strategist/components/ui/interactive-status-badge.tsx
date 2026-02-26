"use client"

import { Badge } from "./badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./dropdown-menu";
import { Check, ChevronDown } from "lucide-react";

interface InteractiveStatusBadgeProps {
  status: string;
  onStatusChange: (newStatus: string) => void;
  disabled?: boolean;
}

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending', color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30' },
  { value: 'active', label: 'Active', color: 'bg-blue-500/10 text-blue-400 border-blue-500/30' },
  { value: 'complete', label: 'Complete', color: 'bg-green-500/10 text-green-400 border-green-500/30' },
];

export function InteractiveStatusBadge({ status, onStatusChange, disabled }: InteractiveStatusBadgeProps) {
  const normalizedStatus = status.toLowerCase();
  const currentStatusOption = STATUS_OPTIONS.find(opt => opt.value === normalizedStatus) || STATUS_OPTIONS[1];

  if (disabled) {
    return (
      <Badge className={`${currentStatusOption.color} border`}>
        {currentStatusOption.label}
      </Badge>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded">
          <Badge className={`${currentStatusOption.color} border cursor-pointer hover:opacity-80 transition-opacity flex items-center gap-1`}>
            {currentStatusOption.label}
            <ChevronDown className="h-3 w-3" />
          </Badge>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {STATUS_OPTIONS.map((option) => (
          <DropdownMenuItem
            key={option.value}
            onClick={(e) => {
              e.stopPropagation();
              if (option.value !== normalizedStatus) {
                onStatusChange(option.value);
              }
            }}
            className="flex items-center justify-between"
          >
            <span className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${option.color.split(' ')[0].replace('/10', '')}`} />
              {option.label}
            </span>
            {option.value === normalizedStatus && (
              <Check className="h-4 w-4 text-primary" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

