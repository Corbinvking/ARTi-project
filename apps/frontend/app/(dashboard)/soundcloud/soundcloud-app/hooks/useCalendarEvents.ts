import { useState, useEffect } from 'react';
import { supabase } from '../integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { startOfMonth, endOfMonth, format } from 'date-fns';
import type { CalendarEventData } from '../types/calendar';
import { generateMockCalendarEvents } from '../utils/mockCalendarData';

export const useCalendarEvents = (viewDate: Date) => {
  const { toast } = useToast();
  const [events, setEvents] = useState<CalendarEventData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEvents = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const monthStart = startOfMonth(viewDate);
      const monthEnd = endOfMonth(viewDate);

      // Fetch from generic campaigns table
      const { data: campaigns, error: campaignsError } = await supabase
        .from('campaigns')
        .select('*')
        .gte('start_date', format(monthStart, 'yyyy-MM-dd'))
        .lte('start_date', format(monthEnd, 'yyyy-MM-dd'));

      if (campaignsError) throw campaignsError;

      // Fetch from soundcloud_submissions (the primary SoundCloud table)
      const { data: scSubmissions, error: scError } = await supabase
        .from('soundcloud_submissions')
        .select('*')
        .not('support_date', 'is', null)
        .gte('support_date', format(monthStart, 'yyyy-MM-dd'))
        .lte('support_date', format(monthEnd, 'yyyy-MM-dd'));

      if (scError) {
        console.warn('Error fetching soundcloud_submissions:', scError);
      }

      // Fallback: also try generic submissions table
      const { data: submissions, error: submissionsError } = await supabase
        .from('submissions')
        .select('*')
        .not('support_date', 'is', null)
        .gte('support_date', format(monthStart, 'yyyy-MM-dd'))
        .lte('support_date', format(monthEnd, 'yyyy-MM-dd'));

      if (submissionsError) {
        console.warn('Error fetching submissions:', submissionsError);
      }

      // Track IDs to avoid duplicates between tables
      const seenIds = new Set<string>();

      // Transform generic campaigns to calendar events (all campaigns are paid)
      const campaignEvents: CalendarEventData[] = (campaigns || []).map(campaign => {
        seenIds.add(campaign.id);
        return {
          id: campaign.id,
          type: 'campaign' as const,
          campaignType: 'paid' as const,
          title: `${campaign.artist_name} - ${campaign.track_name}`,
          artistName: campaign.artist_name,
          trackName: campaign.track_name,
          trackUrl: campaign.track_url,
          date: campaign.start_date!,
          status: campaign.status as any,
          budget: campaign.price_usd ? Number(campaign.price_usd) : undefined,
          reachTarget: campaign.goal_reposts,
          notes: campaign.client_notes || campaign.notes || undefined,
        };
      });

      // Transform SoundCloud submissions to calendar events
      const scEvents: CalendarEventData[] = (scSubmissions || []).map(submission => {
        seenIds.add(submission.id);
        return {
          id: submission.id,
          type: 'submission' as const,
          campaignType: (submission.campaign_type as 'paid' | 'free') || 'free',
          title: submission.track_name || submission.artist_name || 'Unknown Artist',
          artistName: submission.artist_name || 'Unknown Artist',
          trackName: submission.track_name || undefined,
          trackUrl: submission.track_url,
          date: submission.support_date!,
          status: submission.status as any,
          creditsAllocated: submission.credits_consumed || 0,
          submittedAt: submission.submitted_at,
          notes: submission.client_notes || submission.notes || undefined,
          reachTarget: submission.expected_reach_planned || submission.goal_reposts || undefined,
          budget: submission.sales_price ? Number(submission.sales_price) : undefined,
          playlistRequired: submission.playlist_required || false,
          playlistReceived: submission.playlist_received || false,
          isOverride: submission.date_is_override || submission.channel_is_override || false,
        };
      });

      // Transform generic submissions (avoiding duplicates)
      const submissionEvents: CalendarEventData[] = (submissions || [])
        .filter(submission => !seenIds.has(submission.id))
        .map(submission => ({
          id: submission.id,
          type: 'submission' as const,
          campaignType: (submission.campaign_type as 'paid' | 'free') || 'free',
          title: submission.artist_name || 'Unknown Artist',
          artistName: submission.artist_name || 'Unknown Artist',
          trackName: submission.track_name || undefined,
          trackUrl: submission.track_url,
          date: submission.support_date!,
          status: submission.status as any,
          creditsAllocated: submission.credits_consumed || 0,
          submittedAt: submission.submitted_at,
          notes: submission.client_notes || submission.notes || undefined,
          reachTarget: submission.expected_reach_planned || undefined,
          playlistRequired: submission.playlist_required || false,
          playlistReceived: submission.playlist_received || false,
          isOverride: submission.date_is_override || false,
        }));

      const allEvents = [...campaignEvents, ...scEvents, ...submissionEvents];
      
      // If no real data exists, use mock data for demonstration
      if (allEvents.length === 0) {
        const mockEvents = generateMockCalendarEvents();
        setEvents(mockEvents);
      } else {
        setEvents(allEvents);
      }
    } catch (error: any) {
      console.error('Error fetching calendar events:', error);
      setError(error.message);
      
      // Fallback to mock data on error
      const mockEvents = generateMockCalendarEvents();
      setEvents(mockEvents);
      
      toast({
        title: "Using Demo Data",
        description: "Displaying sample events for demonstration",
        variant: "default",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [viewDate]);

  return { events, isLoading, error, refetch: fetchEvents };
};