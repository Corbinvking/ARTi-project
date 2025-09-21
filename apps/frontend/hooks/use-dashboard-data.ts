"use client"

import { useState, useEffect } from "react"
import { apiService, type PlatformMetrics } from "@/lib/api"
import { useAuth } from "./use-auth"

interface DashboardData {
  totalFollowers: number
  totalEngagement: number
  totalPosts: number
  totalReach: number
  platformData: Record<string, PlatformMetrics>
}

interface UseDashboardDataResult {
  data: DashboardData | null
  loading: boolean
  error: string | null
  refetch: () => void
}

export function useDashboardData(): UseDashboardDataResult {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { user } = useAuth()

  const fetchData = async () => {
    if (!user) return

    setLoading(true)
    setError(null)

    try {
      const platformMetrics = await apiService.getAllPlatformMetrics(user.id)

      const aggregatedData: DashboardData = {
        totalFollowers: 0,
        totalEngagement: 0,
        totalPosts: 0,
        totalReach: 0,
        platformData: {},
      }

      for (const [platform, response] of Object.entries(platformMetrics)) {
        if (response.success) {
          const metrics = response.data
          aggregatedData.totalFollowers += metrics.followers
          aggregatedData.totalEngagement += metrics.engagement
          aggregatedData.totalPosts += metrics.posts
          aggregatedData.totalReach += metrics.reach
          aggregatedData.platformData[platform] = metrics
        } else {
          console.warn(`Failed to fetch ${platform} metrics:`, response.error)
        }
      }

      // Calculate average engagement
      const platformCount = Object.keys(aggregatedData.platformData).length
      if (platformCount > 0) {
        aggregatedData.totalEngagement = Math.round(aggregatedData.totalEngagement / platformCount)
      }

      setData(aggregatedData)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [user])

  return {
    data,
    loading,
    error,
    refetch: fetchData,
  }
}
