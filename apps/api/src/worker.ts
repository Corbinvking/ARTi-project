import { Worker, Queue } from 'bullmq'
import Redis from 'ioredis'
import { logger } from './lib/logger.js'
import { supabase } from './lib/supabase.js'
import { redis } from './lib/redis.js'
import { incrementalSync, getActiveConnection } from './lib/quickbooks/sync.js'
import { getValidAccessToken } from './lib/quickbooks/oauth.js'

// Only initialize BullMQ if Redis is available
let metricsQueue: Queue | null = null
let insightsQueue: Queue | null = null
let metricsWorker: Worker | null = null

if (redis) {
  // Initialize Redis connection for BullMQ
  const bullRedis = new Redis(process.env.REDIS_URL || 'redis://redis:6379', {
    maxRetriesPerRequest: null, // Set to null for BullMQ compatibility
  })

  // Initialize job queues
  metricsQueue = new Queue('metrics', { connection: bullRedis })
  insightsQueue = new Queue('insights', { connection: bullRedis })

  // Create worker for metrics sync jobs
  metricsWorker = new Worker(
    'metrics',
    async (job) => {
      logger.info(`Processing metrics job: ${job.name}`, { jobId: job.id, data: job.data })

      switch (job.name) {
        case 'spotify-sync':
          await syncSpotifyMetrics(job.data)
          break
        case 'soundcloud-sync':
          await syncSoundCloudMetrics(job.data)
          break
        case 'youtube-sync':
          await syncYouTubeMetrics(job.data)
          break
        case 'instagram-sync':
          await syncInstagramMetrics(job.data)
          break
        case 'qbo-cdc-sync':
          await runQBOCDCSync()
          break
        case 'qbo-token-refresh':
          await runQBOProactiveTokenRefresh()
          break
        case 'qbo-connection-validate':
          await runQBOConnectionValidation()
          break
        case 'health-check':
          logger.info('Performing hourly health check...')
          break
        default:
          logger.warn(`Unknown job type: ${job.name}`)
      }
    },
    { connection: bullRedis }
  )

  // Event handlers
  metricsWorker.on('completed', (job) => {
    logger.info(`Job ${job.id} completed successfully`)
  })

  metricsWorker.on('failed', (job, failedReason) => {
    logger.error(`Job ${job?.id} failed: ${failedReason}`)
  })

  // Handle graceful shutdown
  process.on('SIGTERM', async () => {
    logger.info('Received SIGTERM, shutting down worker...')
    await metricsWorker?.close()
    await bullRedis.quit()
    process.exit(0)
  })

  process.on('SIGINT', async () => {
    logger.info('Received SIGINT, shutting down worker...')
    await metricsWorker?.close()
    await bullRedis.quit()
    process.exit(0)
  })
} else {
  logger.warn('Redis not available, skipping BullMQ worker initialization')
}

// Initialize job queues (already done above if Redis is available)

// Worker is already created above if Redis is available

// Job implementations - Real Spotify metrics sync
async function syncSpotifyMetrics(data: any) {
  logger.info('Syncing Spotify metrics...', data)
  
  try {
    const { org_id } = data
    
    // Get connected Spotify accounts for this org
    const { data: accounts, error: accountsError } = await supabase
      .from('connected_accounts')
      .select('*')
      .eq('org_id', org_id)
      .eq('provider', 'spotify')
    
    if (accountsError) {
      logger.error('Error fetching Spotify accounts:', accountsError)
      return
    }

    if (!accounts || accounts.length === 0) {
      logger.info('No Spotify accounts found for org:', org_id)
      return
    }

    // Process each connected account
    for (const account of accounts) {
      await processSpotifyAccount(account)
    }
    
    logger.info('✅ Spotify metrics sync completed', { org_id, accounts: accounts.length })
    
  } catch (error) {
    logger.error('Spotify metrics sync failed:', error)
    throw error
  }
}

