import { useState, useEffect } from 'react'
import { supabase } from '../integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'

interface IntegrationAccount {
  id: string
  platform: string
  handle: string
  follower_count: number
  status: 'linked' | 'reconnect' | 'disconnected' | 'error'
  last_synced_at: string | null
  connection_data: any
}

interface IntegrationStatus {
  id: string
  account_handle: string
  platform: string
  status: 'linked' | 'reconnect' | 'disconnected' | 'error'
  last_check_at: string | null
  last_success_at: string | null
  error_count: number
  last_error_message: string | null
}

export const useIntegrations = (memberId?: string) => {
  const { toast } = useToast()
  const [accounts, setAccounts] = useState<IntegrationAccount[]>([])
  const [statuses, setStatuses] = useState<IntegrationStatus[]>([])
  const [loading, setLoading] = useState(true)

  const fetchIntegrations = async () => {
    if (!memberId) return
    
    try {
      setLoading(true)

      // Fetch member accounts
      const { data: accountsData, error: accountsError } = await supabase
        .from('member_accounts')
        .select('*')
        .eq('member_id', memberId)

      if (accountsError) throw accountsError

      // Fetch integration statuses
      const { data: statusesData, error: statusesError } = await supabase
        .from('integration_status')
        .select('*')
        .in('member_account_id', accountsData?.map(acc => acc.id) || [])

      if (statusesError) throw statusesError

      setAccounts(accountsData || [])
      setStatuses(statusesData || [])

    } catch (error: any) {
      console.error('Error fetching integrations:', error)
      toast({
        title: "Error",
        description: "Failed to load integrations",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const connectSoundCloud = async (soundcloudUrl: string) => {
    if (!memberId) return false

    try {
      const { data, error } = await supabase.functions.invoke('analyze-soundcloud-profile', {
        body: {
          url: soundcloudUrl,
          member_id: memberId
        }
      })

      if (error) throw error

      if (data?.success) {
        toast({
          title: "Success",
          description: "SoundCloud account connected successfully",
        })
        await fetchIntegrations()
        return true
      } else {
        throw new Error(data?.error || 'Failed to connect SoundCloud account')
      }
    } catch (error: any) {
      console.error('Error connecting SoundCloud:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to connect SoundCloud account",
        variant: "destructive",
      })
      return false
    }
  }

  const disconnectAccount = async (accountId: string) => {
    try {
      const { error } = await supabase
        .from('member_accounts')
        .update({ status: 'disconnected' })
        .eq('id', accountId)

      if (error) throw error

      toast({
        title: "Success",
        description: "Account disconnected successfully",
      })
      await fetchIntegrations()
      return true
    } catch (error: any) {
      console.error('Error disconnecting account:', error)
      toast({
        title: "Error",
        description: "Failed to disconnect account",
        variant: "destructive",
      })
      return false
    }
  }

  const syncAccount = async (accountId: string) => {
    try {
      // Get account details
      const account = accounts.find(acc => acc.id === accountId)
      if (!account) throw new Error('Account not found')

      if (account.platform === 'soundcloud') {
        // Re-analyze the SoundCloud profile
        const member = await supabase
          .from('members')
          .select('soundcloud_url')
          .eq('id', memberId)
          .single()

        if (member.data?.soundcloud_url) {
          await connectSoundCloud(member.data.soundcloud_url)
        }
      }

      return true
    } catch (error: any) {
      console.error('Error syncing account:', error)
      toast({
        title: "Error",
        description: "Failed to sync account",
        variant: "destructive",
      })
      return false
    }
  }

  useEffect(() => {
    fetchIntegrations()
  }, [memberId])

  return {
    accounts,
    statuses,
    loading,
    connectSoundCloud,
    disconnectAccount,
    syncAccount,
    refetch: fetchIntegrations
  }
}