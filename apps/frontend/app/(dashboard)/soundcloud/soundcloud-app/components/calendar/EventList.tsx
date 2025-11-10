"use client"

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { format, isToday } from 'date-fns';
import { Search, ExternalLink, Users, DollarSign, CreditCard, Filter } from 'lucide-react';
import { useCalendarEvents } from '../../hooks/useCalendarEvents';
import { EventDetailsModal } from './EventDetailsModal';
import type { CalendarEventData } from '../../types/calendar';

interface EventListProps {
  selectedDate?: Date;
}

export const EventList: React.FC<EventListProps> = ({ selectedDate }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [showTodaysApproved, setShowTodaysApproved] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEventData | null>(null);
  
  const { events, isLoading, error } = useCalendarEvents(selectedDate || new Date());

  const filteredEvents = events.filter(event => {
    // If "Today's Approved" filter is active, only show approved events for today
    if (showTodaysApproved) {
      return event.status === 'approved' && isToday(new Date(event.date));
    }
    
    const matchesSearch = event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         event.artistName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || event.status === statusFilter;
    const matchesType = typeFilter === 'all' || event.type === typeFilter;
    
    return matchesSearch && matchesStatus && matchesType;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
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

  const getTypeColor = (type: string) => {
    return type === 'campaign' 
      ? 'bg-primary/20 text-primary' 
      : 'bg-accent/20 text-accent';
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/3" />
            <div className="h-64 bg-muted rounded" />
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
            Failed to load events. Please try again.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Event List</CardTitle>
          <CardDescription>
            Sortable and filterable list of all scheduled items
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Today's Approved Quick Filter */}
          <div className="mb-6">
            <Button
              variant={showTodaysApproved ? "default" : "outline"}
              size="default"
              onClick={() => setShowTodaysApproved(!showTodaysApproved)}
              className={`gap-2 transition-all duration-300 ${showTodaysApproved ? 'bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg' : 'hover:shadow-md'}`}
            >
              <Filter className="h-4 w-4" />
              Today's Approved Songs
              {showTodaysApproved && (
                <Badge variant="secondary" className="ml-2 bg-white/20 text-white border-white/30">
                  {events.filter(e => e.status === 'approved' && isToday(new Date(e.date))).length}
                </Badge>
              )}
            </Button>
          </div>

          {/* Filters */}
          <div className={`flex flex-wrap gap-4 mb-6 transition-all duration-300 ${showTodaysApproved ? 'opacity-40 pointer-events-none' : ''}`}>
            <div className="relative flex-1 min-w-[280px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search events..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-11 bg-card/50 backdrop-blur-sm border-border/50 focus:border-primary/50 focus:bg-card transition-all duration-200"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[160px] h-11 bg-card/50 backdrop-blur-sm border-border/50 hover:border-primary/30 transition-colors">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="campaign">Paid Campaigns</SelectItem>
                <SelectItem value="submission">Free Queue</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px] h-11 bg-card/50 backdrop-blur-sm border-border/50 hover:border-primary/30 transition-colors">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="new">New</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Results Count */}
          <div className="text-sm font-medium text-muted-foreground mb-6 px-1">
            {showTodaysApproved ? (
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                Showing {filteredEvents.length} approved songs for today
              </div>
            ) : (
              <>Showing {filteredEvents.length} of {events.length} events</>
            )}
          </div>

          {/* Events Table */}
          <div className="bg-gradient-to-br from-card/80 to-card/60 backdrop-blur-sm rounded-xl border border-border/50 shadow-xl overflow-hidden">
            <Table>
              <TableHeader className="bg-gradient-to-r from-muted/50 to-muted/30 backdrop-blur-sm">
                <TableRow className="border-border/30 hover:bg-transparent">
                  <TableHead className="font-semibold text-foreground/90 py-4 px-6">Event</TableHead>
                  <TableHead className="font-semibold text-foreground/90 py-4 px-6">Type</TableHead>
                  <TableHead className="font-semibold text-foreground/90 py-4 px-6">Date</TableHead>
                  <TableHead className="font-semibold text-foreground/90 py-4 px-6">Status</TableHead>
                  <TableHead className="font-semibold text-foreground/90 py-4 px-6">Value</TableHead>
                  <TableHead className="font-semibold text-foreground/90 py-4 px-6">Reach</TableHead>
                  <TableHead className="font-semibold text-foreground/90 py-4 px-6 text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEvents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-16">
                      <div className="flex flex-col items-center gap-4">
                        <div className="text-muted-foreground">
                          {events.length === 0 ? (
                            <>
                              <div className="mb-4 p-8 rounded-full bg-gradient-to-br from-primary/10 to-accent/10 w-24 h-24 flex items-center justify-center mx-auto">
                                <Filter className="h-8 w-8 text-primary/50" />
                              </div>
                              <h3 className="font-semibold text-lg text-foreground mb-2">No Events Yet</h3>
                              <p className="text-base mb-1">Events will appear here once campaigns and submissions are scheduled.</p>
                              <p className="text-sm">The calendar will show both paid campaigns and free queue submissions.</p>
                            </>
                          ) : (
                            <>
                              <div className="mb-4 p-6 rounded-full bg-gradient-to-br from-muted/20 to-muted/10 w-20 h-20 flex items-center justify-center mx-auto">
                                <Search className="h-6 w-6 text-muted-foreground/70" />
                              </div>
                              <h3 className="font-semibold text-lg text-foreground mb-2">No Matching Events</h3>
                              <p>Try adjusting your filters or search terms.</p>
                            </>
                          )}
                        </div>
                        {events.length === 0 && (
                          <div className="flex gap-3 mt-6">
                            <Button variant="outline" size="sm" className="bg-gradient-to-r from-primary/10 to-primary/5 hover:from-primary/20 hover:to-primary/10 border-primary/20">
                              Create Campaign
                            </Button>
                            <Button variant="outline" size="sm" className="bg-gradient-to-r from-accent/10 to-accent/5 hover:from-accent/20 hover:to-accent/10 border-accent/20">
                              Submit Track
                            </Button>
                          </div>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredEvents.map((event, index) => (
                    <TableRow 
                      key={event.id}
                      className="group cursor-pointer transition-all duration-300 hover:bg-gradient-to-r hover:from-muted/20 hover:to-transparent border-border/30 hover:shadow-md"
                      onClick={() => setSelectedEvent(event)}
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <TableCell className="py-6 px-6">
                        <div className="space-y-1">
                          <div className="font-medium text-foreground group-hover:text-primary transition-colors duration-200">{event.title}</div>
                          <div className="text-sm text-muted-foreground font-medium">
                            {event.artistName}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-6 px-6">
                        <Badge 
                          className={`${getTypeColor(event.type)} font-medium px-3 py-1.5 rounded-full shadow-sm transition-all duration-200 group-hover:shadow-md`}
                        >
                          {event.type === 'campaign' ? 'Paid' : 'Free'}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-6 px-6">
                        <div className="text-sm font-medium text-foreground">
                          {format(new Date(event.date), 'MMM d, yyyy')}
                        </div>
                      </TableCell>
                      <TableCell className="py-6 px-6">
                        <Badge 
                          variant="outline" 
                          className={`${getStatusColor(event.status)} font-medium px-3 py-1.5 rounded-full border-2 shadow-sm transition-all duration-200 group-hover:shadow-md`}
                        >
                          {event.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-6 px-6">
                        <div className="flex items-center gap-2">
                          {event.budget ? (
                            <>
                              <div className="p-1.5 rounded-full bg-green-500/10">
                                <DollarSign className="h-3.5 w-3.5 text-green-400" />
                              </div>
                               <span className="text-green-400 font-semibold">
                                ${event.budget?.toLocaleString()}
                              </span>
                            </>
                          ) : event.creditsAllocated ? (
                            <>
                              <div className="p-1.5 rounded-full bg-accent/10">
                                <CreditCard className="h-3.5 w-3.5 text-accent" />
                              </div>
                              <span className="text-accent font-semibold">
                                {event.creditsAllocated} credits
                              </span>
                            </>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="py-6 px-6">
                        {event.reachTarget && (
                          <div className="flex items-center gap-2">
                            <div className="p-1.5 rounded-full bg-primary/10">
                              <Users className="h-3.5 w-3.5 text-primary" />
                            </div>
                            <span className="font-semibold text-foreground">{event.reachTarget.toLocaleString()}</span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="py-6 px-6 text-center">
                        {event.trackUrl && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              window.open(event.trackUrl, '_blank');
                            }}
                            className="h-9 w-9 p-0 rounded-full hover:bg-primary/10 hover:text-primary transition-all duration-200 group-hover:shadow-md"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
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