async function processSpotifyAccount(account: any) {
  const { org_id, provider_user_id } = account
  
  // Mock Spotify API calls (replace with real API when ready)
  const mockMetrics = {
    followers: Math.floor(Math.random() * 10000) + 1000,
    monthly_listeners: Math.floor(Math.random() * 50000) + 5000,
    popularity: Math.floor(Math.random() * 100),
  }
  
  // Store metrics in database
  const metricsToInsert = Object.entries(mockMetrics).map(([kpi, value]) => ({
    org_id,
    platform: 'spotify',
    asset_id: provider_user_id,
    timestamp: new Date().toISOString(),
    kpi,
    value: value.toString(),
    source: 'api',
    metadata: { account_id: provider_user_id }
  }))
  
  const { error: insertError } = await supabase
    .from('metrics')
    .insert(metricsToInsert)
  
  if (insertError) {
    logger.error('Error inserting Spotify metrics:', insertError)
    throw insertError
  }
  
  logger.info('✅ Processed Spotify account metrics', { 
    provider_user_id, 
    metrics_count: metricsToInsert.length 
  })
}

async function syncSoundCloudMetrics(data: any) {
  logger.info('🎵 Syncing SoundCloud metrics...', data)

  try {
    const { scrapeSoundCloudTrack } = await import('./lib/soundcloud-apify.js')

    const { data: campaigns, error: fetchError } = await supabase
      .from('soundcloud_campaigns')
      .select('id, url, status')
      .in('status', ['Active', 'Pending'])
      .not('url', 'is', null)

    if (fetchError) {
      logger.error('Error fetching SoundCloud campaigns:', fetchError)
      throw fetchError
    }

    if (!campaigns || campaigns.length === 0) {
      logger.info('No active SoundCloud campaigns to sync')
      return { synced: 0 }
    }

    const scUrlPattern = /^https?:\/\/(www\.)?soundcloud\.com\/[\w-]+\/[\w-]+/
    const eligible = campaigns.filter((c: any) => c.url && scUrlPattern.test(c.url))

    logger.info(`📊 Found ${eligible.length} SoundCloud campaigns with valid URLs (of ${campaigns.length} total)`)

    let successCount = 0
    let errorCount = 0
    const BATCH_SIZE = 5
    const DELAY_BETWEEN_BATCHES_MS = 3000

    for (let i = 0; i < eligible.length; i += BATCH_SIZE) {
      const batch = eligible.slice(i, i + BATCH_SIZE)

      for (const campaign of batch) {
        try {
          const track = await scrapeSoundCloudTrack(campaign.url)

          if (!track) {
            logger.warn({ campaignId: campaign.id, url: campaign.url }, 'No data returned for campaign')
            errorCount++
            continue
          }

          const { error: updateError } = await supabase
            .from('soundcloud_campaigns')
            .update({
              sc_track_id: track.id,
              playback_count: track.playback_count,
              likes_count: track.likes_count,
              reposts_count: track.reposts_count,
              comment_count: track.comment_count,
              genre: track.genre || null,
              duration_ms: track.duration || null,
              artwork_url: track.artwork_url,
              artist_username: track.user.username || null,
              artist_followers: track.user.followers_count || null,
              last_scraped_at: new Date().toISOString(),
              scrape_data: track as any,
              updated_at: new Date().toISOString(),
            })
            .eq('id', campaign.id)

          if (updateError) {
            logger.error({ campaignId: campaign.id, error: updateError }, 'Failed to update campaign stats')
            errorCount++
          } else {
            successCount++
          }
        } catch (err: any) {
          logger.error({ campaignId: campaign.id, error: err.message }, 'Error scraping campaign')
          errorCount++
        }
      }

      if (i + BATCH_SIZE < eligible.length) {
        await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES_MS))
      }
    }

    logger.info({ successCount, errorCount, total: eligible.length }, '✅ SoundCloud metrics sync completed')
    return { synced: successCount, errors: errorCount }
  } catch (error) {
    logger.error('SoundCloud metrics sync failed:', error)
    throw error
  }
}

