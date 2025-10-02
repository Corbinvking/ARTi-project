export interface Vendor {
  id: string
  name: string
  max_daily_streams: number
  max_concurrent_campaigns: number
  cost_per_1k_streams: number
  is_active: boolean
}

export interface Playlist {
  id: string
  vendor_id: string
  name: string
  url: string
  genres: string[]
  avg_daily_streams: number
  follower_count?: number
}

export interface VendorAllocation {
  vendorId: string
  vendorName: string
  playlistIds: string[]
  allocatedStreams: number
  costPerStream: number
  predictedPerformance: number
}

export interface GenreMatch {
  genre: string
  score: number
}

export interface AllocationRecommendation {
  vendorId: string
  vendorName: string
  playlistIds: string[]
  allocatedStreams: number
  costPerStream: number
  predictedPerformance: number
}






