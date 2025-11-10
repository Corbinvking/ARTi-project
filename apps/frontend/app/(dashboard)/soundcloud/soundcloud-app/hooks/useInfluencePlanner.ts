import { useState } from 'react'
import { supabase } from '../integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'

interface InfluencePlan {
  proposal_id: string
  supporters: SupporterProfile[]
  total_reach: number
  estimated_credits: number
  conflicts: string[]
  recommendations: string[]
}

interface SupporterProfile {
  member_id: string
  name: string
  handle: string
  followers: number
  estimated_reach: number
  compatibility_score: number
  credits_required: number
}

interface PlanRequest {
  submission_id?: string
  campaign_id?: string
  track_url?: string
  genres?: string[]
  target_reach?: number
  date?: string
}

export const useInfluencePlanner = () => {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [currentPlan, setCurrentPlan] = useState<InfluencePlan | null>(null)

  const createInfluencePlan = async (request: PlanRequest): Promise<InfluencePlan | null> => {
    try {
      setLoading(true)

      const { data, error } = await supabase.functions.invoke('influence-planner', {
        body: request
      })

      if (error) throw error

      if (data?.success) {
        const plan: InfluencePlan = {
          proposal_id: data.proposal_id,
          supporters: data.supporters,
          total_reach: data.total_reach,
          estimated_credits: data.estimated_credits,
          conflicts: data.conflicts || [],
          recommendations: data.recommendations || []
        }

        setCurrentPlan(plan)
        
        toast({
          title: "Success",
          description: `Influence plan created with ${plan.supporters.length} supporters`,
        })

        return plan
      } else {
        throw new Error(data?.error || 'Failed to create influence plan')
      }
    } catch (error: any) {
      console.error('Error creating influence plan:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to create influence plan",
        variant: "destructive",
      })
      return null
    } finally {
      setLoading(false)
    }
  }

  const executeInfluencePlan = async (proposalId: string, scheduledDate: string): Promise<boolean> => {
    try {
      setLoading(true)

      // Get the proposal details
      const { data: proposal, error: proposalError } = await supabase
        .from('target_proposals')
        .select('*')
        .eq('id', proposalId)
        .single()

      if (proposalError) throw proposalError

      const supporters = (proposal.proposed_targets as unknown) as SupporterProfile[]
      const schedules = []

      // Create schedule entries for each supporter
      for (const supporter of supporters) {
        const { data: memberAccount } = await supabase
          .from('member_accounts')
          .select('id')
          .eq('member_id', supporter.member_id)
          .eq('platform', 'soundcloud')
          .single()

        if (memberAccount) {
          schedules.push({
            parent_id: proposal.parent_id,
            parent_type: proposal.parent_type,
            member_account_id: memberAccount.id,
            target_handle: supporter.handle,
            scheduled_at: new Date(scheduledDate).toISOString(),
            status: 'pending',
            credits_allocated: supporter.credits_required
          })
        }
      }

      // Insert all schedules
      const { error: scheduleError } = await supabase
        .from('schedules')
        .insert(schedules)

      if (scheduleError) throw scheduleError

      // Update submission or campaign status if applicable
      if (proposal.parent_type === 'submission') {
        await supabase
          .from('submissions')
          .update({
            status: 'approved',
            support_date: scheduledDate,
            suggested_supporters: supporters.map(s => s.member_id)
          })
          .eq('id', proposal.parent_id)
      }

      toast({
        title: "Success",
        description: `Influence plan executed with ${schedules.length} scheduled supporters`,
      })

      return true
    } catch (error: any) {
      console.error('Error executing influence plan:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to execute influence plan",
        variant: "destructive",
      })
      return false
    } finally {
      setLoading(false)
    }
  }

  const getProposalHistory = async (parentId: string, parentType: string = 'submission') => {
    try {
      const { data, error } = await supabase
        .from('target_proposals')
        .select('*')
        .eq('parent_id', parentId)
        .eq('parent_type', parentType)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data || []
    } catch (error: any) {
      console.error('Error fetching proposal history:', error)
      return []
    }
  }

  return {
    loading,
    currentPlan,
    createInfluencePlan,
    executeInfluencePlan,
    getProposalHistory,
    clearCurrentPlan: () => setCurrentPlan(null)
  }
}