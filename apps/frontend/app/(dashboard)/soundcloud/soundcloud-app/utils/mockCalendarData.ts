import { addDays, subDays, format } from 'date-fns';
import type { CalendarEventData } from '@/types/calendar';

export const generateMockCalendarEvents = (): CalendarEventData[] => {
  const today = new Date();
  
  return [
    // Today's events
    {
      id: 'mock-campaign-1',
      type: 'campaign',
      title: 'Future Bass Track - Neon Dreams',
      artistName: 'SynthWave Artist',
      trackName: 'Neon Dreams',
      trackUrl: 'https://soundcloud.com/example/neon-dreams',
      date: format(today, 'yyyy-MM-dd'),
      status: 'active',
      budget: 500,
      reachTarget: 1000,
      notes: 'High priority campaign for established artist'
    },
    {
      id: 'mock-submission-1',
      type: 'submission',
      title: 'Techno Underground - Dark Matter',
      artistName: 'Underground Producer',
      trackName: 'Dark Matter',
      trackUrl: 'https://soundcloud.com/example/dark-matter',
      date: format(today, 'yyyy-MM-dd'),
      status: 'approved',
      creditsAllocated: 3,
      reachTarget: 500,
      submittedAt: format(subDays(today, 1), 'yyyy-MM-dd\'T\'HH:mm:ss'),
      notes: 'Approved for today\'s queue'
    },
    
    // Tomorrow's events
    {
      id: 'mock-campaign-2',
      type: 'campaign',
      title: 'Pop Anthem - Summer Vibes',
      artistName: 'Chart Topper',
      trackName: 'Summer Vibes',
      trackUrl: 'https://soundcloud.com/example/summer-vibes',
      date: format(addDays(today, 1), 'yyyy-MM-dd'),
      status: 'pending',
      budget: 750,
      reachTarget: 1500,
      notes: 'Scheduled for peak hours'
    },
    {
      id: 'mock-submission-2',
      type: 'submission',
      title: 'Ambient Chill - Forest Sounds',
      artistName: 'Nature Beats',
      trackName: 'Forest Sounds',
      trackUrl: 'https://soundcloud.com/example/forest-sounds',
      date: format(addDays(today, 1), 'yyyy-MM-dd'),
      status: 'pending',
      creditsAllocated: 2,
      reachTarget: 300,
      submittedAt: format(today, 'yyyy-MM-dd\'T\'HH:mm:ss'),
      notes: 'Peaceful ambient track for morning queue'
    },

    // Next week events
    {
      id: 'mock-campaign-3',
      type: 'campaign',
      title: 'Rock Revival - Electric Storm',
      artistName: 'Thunder Band',
      trackName: 'Electric Storm',
      trackUrl: 'https://soundcloud.com/example/electric-storm',
      date: format(addDays(today, 5), 'yyyy-MM-dd'),
      status: 'active',
      budget: 1200,
      reachTarget: 2000,
      notes: 'Major release campaign'
    },
    {
      id: 'mock-submission-3',
      type: 'submission',
      title: 'Lo-Fi Hip Hop - Coffee Shop',
      artistName: 'Chill Beats',
      trackName: 'Coffee Shop',
      trackUrl: 'https://soundcloud.com/example/coffee-shop',
      date: format(addDays(today, 7), 'yyyy-MM-dd'),
      status: 'approved',
      creditsAllocated: 1,
      reachTarget: 200,
      submittedAt: format(subDays(today, 2), 'yyyy-MM-dd\'T\'HH:mm:ss'),
      notes: 'Perfect for study playlists'
    },

    // Past events for history
    {
      id: 'mock-submission-4',
      type: 'submission',
      title: 'Electronic Dance - Midnight Pulse',
      artistName: 'Beat Master',
      trackName: 'Midnight Pulse',
      trackUrl: 'https://soundcloud.com/example/midnight-pulse',
      date: format(subDays(today, 2), 'yyyy-MM-dd'),
      status: 'completed',
      creditsAllocated: 2,
      reachTarget: 400,
      submittedAt: format(subDays(today, 4), 'yyyy-MM-dd\'T\'HH:mm:ss'),
      notes: 'Successfully completed campaign'
    },
    {
      id: 'mock-campaign-4',
      type: 'campaign',
      title: 'Indie Rock - City Lights',
      artistName: 'Urban Indie',
      trackName: 'City Lights',
      trackUrl: 'https://soundcloud.com/example/city-lights',
      date: format(subDays(today, 3), 'yyyy-MM-dd'),
      status: 'completed',
      budget: 300,
      reachTarget: 800,
      notes: 'Successful indie promotion'
    }
  ];
};