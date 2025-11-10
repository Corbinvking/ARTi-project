import React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '../../lib/utils';
import { DollarSign, Users } from 'lucide-react';
import type { CalendarEventData } from '../../types/calendar';

interface CalendarEventProps {
  event: CalendarEventData;
  isCompact?: boolean;
  onClick?: () => void;
}

export const CalendarEvent: React.FC<CalendarEventProps> = ({
  event,
  isCompact = false,
  onClick,
}) => {
  const getEventColor = () => {
    switch (event.type) {
      case 'campaign':
        return 'bg-primary/20 border-primary/40 text-primary-foreground';
      case 'submission':
        return 'bg-accent/20 border-accent/40 text-accent-foreground';
      default:
        return 'bg-muted border-border text-muted-foreground';
    }
  };

  const getStatusColor = () => {
    switch (event.status) {
      case 'active':
      case 'approved':
        return 'bg-green-500/20 text-green-400';
      case 'pending':
      case 'new':
        return 'bg-yellow-500/20 text-yellow-400';
      case 'completed':
        return 'bg-blue-500/20 text-blue-400';
      case 'rejected':
        return 'bg-destructive/20 text-destructive';
      default:
        return 'bg-muted/20 text-muted-foreground';
    }
  };

  if (isCompact) {
    return (
      <div
        className={cn(
          "px-2 py-1 text-xs rounded border cursor-pointer hover:opacity-80 transition-opacity",
          getEventColor()
        )}
        onClick={onClick}
      >
        <div className="font-medium truncate">{event.title}</div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "p-3 rounded-lg border cursor-pointer hover:shadow-md transition-shadow",
        getEventColor()
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-2">
        <h4 className="font-medium text-sm truncate flex-1">{event.title}</h4>
        <Badge variant="outline" className={cn("ml-2 text-xs", getStatusColor())}>
          {event.status}
        </Badge>
      </div>
      
      <div className="space-y-1">
        <div className="text-xs text-muted-foreground">
          {event.artistName}
        </div>
        
        <div className="flex items-center gap-3 text-xs">
          {event.type === 'campaign' && event.budget && (
            <div className="flex items-center gap-1 text-green-400">
              <DollarSign className="h-3 w-3" />
              ${event.budget.toLocaleString()}
            </div>
          )}
          
          {event.reachTarget && (
            <div className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {event.reachTarget.toLocaleString()}
            </div>
          )}
          
          {event.creditsAllocated && (
            <div className="text-accent">
              {event.creditsAllocated} credits
            </div>
          )}
        </div>
      </div>
    </div>
  );
};