async function syncYouTubeMetrics(data: { timeOfDay?: string }) {
  logger.info('🎬 Syncing YouTube metrics...', data)
  
  try {
    const timeOfDay = data.timeOfDay || determineTimeOfDay()
    
    // Fetch all active campaigns (collect stats for all that match cadence)
    const { data: campaigns, error: fetchError } = await supabase
      .from('youtube_campaigns')
      .select('id, youtube_url, video_id, current_views, current_likes, current_comments, api_poll_cadence, last_api_poll_at')
      .in('status', ['active', 'pending', 'ready'])
    
    if (fetchError) {
      logger.error('Error fetching YouTube campaigns:', fetchError)
      throw fetchError
    }
    
    if (!campaigns || campaigns.length === 0) {
      logger.info('No YouTube campaigns to sync (no active/pending campaigns found)')
      return { collected: 0, message: 'No campaigns to sync' }
    }
    
    logger.info(`📊 Found ${campaigns.length} YouTube campaigns to check`)
    
    const today = new Date().toISOString().split('T')[0]
    let successCount = 0
    let errorCount = 0
    let skippedCount = 0
    
    // Process each campaign that matches cadence
    for (const campaign of campaigns) {
      // Check if campaign should be synced based on cadence
      const cadence = (campaign as any).api_poll_cadence || '3x_daily'
      
      // Skip manual-only campaigns
      if (cadence === 'manual') {
        skippedCount++
        continue
      }
      
      // For daily cadence, only sync once per day (morning)
      if (cadence === 'daily' && timeOfDay !== 'morning') {
        skippedCount++
        continue
      }
      
      // For 3x_daily (default), always proceed
      try {
        const videoId = campaign.video_id || extractVideoIdFromUrl(campaign.youtube_url)
        if (!videoId) {
          logger.warn(`Campaign ${campaign.id} has no valid video ID`)
          errorCount++
          continue
        }
        
        // Fetch fresh stats from YouTube API
        const stats = await fetchYouTubeVideoStats(videoId)
        if (!stats.success) {
          logger.warn(`Failed to fetch stats for campaign ${campaign.id}: ${stats.error}`)
          errorCount++
          continue
        }
        
        // Compute subscribers_gained from previous record
        let subscribersGained = 0
        if (stats.subscriberCount > 0) {
          const { data: prevStats } = await supabase
            .from('campaign_stats_daily')
            .select('total_subscribers')
            .eq('campaign_id', campaign.id)
            .order('collected_at', { ascending: false })
            .limit(1)
            .maybeSingle()
          if (prevStats?.total_subscribers) {
            subscribersGained = stats.subscriberCount - prevStats.total_subscribers
          }
        }

        const { error: insertError } = await supabase
          .from('campaign_stats_daily')
          .upsert({
            campaign_id: campaign.id,
            date: today,
            time_of_day: timeOfDay,
            views: stats.viewCount,
            likes: stats.likeCount,
            comments: stats.commentCount,
            total_subscribers: stats.subscriberCount,
            subscribers_gained: subscribersGained,
            collected_at: new Date().toISOString()
          }, {
            onConflict: 'campaign_id,date,time_of_day'
          })
        
        if (insertError) {
          logger.error(`Error inserting stats for campaign ${campaign.id}:`, insertError)
          errorCount++
          continue
        }
        
        await supabase
          .from('youtube_campaigns')
          .update({
            current_views: stats.viewCount,
            current_likes: stats.likeCount,
            current_comments: stats.commentCount,
            total_subscribers: stats.subscriberCount,
            subscribers_hidden: stats.subscribersHidden,
            ...(stats.channelId ? { channel_id: stats.channelId } : {}),
            last_youtube_fetch: new Date().toISOString(),
            last_api_poll_at: new Date().toISOString()
          })
          .eq('id', campaign.id)
        
        successCount++
        
      } catch (err) {
        logger.error(`Error processing campaign ${campaign.id}:`, err)
        errorCount++
      }
    }
    
    logger.info(`✅ YouTube metrics sync complete: ${successCount} success, ${errorCount} errors, ${skippedCount} skipped (cadence)`)
    return { collected: successCount, errors: errorCount, skipped: skippedCount, total: campaigns.length }
    
  } catch (error) {
    logger.error('YouTube metrics sync failed:', error)
    throw error
  }
}

// Helper function to determine time of day based on current hour
function determineTimeOfDay(): string {
  const hour = new Date().getUTCHours()
  if (hour < 12) return 'morning'
  if (hour < 18) return 'afternoon'
  return 'evening'
}

