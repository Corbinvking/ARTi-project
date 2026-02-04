import { supabase } from "../integrations/supabase/client"
import { addDays, format, isSameDay, startOfDay } from "date-fns"

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

// ============================================================================
// DATE SUGGESTION SYSTEM
// ============================================================================

/**
 * Get suggested scheduling dates for a submission
 * Considers: existing schedule load, channel availability, minimum lead time
 */
export const getSuggestedDates = async (
  minLeadDays: number = 14,
  maxLeadDays: number = 28,
  maxSlotsPerDay: number = 5
): Promise<DateSlot[]> => {
  const today = startOfDay(new Date())
  const startDate = addDays(today, minLeadDays)
  const endDate = addDays(today, maxLeadDays)

  // Fetch existing scheduled submissions in the date range
  const { data: existingSubmissions, error } = await supabase
    .from("submissions")
    .select("support_date")
    .gte("support_date", format(startDate, "yyyy-MM-dd"))
    .lte("support_date", format(endDate, "yyyy-MM-dd"))
    .in("status", ["ready", "active"])

  if (error) {
    console.error("Error fetching scheduled submissions:", error)
    return []
  }

  // Count submissions per date
  const dateCounts: Record<string, number> = {}
  existingSubmissions?.forEach((sub) => {
    if (sub.support_date) {
      dateCounts[sub.support_date] = (dateCounts[sub.support_date] || 0) + 1
    }
  })

  // Get available connected channels count
  const { count: availableChannels } = await supabase
    .from("members")
    .select("*", { count: "exact", head: true })
    .eq("influence_planner_status", "connected")

  const channelCount = availableChannels || 0

  // Generate date slots
  const dateSlots: DateSlot[] = []
  let currentDate = startDate

  while (currentDate <= endDate) {
    const dateStr = format(currentDate, "yyyy-MM-dd")
    const scheduledCount = dateCounts[dateStr] || 0
    const hasCapacity = scheduledCount < maxSlotsPerDay

    // Calculate score (higher is better)
    // Favor dates with fewer scheduled items and more lead time
    const loadScore = Math.max(0, (maxSlotsPerDay - scheduledCount) / maxSlotsPerDay)
    const dayOfWeek = currentDate.getDay()
    const weekdayBonus = dayOfWeek >= 1 && dayOfWeek <= 5 ? 0.1 : 0 // Slight preference for weekdays

    const score = loadScore + weekdayBonus

    dateSlots.push({
      date: new Date(currentDate),
      scheduledCount,
      availableChannels: channelCount,
      isIdeal: hasCapacity && loadScore > 0.5,
      score,
    })

    currentDate = addDays(currentDate, 1)
  }

  // Sort by score (highest first)
  return dateSlots.sort((a, b) => b.score - a.score)
}

/**
 * Get the single best suggested date
 */
export const getBestSuggestedDate = async (): Promise<Date | null> => {
  const slots = await getSuggestedDates()
  if (slots.length === 0) return null

  // Return the highest-scoring date
  return slots[0].date
}

// ============================================================================
// CHANNEL SUGGESTION SYSTEM
// ============================================================================

/**
 * Get suggested repost channels for a submission
 * Considers: genre match, size tier proximity, recent activity, connection status
 */
