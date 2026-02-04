import React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '../../lib/utils';
import { DollarSign, Users, Gift, AlertCircle, ListMusic, Settings2 } from 'lucide-react';
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
  // Get color based on campaign type (paid vs free)
  const getEventColor = () => {
    // Paid campaigns get a distinct gold/amber color
    if (event.campaignType === 'paid') {
      return 'bg-amber-500/20 border-amber-500/50 text-amber-900 dark:text-amber-100';
    }
    // Free submissions get a blue/teal color
    return 'bg-teal-500/20 border-teal-500/50 text-teal-900 dark:text-teal-100';
  };

  // Get badge for campaign type
  const getCampaignTypeBadge = () => {
    if (event.campaignType === 'paid') {
      return (
        <Badge 
          variant="outline" 
          className="bg-amber-100 text-amber-800 border-amber-300 text-[10px] px-1.5 py-0"
        >
          <DollarSign className="h-2.5 w-2.5 mr-0.5" />
          PAID
        </Badge>
      );
    }
    return (
      <Badge 
        variant="outline" 
        className="bg-teal-100 text-teal-800 border-teal-300 text-[10px] px-1.5 py-0"
      >
        <Gift className="h-2.5 w-2.5 mr-0.5" />
        FREE
      </Badge>
    );
  };

  const getStatusColor = () => {
    switch (event.status) {
      case 'active':
      case 'approved':
      case 'ready':
        return 'bg-green-500/20 text-green-700 dark:text-green-400';
      case 'pending':
      case 'new':
        return 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-400';
      case 'completed':
      case 'complete':
        return 'bg-blue-500/20 text-blue-700 dark:text-blue-400';
      case 'rejected':
      case 'on_hold':
        return 'bg-destructive/20 text-destructive';
      default:
        return 'bg-muted/20 text-muted-foreground';
    }
  };

  if (isCompact) {
    return (
      <div
        className={cn(
          "px-2 py-1 text-xs rounded border cursor-pointer hover:opacity-80 transition-opacity relative",
          getEventColor(),
          event.campaignType === 'paid' && "border-l-2 border-l-amber-500"
        )}
        onClick={onClick}
      >
        <div className="flex items-center gap-1">
          {event.campaignType === 'paid' ? (
            <DollarSign className="h-3 w-3 text-amber-600 flex-shrink-0" />
          ) : (
            <Gift className="h-3 w-3 text-teal-600 flex-shrink-0" />
          )}
          <div className="font-medium truncate">{event.title}</div>
        </div>
        {event.isOverride && (
          <div className="absolute -top-1 -right-1 w-2 h-2 bg-orange-500 rounded-full" title="Manual Override" />
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "p-3 rounded-lg border cursor-pointer hover:shadow-md transition-shadow relative",
        getEventColor(),
        event.campaignType === 'paid' && "border-l-4 border-l-amber-500"
      )}
      onClick={onClick}
    >
      {/* Override indicator */}
      {event.isOverride && (
        <div 
          className="absolute -top-1.5 -right-1.5 bg-orange-500 text-white rounded-full p-0.5"
          title="Date manually overridden"
        >
          <Settings2 className="h-3 w-3" />
        </div>
      )}

      {/* Header with title, type badge, and status */}
      <div className="flex items-start justify-between mb-2 gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {getCampaignTypeBadge()}
            {event.playlistRequired && !event.playlistReceived && (
              <Badge 
                variant="outline" 
                className="bg-red-100 text-red-700 border-red-300 text-[10px] px-1.5 py-0"
              >
                <ListMusic className="h-2.5 w-2.5 mr-0.5" />
                NEEDS PLAYLIST
              </Badge>
            )}
          </div>
          <h4 className="font-medium text-sm truncate">{event.title}</h4>
        </div>
        <Badge variant="outline" className={cn("text-xs flex-shrink-0", getStatusColor())}>
          {event.status}
        </Badge>
      </div>
      
      <div className="space-y-1">
        <div className="text-xs text-muted-foreground">
          {event.artistName}
          {event.trackName && ` - ${event.trackName}`}
        </div>
        
        <div className="flex items-center gap-3 text-xs flex-wrap">
          {event.campaignType === 'paid' && event.budget && (
            <div className="flex items-center gap-1 text-amber-700 dark:text-amber-400 font-medium">
              <DollarSign className="h-3 w-3" />
              ${event.budget.toLocaleString()}
            </div>
          )}
          
          {event.reachTarget && (
            <div className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {event.reachTarget.toLocaleString()} reach
            </div>
          )}
          
          {event.campaignType === 'free' && event.creditsAllocated && event.creditsAllocated > 0 && (
            <div className="text-teal-700 dark:text-teal-400">
              {event.creditsAllocated} credits
            </div>
          )}
        </div>
      </div>
    </div>
  );
};