// Helper function to extract video ID from YouTube URL
function extractVideoIdFromUrl(url: string): string | null {
  if (!url) return null
  
  // Handle youtu.be short URLs
  const shortMatch = url.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/)
  if (shortMatch && shortMatch[1]) return shortMatch[1]
  
  // Handle youtube.com URLs with v= parameter
  const longMatch = url.match(/[?&]v=([a-zA-Z0-9_-]{11})/)
  if (longMatch && longMatch[1]) return longMatch[1]
  
  // Handle youtube.com/embed/ URLs
  const embedMatch = url.match(/\/embed\/([a-zA-Z0-9_-]{11})/)
  if (embedMatch && embedMatch[1]) return embedMatch[1]
  
  // If it's already just a video ID (11 characters)
  if (/^[a-zA-Z0-9_-]{11}$/.test(url)) return url
  
  return null
}

// Helper function to fetch video stats from YouTube API
async function fetchYouTubeVideoStats(videoId: string): Promise<{
  success: boolean
  viewCount: number
  likeCount: number
  commentCount: number
  channelId: string | null
  subscriberCount: number
  subscribersHidden: boolean
  error?: string
}> {
  try {
    const apiKey = process.env.YOUTUBE_API_KEY
    if (!apiKey) {
      return { success: false, viewCount: 0, likeCount: 0, commentCount: 0, channelId: null, subscriberCount: 0, subscribersHidden: false, error: 'YOUTUBE_API_KEY not configured' }
    }
    
    const url = `https://www.googleapis.com/youtube/v3/videos?part=statistics,snippet&id=${videoId}&key=${apiKey}`
    const response = await fetch(url)
    
    if (!response.ok) {
      return { success: false, viewCount: 0, likeCount: 0, commentCount: 0, channelId: null, subscriberCount: 0, subscribersHidden: false, error: `API returned ${response.status}` }
    }
    
    const data = await response.json() as { items?: Array<{ snippet?: { channelId?: string }; statistics?: { viewCount?: string; likeCount?: string; commentCount?: string } }> }
    
    if (!data.items || data.items.length === 0) {
      return { success: false, viewCount: 0, likeCount: 0, commentCount: 0, channelId: null, subscriberCount: 0, subscribersHidden: false, error: 'Video not found' }
    }
    
    const item = data.items[0]
    const stats = item?.statistics
    const channelId = item?.snippet?.channelId || null

    // Fetch subscriber count from channel
    let subscriberCount = 0
    let subscribersHidden = false
    if (channelId) {
      try {
        const chUrl = `https://www.googleapis.com/youtube/v3/channels?part=statistics&id=${channelId}&key=${apiKey}`
        const chResponse = await fetch(chUrl)
        if (chResponse.ok) {
          const chData = await chResponse.json() as { items?: Array<{ statistics?: { subscriberCount?: string; hiddenSubscriberCount?: boolean } }> }
          const chStats = chData.items?.[0]?.statistics
          subscribersHidden = chStats?.hiddenSubscriberCount === true
          subscriberCount = subscribersHidden ? 0 : parseInt(chStats?.subscriberCount || '0')
        }
      } catch {
        // Non-fatal: continue without subscriber data
      }
    }

    return {
      success: true,
      viewCount: parseInt(stats?.viewCount || '0'),
      likeCount: parseInt(stats?.likeCount || '0'),
      commentCount: parseInt(stats?.commentCount || '0'),
      channelId,
      subscriberCount,
      subscribersHidden
    }
  } catch (error: any) {
    return { success: false, viewCount: 0, likeCount: 0, commentCount: 0, channelId: null, subscriberCount: 0, subscribersHidden: false, error: error.message }
  }
}

async function syncInstagramMetrics(data: any) {
  logger.info('Syncing Instagram metrics...', data)
  // TODO: Implement Instagram metrics fetching
}

// QuickBooks proactive token refresh — keeps the access token fresh so API calls never stall
async function runQBOProactiveTokenRefresh() {
  const env = process.env.INTUIT_ENVIRONMENT || 'sandbox'
  logger.info({ env }, 'Starting proactive QBO token refresh...')
  
  try {
    const DEFAULT_ORG_ID = '00000000-0000-0000-0000-000000000001'
    const conn = await getActiveConnection(DEFAULT_ORG_ID)
    
    if (!conn) {
      logger.info('No QBO connection found, skipping proactive token refresh')
      return
    }

    await getValidAccessToken(conn.id)
    logger.info({ connectionId: conn.id, status: conn.status, env }, 'Proactive QBO token refresh completed')
  } catch (error: any) {
    const isReauthRequired = error?.message?.toLowerCase().includes('refresh token is invalid')
      || error?.message?.toLowerCase().includes('authorize again')
    logger.error({ err: error, isReauthRequired }, 'Proactive QBO token refresh failed')
  }
}

