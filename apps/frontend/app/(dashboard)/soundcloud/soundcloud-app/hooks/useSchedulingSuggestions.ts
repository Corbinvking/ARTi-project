"use client"

import { useState, useEffect, useCallback } from "react"
import {
  getSuggestedDates,
  getBestSuggestedDate,
  getSuggestedChannels,
  getChannelsForReachTarget,
  checkDateAvailability,
  checkChannelAvailability,
} from "../utils/schedulingSuggestions"

interface Member {
  id: string
  name: string
  soundcloud_handle?: string
  soundcloud_followers?: number
  size_tier?: string
  families?: string[]
  influence_planner_status?: string
  reach_factor?: number
}

interface SubmissionData {
  id: string
  family?: string
  subgenres?: string[]
  expectedReach?: number
  memberSizeTier?: string
}

interface DateSlot {
  date: Date
  scheduledCount: number
  availableChannels: number
  isIdeal: boolean
  score: number
}

interface ChannelSuggestion {
  member: Member
  score: number
  reasons: string[]
  estimatedReach: number
}

interface UseSchedulingSuggestionsOptions {
  submission?: SubmissionData | null
  targetReach?: number
  autoFetch?: boolean
}

interface UseSchedulingSuggestionsReturn {
  // Date suggestions
  suggestedDates: DateSlot[]
  bestDate: Date | null
  loadingDates: boolean
  refetchDates: () => Promise<void>

  // Channel suggestions
  suggestedChannels: ChannelSuggestion[]
  loadingChannels: boolean
  refetchChannels: () => Promise<void>

  // Availability checks
  checkDateAvailable: (date: Date) => Promise<{
    available: boolean
    currentCount: number
    maxSlots: number
  }>
  checkChannelAvailable: (
    channelId: string,
    date: Date
  ) => Promise<{
    available: boolean
    currentCount: number
    maxLimit: number
  }>

  // Combined suggestion
  getSuggestionsForSubmission: (submission: SubmissionData) => Promise<{
    date: Date | null
    channels: ChannelSuggestion[]
    totalEstimatedReach: number
  }>
}

export const useSchedulingSuggestions = (
  options: UseSchedulingSuggestionsOptions = {}
): UseSchedulingSuggestionsReturn => {
  const { submission, targetReach, autoFetch = true } = options

  const [suggestedDates, setSuggestedDates] = useState<DateSlot[]>([])
  const [bestDate, setBestDate] = useState<Date | null>(null)
  const [suggestedChannels, setSuggestedChannels] = useState<ChannelSuggestion[]>([])
  const [loadingDates, setLoadingDates] = useState(false)
  const [loadingChannels, setLoadingChannels] = useState(false)

  // Fetch date suggestions
  const refetchDates = useCallback(async () => {
    setLoadingDates(true)
    try {
      const [dates, best] = await Promise.all([
        getSuggestedDates(),
        getBestSuggestedDate(),
      ])
      setSuggestedDates(dates)
      setBestDate(best)
    } catch (error) {
      console.error("Failed to fetch date suggestions:", error)
    } finally {
      setLoadingDates(false)
    }
  }, [])

  // Fetch channel suggestions
  const refetchChannels = useCallback(async () => {
    if (!submission) return

    setLoadingChannels(true)
    try {
      let channels: ChannelSuggestion[]

      if (targetReach) {
        channels = await getChannelsForReachTarget(submission, targetReach)
      } else {
        channels = await getSuggestedChannels(submission)
      }

      setSuggestedChannels(channels)
    } catch (error) {
      console.error("Failed to fetch channel suggestions:", error)
    } finally {
      setLoadingChannels(false)
    }
  }, [submission, targetReach])

  // Auto-fetch on mount and when dependencies change
  useEffect(() => {
    if (autoFetch) {
      refetchDates()
    }
  }, [autoFetch, refetchDates])

  useEffect(() => {
    if (autoFetch && submission) {
      refetchChannels()
    }
  }, [autoFetch, submission, refetchChannels])

  // Check date availability
  const checkDateAvailable = useCallback(async (date: Date) => {
    return checkDateAvailability(date)
  }, [])

  // Check channel availability
  const checkChannelAvailable = useCallback(
    async (channelId: string, date: Date) => {
      return checkChannelAvailability(channelId, date)
    },
    []
  )

  // Get complete suggestions for a submission
  const getSuggestionsForSubmission = useCallback(
    async (sub: SubmissionData) => {
      const [date, channels] = await Promise.all([
        getBestSuggestedDate(),
        sub.expectedReach
          ? getChannelsForReachTarget(sub, sub.expectedReach)
          : getSuggestedChannels(sub),
      ])

      const totalEstimatedReach = channels.reduce(
        (sum, c) => sum + c.estimatedReach,
        0
      )

      return {
        date,
        channels,
        totalEstimatedReach,
      }
    },
    []
  )

  return {
    suggestedDates,
    bestDate,
    loadingDates,
    refetchDates,
    suggestedChannels,
    loadingChannels,
    refetchChannels,
    checkDateAvailable,
    checkChannelAvailable,
    getSuggestionsForSubmission,
  }
}
