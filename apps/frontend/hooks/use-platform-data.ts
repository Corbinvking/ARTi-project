"use client"

import { useState, useEffect } from "react"
import { apiService, type PlatformMetrics, type PlatformPost, type ApiResponse } from "@/lib/api"
import { useAuth } from "./use-auth"

interface UsePlatformDataResult {
  metrics: PlatformMetrics | null
  posts: PlatformPost[]
  loading: boolean
  error: string | null
  refetch: () => void
}

export function usePlatformData(platform: string): UsePlatformDataResult {
  const [metrics, setMetrics] = useState<PlatformMetrics | null>(null)
  const [posts, setPosts] = useState<PlatformPost[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { user } = useAuth()

  const fetchData = async () => {
    if (!user) return

    setLoading(true)
    setError(null)

    try {
      let metricsResponse: ApiResponse<PlatformMetrics>
      let postsResponse: ApiResponse<PlatformPost[]>

      switch (platform) {
        case "spotify":
          metricsResponse = await apiService.getSpotifyMetrics(user.id)
          postsResponse = await apiService.getSpotifyPosts(user.id)
          break
        case "instagram":
          metricsResponse = await apiService.getInstagramMetrics(user.id)
          postsResponse = await apiService.getInstagramPosts(user.id)
          break
        case "youtube":
          metricsResponse = await apiService.getYouTubeMetrics(user.id)
          postsResponse = await apiService.getYouTubePosts(user.id)
          break
        case "soundcloud":
          metricsResponse = await apiService.getSoundCloudMetrics(user.id)
          postsResponse = await apiService.getSoundCloudPosts(user.id)
          break
        default:
          throw new Error(`Unsupported platform: ${platform}`)
      }

      if (metricsResponse.success) {
        setMetrics(metricsResponse.data)
      } else {
        setError(metricsResponse.error || "Failed to fetch metrics")
      }

      if (postsResponse.success) {
        setPosts(postsResponse.data)
      } else {
        setError(postsResponse.error || "Failed to fetch posts")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [platform, user])

  return {
    metrics,
    posts,
    loading,
    error,
    refetch: fetchData,
  }
}