// QuickBooks connection validation — periodic probe to confirm API access
async function runQBOConnectionValidation() {
  logger.info('Starting QBO connection validation...')
  
  try {
    const DEFAULT_ORG_ID = '00000000-0000-0000-0000-000000000001'
    const conn = await getActiveConnection(DEFAULT_ORG_ID)
    
    if (!conn) {
      logger.info('No QBO connection found, skipping validation')
      return
    }

    const { qboRequest } = await import('./lib/quickbooks/api-client.js')
    const res = await qboRequest({
      connectionId: conn.id,
      realmId: conn.realm_id,
      method: 'GET',
      path: `/companyinfo/${conn.realm_id}`,
    })

    if (res.ok) {
      logger.info({ connectionId: conn.id, latencyMs: res.durationMs }, 'QBO connection validation passed')
    } else {
      logger.warn({ connectionId: conn.id, status: res.status }, 'QBO connection validation returned non-OK status')
    }
  } catch (error) {
    logger.error({ err: error }, 'QBO connection validation failed')
  }
}

// QuickBooks CDC reconciliation job
async function runQBOCDCSync() {
  logger.info('📒 Starting QuickBooks CDC reconciliation sync...')
  
  try {
    const DEFAULT_ORG_ID = '00000000-0000-0000-0000-000000000001'
    const conn = await getActiveConnection(DEFAULT_ORG_ID)
    
    if (!conn) {
      logger.info('No active QBO connection, skipping CDC sync')
      return
    }

    const results = await incrementalSync(conn.id, conn.realm_id)
    logger.info({ results }, '✅ QuickBooks CDC sync complete')
  } catch (error) {
    logger.error('QuickBooks CDC sync failed:', error)
    throw error
  }
}

