export interface CalendarEventData {
  id: string;
  type: 'campaign' | 'submission';
  title: string;
  artistName: string;
  trackName?: string;
  trackUrl?: string;
  date: string;
  status: 'active' | 'pending' | 'completed' | 'rejected' | 'new' | 'approved';
  budget?: number;
  reachTarget?: number;
  creditsAllocated?: number;
  submittedAt?: string;
  notes?: string;
  suggestedSupporters?: string[];
}

export interface CalendarFilters {
  type: 'all' | 'campaigns' | 'submissions';
  status?: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
}