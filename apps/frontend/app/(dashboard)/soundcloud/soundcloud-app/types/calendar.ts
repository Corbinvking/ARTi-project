export interface CalendarEventData {
  id: string;
  type: 'campaign' | 'submission';
  campaignType: 'paid' | 'free'; // Differentiates paid vs free campaigns
  title: string;
  artistName: string;
  trackName?: string;
  trackUrl?: string;
  date: string;
  status: 'active' | 'pending' | 'completed' | 'rejected' | 'new' | 'approved' | 'ready' | 'on_hold' | 'complete';
  budget?: number;
  reachTarget?: number;
  creditsAllocated?: number;
  submittedAt?: string;
  notes?: string;
  suggestedSupporters?: string[];
  playlistRequired?: boolean;
  playlistReceived?: boolean;
  isOverride?: boolean; // If date was manually overridden
}

export interface CalendarFilters {
  type: 'all' | 'campaigns' | 'submissions';
  campaignType?: 'all' | 'paid' | 'free'; // Filter by paid vs free
  status?: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
}