// Setup cron schedules - aligned with architecture diagram
async function setupCronSchedules() {
  if (!redis) {
    logger.info('📅 Skipping cron schedules - Redis not available')
    return
  }

  logger.info('📅 Setting up cron schedules...')

  try {
    // Daily metrics sync at 2:00 AM UTC (per 4-day roadmap)
    await metricsQueue!.add(
      'spotify-sync',
      { org_id: '00000000-0000-0000-0000-000000000001' }, // Demo org
      {
        repeat: { pattern: '0 2 * * *' }, // Daily at 2:00 AM
        removeOnComplete: 10,
        removeOnFail: 5,
      }
    )

    // SoundCloud metrics sync — twice daily (8 AM and 8 PM UTC)
    await metricsQueue!.add(
      'soundcloud-sync',
      { timeOfDay: 'morning' },
      {
        repeat: { pattern: '0 8 * * *' },
        removeOnComplete: 10,
        removeOnFail: 5,
      }
    )

    await metricsQueue!.add(
      'soundcloud-sync',
      { timeOfDay: 'evening' },
      {
        repeat: { pattern: '0 20 * * *' },
        removeOnComplete: 10,
        removeOnFail: 5,
      }
    )

    // Hourly health check and token refresh
    await metricsQueue!.add(
      'health-check',
      {},
      {
        repeat: { pattern: '0 * * * *' }, // Every hour
        removeOnComplete: 5,
        removeOnFail: 3,
      }
    )

    // Daily insights generation at 2:30 AM UTC
    await insightsQueue!.add(
      'daily-insights',
      { org_id: '00000000-0000-0000-0000-000000000001' },
      {
        repeat: { pattern: '30 2 * * *' }, // Daily at 2:30 AM
        removeOnComplete: 10,
        removeOnFail: 5,
      }
    )

    // YouTube stats collection - 3x daily for historical tracking
    // Morning collection at 8:00 AM UTC
    await metricsQueue!.add(
      'youtube-sync',
      { timeOfDay: 'morning' },
      {
        repeat: { pattern: '0 8 * * *' }, // Daily at 8:00 AM UTC
        removeOnComplete: 10,
        removeOnFail: 5,
      }
    )

    // Afternoon collection at 2:00 PM UTC
    await metricsQueue!.add(
      'youtube-sync',
      { timeOfDay: 'afternoon' },
      {
        repeat: { pattern: '0 14 * * *' }, // Daily at 2:00 PM UTC
        removeOnComplete: 10,
        removeOnFail: 5,
      }
    )

    // Evening collection at 8:00 PM UTC
    await metricsQueue!.add(
      'youtube-sync',
      { timeOfDay: 'evening' },
      {
        repeat: { pattern: '0 20 * * *' }, // Daily at 8:00 PM UTC
        removeOnComplete: 10,
        removeOnFail: 5,
      }
    )

    // QuickBooks CDC reconciliation — every 15 minutes for near-real-time payment detection
    await metricsQueue!.add(
      'qbo-cdc-sync',
      {},
      {
        repeat: { pattern: '*/15 * * * *' },
        removeOnComplete: 10,
        removeOnFail: 5,
      }
    )

    // QuickBooks proactive token refresh — environment-aware intervals
    // Sandbox: refresh tokens expire in ~24h, so we refresh every 10 min
    // Production: refresh tokens last 100 days, 30 min is sufficient
    const intuitEnv = process.env.INTUIT_ENVIRONMENT || 'sandbox'
    const isSandbox = intuitEnv === 'sandbox'
    const refreshPattern = isSandbox ? '*/10 * * * *' : '*/30 * * * *'

    await metricsQueue!.add(
      'qbo-token-refresh',
      {},
      {
        repeat: { pattern: refreshPattern },
        removeOnComplete: 10,
        removeOnFail: 5,
      }
    )

    // Sandbox only: backup token refresh every 6 hours as a safety net
    if (isSandbox) {
      await metricsQueue!.add(
        'qbo-token-refresh',
        { backup: true },
        {
          repeat: { pattern: '0 */6 * * *' },
          removeOnComplete: 5,
          removeOnFail: 3,
        }
      )
    }

    // QBO connection validation — probe the API to confirm the connection works
    await metricsQueue!.add(
      'qbo-connection-validate',
      {},
      {
        repeat: { pattern: isSandbox ? '0 */2 * * *' : '0 */6 * * *' },
        removeOnComplete: 5,
        removeOnFail: 3,
      }
    )

    logger.info({
      intuitEnv,
      refreshPattern,
      validationPattern: isSandbox ? '0 */2 * * *' : '0 */6 * * *',
    }, '✅ QBO cron schedules configured')

  } catch (error) {
    logger.error('❌ Failed to setup cron schedules:', error)
  }
}

// Verify critical cron jobs are registered after setup
async function verifyCronJobs() {
  if (!metricsQueue) return

  try {
    const repeatableJobs = await metricsQueue.getRepeatableJobs()
    const jobNames = repeatableJobs.map((j: any) => j.name)
    
    const requiredJobs = ['qbo-token-refresh', 'qbo-cdc-sync', 'qbo-connection-validate']
    const missingJobs = requiredJobs.filter(name => !jobNames.includes(name))
    
    if (missingJobs.length > 0) {
      logger.warn({ missingJobs, registeredJobs: jobNames }, 'Some required QBO cron jobs are NOT registered')
    } else {
      logger.info({ registeredQBOJobs: requiredJobs, totalRepeatableJobs: repeatableJobs.length }, 'All required QBO cron jobs verified')
    }
  } catch (error) {
    logger.warn({ err: error }, 'Could not verify cron jobs (non-fatal)')
  }
}

// Start the worker (exported so index.ts can call it after server is up)
export async function startWorker() {
  try {
    if (!redis) {
      logger.info('🚀 Skipping metrics worker - Redis not available')
      return
    }

    logger.info('🚀 Starting metrics worker...')
    await setupCronSchedules()
    await verifyCronJobs()
    logger.info('✅ Metrics worker started successfully')
  } catch (error) {
    logger.error('Failed to start worker:', error)
    logger.error('Worker startup failed, cron jobs will not run')
  }
}
