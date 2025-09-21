// Enhanced API service for external integrations
export interface ApiConfig {
  baseUrl: string
  timeout: number
  retries: number
}

export interface ApiResponse<T> {
  data: T
  success: boolean
  message?: string
  error?: string
}

export interface PlatformMetrics {
  followers: number
  engagement: number
  posts: number
  reach: number
  impressions: number
}

export interface PlatformPost {
  id: string
  title: string
  content: string
  publishedAt: string
  engagement: {
    likes: number
    comments: number
    shares: number
  }
  platform: string
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
  ) {
    super(message)
    this.name = "ApiError"
  }
}

export class ApiService {
  private config: ApiConfig

  constructor(config: ApiConfig) {
    this.config = config
  }

  private async request<T>(endpoint: string, options: RequestInit = {}, retryCount = 0): Promise<ApiResponse<T>> {
    const url = `${this.config.baseUrl}${endpoint}`
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout)

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          ...options.headers,
        },
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new ApiError(`API Error: ${response.statusText}`, response.status)
      }

      const data = await response.json()
      return {
        data,
        success: true,
      }
    } catch (error) {
      clearTimeout(timeoutId)

      if (error instanceof ApiError) {
        throw error
      }

      if (retryCount < this.config.retries) {
        await new Promise((resolve) => setTimeout(resolve, 1000 * (retryCount + 1)))
        return this.request<T>(endpoint, options, retryCount + 1)
      }

      throw new ApiError(error instanceof Error ? error.message : "Unknown error occurred", 0, "NETWORK_ERROR")
    }
  }

  // Platform-specific methods with enhanced error handling
  async getSpotifyMetrics(userId: string): Promise<ApiResponse<PlatformMetrics>> {
    try {
      return await this.request<PlatformMetrics>(`/spotify/user/${userId}/metrics`)
    } catch (error) {
      console.error("Spotify metrics error:", error)
      return {
        data: { followers: 0, engagement: 0, posts: 0, reach: 0, impressions: 0 },
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch Spotify metrics",
      }
    }
  }

  async getSpotifyPosts(userId: string): Promise<ApiResponse<PlatformPost[]>> {
    try {
      return await this.request<PlatformPost[]>(`/spotify/user/${userId}/posts`)
    } catch (error) {
      console.error("Spotify posts error:", error)
      return {
        data: [],
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch Spotify posts",
      }
    }
  }

  async getInstagramMetrics(userId: string): Promise<ApiResponse<PlatformMetrics>> {
    try {
      return await this.request<PlatformMetrics>(`/instagram/user/${userId}/metrics`)
    } catch (error) {
      console.error("Instagram metrics error:", error)
      return {
        data: { followers: 0, engagement: 0, posts: 0, reach: 0, impressions: 0 },
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch Instagram metrics",
      }
    }
  }

  async getInstagramPosts(userId: string): Promise<ApiResponse<PlatformPost[]>> {
    try {
      return await this.request<PlatformPost[]>(`/instagram/user/${userId}/posts`)
    } catch (error) {
      console.error("Instagram posts error:", error)
      return {
        data: [],
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch Instagram posts",
      }
    }
  }

  async getYouTubeMetrics(userId: string): Promise<ApiResponse<PlatformMetrics>> {
    try {
      return await this.request<PlatformMetrics>(`/youtube/user/${userId}/metrics`)
    } catch (error) {
      console.error("YouTube metrics error:", error)
      return {
        data: { followers: 0, engagement: 0, posts: 0, reach: 0, impressions: 0 },
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch YouTube metrics",
      }
    }
  }

  async getYouTubePosts(userId: string): Promise<ApiResponse<PlatformPost[]>> {
    try {
      return await this.request<PlatformPost[]>(`/youtube/user/${userId}/posts`)
    } catch (error) {
      console.error("YouTube posts error:", error)
      return {
        data: [],
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch YouTube posts",
      }
    }
  }

  async getSoundCloudMetrics(userId: string): Promise<ApiResponse<PlatformMetrics>> {
    try {
      return await this.request<PlatformMetrics>(`/soundcloud/user/${userId}/metrics`)
    } catch (error) {
      console.error("SoundCloud metrics error:", error)
      return {
        data: { followers: 0, engagement: 0, posts: 0, reach: 0, impressions: 0 },
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch SoundCloud metrics",
      }
    }
  }

  async getSoundCloudPosts(userId: string): Promise<ApiResponse<PlatformPost[]>> {
    try {
      return await this.request<PlatformPost[]>(`/soundcloud/user/${userId}/posts`)
    } catch (error) {
      console.error("SoundCloud posts error:", error)
      return {
        data: [],
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch SoundCloud posts",
      }
    }
  }

  // Generic platform data aggregation
  async getAllPlatformMetrics(userId: string): Promise<Record<string, ApiResponse<PlatformMetrics>>> {
    const [spotify, instagram, youtube, soundcloud] = await Promise.all([
      this.getSpotifyMetrics(userId),
      this.getInstagramMetrics(userId),
      this.getYouTubeMetrics(userId),
      this.getSoundCloudMetrics(userId),
    ])

    return {
      spotify,
      instagram,
      youtube,
      soundcloud,
    }
  }
}

export const apiService = new ApiService({
  baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL || "https://api.yourdomain.com",
  timeout: 10000,
  retries: 3,
})
