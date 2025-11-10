"use client"

import React, { useState } from 'react';
import { format, isSameMonth, isSameDay, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '../../lib/utils';
import { CalendarEvent } from './CalendarEvent';
import { EventDetailsModal } from './EventDetailsModal';
import { useCalendarEvents } from '../../hooks/useCalendarEvents';
import type { CalendarEventData } from '../../types/calendar';

interface UnifiedCalendarProps {
  selectedDate?: Date;
  onDateSelect?: (date: Date | undefined) => void;
  showFilters?: boolean;
}

export const UnifiedCalendar: React.FC<UnifiedCalendarProps> = ({
  selectedDate,
  onDateSelect,
  showFilters = true,
}) => {
  const [viewDate, setViewDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState<CalendarEventData | null>(null);
  const [eventFilter, setEventFilter] = useState<'all' | 'campaigns' | 'submissions'>('all');
  
  const { events, isLoading, error } = useCalendarEvents(viewDate);

  const filteredEvents = events.filter(event => {
    if (eventFilter === 'all') return true;
    if (eventFilter === 'campaigns') return event.type === 'campaign';
    if (eventFilter === 'submissions') return event.type === 'submission';
    return true;
  });

  const getEventsForDate = (date: Date) => {
    return filteredEvents.filter(event => isSameDay(new Date(event.date), date));
  };

  const renderDay = (date: Date) => {
    const dayEvents = getEventsForDate(date);
    const isSelected = selectedDate && isSameDay(date, selectedDate);
    const isCurrentMonth = isSameMonth(date, viewDate);

    return (
      <div
        className={cn(
          "relative min-h-[80px] p-1 border-r border-b border-border/50",
          !isCurrentMonth && "bg-muted/20 text-muted-foreground",
          isSelected && "bg-primary/10 ring-2 ring-primary/30"
        )}
        onClick={() => onDateSelect?.(date)}
      >
        <div className="text-sm font-medium mb-1">
          {format(date, 'd')}
        </div>
        <div className="space-y-1">
          {dayEvents.slice(0, 3).map((event, idx) => (
            <CalendarEvent
              key={`${event.id}-${idx}`}
              event={event}
              isCompact
              onClick={() => setSelectedEvent(event)}
            />
          ))}
          {dayEvents.length > 3 && (
            <div className="text-xs text-muted-foreground px-1">
              +{dayEvents.length - 3} more
            </div>
          )}
        </div>
      </div>
    );
  };

  const monthDays = eachDayOfInterval({
    start: startOfMonth(viewDate),
    end: endOfMonth(viewDate),
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/3" />
            <div className="h-96 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-destructive">
            Failed to load calendar events. Please try again.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardContent className="p-6">
          {/* Calendar Header */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">
              {format(viewDate, 'MMMM yyyy')}
            </h3>
            {showFilters && (
              <div className="flex gap-2">
                <Badge
                  variant={eventFilter === 'all' ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => setEventFilter('all')}
                >
                  All Events
                </Badge>
                <Badge
                  variant={eventFilter === 'campaigns' ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => setEventFilter('campaigns')}
                >
                  Paid Campaigns
                </Badge>
                <Badge
                  variant={eventFilter === 'submissions' ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => setEventFilter('submissions')}
                >
                  Free Queue
                </Badge>
              </div>
            )}
          </div>

          {/* Month Navigation */}
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1))}
              className="px-3 py-1 text-sm border border-border rounded hover:bg-muted"
            >
              Previous
            </button>
            <button
              onClick={() => setViewDate(new Date())}
              className="px-3 py-1 text-sm border border-border rounded hover:bg-muted"
            >
              Today
            </button>
            <button
              onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1))}
              className="px-3 py-1 text-sm border border-border rounded hover:bg-muted"
            >
              Next
            </button>
          </div>

          {/* Calendar Grid */}
          <div className="border border-border rounded-lg overflow-hidden">
            {/* Week Header */}
            <div className="grid grid-cols-7 bg-muted/50">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="p-2 text-sm font-medium text-center border-r border-border/50 last:border-r-0">
                  {day}
                </div>
              ))}
            </div>
            
            {/* Calendar Days */}
            <div className="grid grid-cols-7">
              {monthDays.map(date => (
                <div key={format(date, 'yyyy-MM-dd')}>
                  {renderDay(date)}
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Event Details Modal */}
      {selectedEvent && (
        <EventDetailsModal
          event={selectedEvent}
          isOpen={!!selectedEvent}
          onClose={() => setSelectedEvent(null)}
        />
      )}
    </>
  );
};