export const getSuggestedChannels = async (
  submission: SubmissionData,
  maxChannels: number = 10,
  repostLimitPerProfile: number = 2
): Promise<ChannelSuggestion[]> => {
  // Fetch all connected members
  const { data: members, error } = await supabase
    .from("members")
    .select(
      "id, name, soundcloud_handle, soundcloud_followers, size_tier, families, influence_planner_status, reach_factor"
    )
    .eq("influence_planner_status", "connected")
    .order("soundcloud_followers", { ascending: false })

  if (error || !members) {
    console.error("Error fetching members:", error)
    return []
  }

  // Score each member
  const suggestions: ChannelSuggestion[] = members.map((member) => {
    let score = 0
    const reasons: string[] = []

    // 1. Genre match scoring
    if (submission.family && member.families?.includes(submission.family)) {
      score += 30
      reasons.push(`Genre match: ${submission.family}`)
    }

    // 2. Size tier proximity scoring
    const tierOrder = ["T1", "T2", "T3", "T4"]
    if (submission.memberSizeTier && member.size_tier) {
      const submissionTierIndex = tierOrder.indexOf(submission.memberSizeTier)
      const memberTierIndex = tierOrder.indexOf(member.size_tier)
      const tierDiff = Math.abs(memberTierIndex - submissionTierIndex)

      if (tierDiff === 0) {
        score += 25
        reasons.push("Same size tier")
      } else if (tierDiff === 1) {
        score += 15
        reasons.push("Adjacent size tier")
      } else if (tierDiff === 2) {
        score += 5
        reasons.push("Moderate tier difference")
      }
      // No points for 3+ tier difference
    }

    // 3. Follower count scoring (higher followers = higher priority for paid campaigns)
    const followers = member.soundcloud_followers || 0
    const followerScore = Math.min(20, Math.log10(Math.max(1, followers)) * 5)
    score += followerScore
    if (followers >= 10000) {
      reasons.push(`High reach: ${(followers / 1000).toFixed(1)}k followers`)
    }

    // 4. Reach factor scoring (if available)
    const reachFactor = member.reach_factor || 0.06
    if (reachFactor > 0.08) {
      score += 10
      reasons.push("High engagement rate")
    }

    // Estimate reach for this channel
    const estimatedReach = Math.round(followers * reachFactor)

    return {
      member,
      score,
      reasons,
      estimatedReach,
    }
  })

  // Sort by score and take top N
  return suggestions
    .sort((a, b) => b.score - a.score)
    .slice(0, maxChannels)
}

/**
 * Get channels that meet the expected reach target
 */
export const getChannelsForReachTarget = async (
  submission: SubmissionData,
  targetReach: number,
  repostLimitPerProfile: number = 2
): Promise<ChannelSuggestion[]> => {
  const allSuggestions = await getSuggestedChannels(submission, 50, repostLimitPerProfile)

  // Greedily select channels until we hit the target reach
  const selectedChannels: ChannelSuggestion[] = []
  let currentReach = 0

  for (const suggestion of allSuggestions) {
    if (currentReach >= targetReach) break

    selectedChannels.push(suggestion)
    currentReach += suggestion.estimatedReach
  }

  return selectedChannels
}

// ============================================================================
// SCHEDULE AVAILABILITY CHECK
// ============================================================================

/**
 * Check if a specific date has availability
 */
export const checkDateAvailability = async (
  date: Date,
  maxSlotsPerDay: number = 5
): Promise<{ available: boolean; currentCount: number; maxSlots: number }> => {
  const dateStr = format(date, "yyyy-MM-dd")

  const { count, error } = await supabase
    .from("submissions")
    .select("*", { count: "exact", head: true })
    .eq("support_date", dateStr)
    .in("status", ["ready", "active"])

  if (error) {
    console.error("Error checking date availability:", error)
    return { available: false, currentCount: 0, maxSlots: maxSlotsPerDay }
  }

  const currentCount = count || 0

  return {
    available: currentCount < maxSlotsPerDay,
    currentCount,
    maxSlots: maxSlotsPerDay,
  }
}

/**
 * Check channel availability for a date (considering daily repost limits)
 */
export const checkChannelAvailability = async (
  channelId: string,
  date: Date,
  repostLimitPerProfile: number = 2
): Promise<{ available: boolean; currentCount: number; maxLimit: number }> => {
  const dateStr = format(date, "yyyy-MM-dd")

  // Check how many times this channel is already scheduled on this date
  // This would require checking the schedules table or selected_channels
  const { count, error } = await supabase
    .from("schedules")
    .select("*", { count: "exact", head: true })
    .eq("scheduled_at", dateStr)
    .eq("member_account_id", channelId)
    .in("status", ["pending", "scheduled"])

  if (error) {
    console.error("Error checking channel availability:", error)
    return { available: false, currentCount: 0, maxLimit: repostLimitPerProfile }
  }

  const currentCount = count || 0

  return {
    available: currentCount < repostLimitPerProfile,
    currentCount,
    maxLimit: repostLimitPerProfile,
  }
}
