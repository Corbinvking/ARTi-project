import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { format } from 'date-fns';
import { 
  Calendar, 
  DollarSign, 
  Users, 
  ExternalLink,
  Clock,
  Target,
  CreditCard 
} from 'lucide-react';
import type { CalendarEventData } from '../../types/calendar';

interface EventDetailsModalProps {
  event: CalendarEventData;
  isOpen: boolean;
  onClose: () => void;
}

export const EventDetailsModal: React.FC<EventDetailsModalProps> = ({
  event,
  isOpen,
  onClose,
}) => {
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

  const getTypeColor = () => {
    return event.type === 'campaign' 
      ? 'bg-primary/20 text-primary' 
      : 'bg-accent/20 text-accent';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <DialogTitle className="text-xl">{event.title}</DialogTitle>
              <DialogDescription className="mt-1">
                {event.artistName} • {event.trackName}
              </DialogDescription>
            </div>
            <div className="flex gap-2">
              <Badge className={getTypeColor()}>
                {event.type === 'campaign' ? 'Paid Campaign' : 'Free Queue'}
              </Badge>
              <Badge variant="outline" className={getStatusColor()}>
                {event.status}
              </Badge>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Date & Schedule Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                Scheduled Date
              </div>
              <div className="font-medium">
                {format(new Date(event.date), 'EEEE, MMMM d, yyyy')}
              </div>
            </div>
            {event.submittedAt && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  Submitted
                </div>
                <div className="font-medium">
                  {format(new Date(event.submittedAt), 'MMM d, yyyy')}
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Campaign/Submission Details */}
          <div className="grid grid-cols-3 gap-4">
            {event.budget && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <DollarSign className="h-4 w-4" />
                  Budget
                </div>
                <div className="font-medium text-green-400">
                  ${event.budget.toLocaleString()}
                </div>
              </div>
            )}
            
            {event.reachTarget && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Target className="h-4 w-4" />
                  Reach Target
                </div>
                <div className="font-medium">
                  {event.reachTarget.toLocaleString()}
                </div>
              </div>
            )}
            
            {event.creditsAllocated && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CreditCard className="h-4 w-4" />
                  Credits
                </div>
                <div className="font-medium text-accent">
                  {event.creditsAllocated}
                </div>
              </div>
            )}
          </div>

          {/* Track Information */}
          {event.trackUrl && (
            <>
              <Separator />
              <div className="space-y-2">
                <div className="text-sm font-medium">Track</div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 text-sm text-muted-foreground truncate">
                    {event.trackUrl}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(event.trackUrl, '_blank')}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}

          {/* Notes */}
          {event.notes && (
            <>
              <Separator />
              <div className="space-y-2">
                <div className="text-sm font-medium">Notes</div>
                <div className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-lg">
                  {event.notes}
                </div>
              </div>
            </>
          )}

          {/* Supporters */}
          {event.suggestedSupporters && event.suggestedSupporters.length > 0 && (
            <>
              <Separator />
              <div className="space-y-2">
                <div className="text-sm font-medium">
                  Supporters ({event.suggestedSupporters.length})
                </div>
                <div className="flex flex-wrap gap-2">
                  {event.suggestedSupporters.slice(0, 8).map((supporter, idx) => (
                    <Badge key={idx} variant="outline" className="text-xs">
                      {supporter}
                    </Badge>
                  ))}
                  {event.suggestedSupporters.length > 8 && (
                    <Badge variant="outline" className="text-xs">
                      +{event.suggestedSupporters.length - 8} more
                    </Badge>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button>
            {event.type === 'campaign' ? 'Manage Campaign' : 'Review Submission'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};