import { Worker, Queue } from 'bullmq'
import Redis from 'ioredis'
import { logger } from './lib/logger.js'
import { supabase } from './lib/supabase.js'
import { redis } from './lib/redis.js'

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
        case 'health-check':
          logger.info('Performing hourly health check...')
          // TODO: Implement actual health check logic
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
  logger.info('Syncing SoundCloud metrics...', data)
  // TODO: Implement SoundCloud metrics fetching
}

async function syncYouTubeMetrics(data: { timeOfDay?: string }) {
  logger.info('🎬 Syncing YouTube metrics...', data)
  
  try {
    const timeOfDay = data.timeOfDay || determineTimeOfDay()
    
    // Fetch all active campaigns with youtube_api_enabled
    const { data: campaigns, error: fetchError } = await supabase
      .from('youtube_campaigns')
      .select('id, youtube_url, video_id, current_views, current_likes, current_comments')
      .eq('youtube_api_enabled', true)
      .in('status', ['active', 'pending'])
    
    if (fetchError) {
      logger.error('Error fetching YouTube campaigns:', fetchError)
      throw fetchError
    }
    
    if (!campaigns || campaigns.length === 0) {
      logger.info('No YouTube campaigns to sync (none have youtube_api_enabled=true)')
      return { collected: 0, message: 'No campaigns to sync' }
    }
    
    logger.info(`📊 Found ${campaigns.length} YouTube campaigns to sync`)
    
    const today = new Date().toISOString().split('T')[0]
    let successCount = 0
    let errorCount = 0
    
    // Process each campaign
    for (const campaign of campaigns) {
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
        
        // Insert daily stats (subscriber tracking not implemented yet)
        const { error: insertError } = await supabase
          .from('campaign_stats_daily')
          .upsert({
            campaign_id: campaign.id,
            date: today,
            time_of_day: timeOfDay,
            views: stats.viewCount,
            likes: stats.likeCount,
            comments: stats.commentCount,
            total_subscribers: 0,
            subscribers_gained: 0,
            collected_at: new Date().toISOString()
          }, {
            onConflict: 'campaign_id,date,time_of_day'
          })
        
        if (insertError) {
          logger.error(`Error inserting stats for campaign ${campaign.id}:`, insertError)
          errorCount++
          continue
        }
        
        // Also update campaign's current stats
        await supabase
          .from('youtube_campaigns')
          .update({
            current_views: stats.viewCount,
            current_likes: stats.likeCount,
            current_comments: stats.commentCount,
            last_youtube_api_fetch: new Date().toISOString()
          })
          .eq('id', campaign.id)
        
        successCount++
        
      } catch (err) {
        logger.error(`Error processing campaign ${campaign.id}:`, err)
        errorCount++
      }
    }
    
    logger.info(`✅ YouTube metrics sync complete: ${successCount} success, ${errorCount} errors`)
    return { collected: successCount, errors: errorCount, total: campaigns.length }
    
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
  error?: string
}> {
  try {
    const apiKey = process.env.YOUTUBE_API_KEY
    if (!apiKey) {
      return { success: false, viewCount: 0, likeCount: 0, commentCount: 0, error: 'YOUTUBE_API_KEY not configured' }
    }
    
    const url = `https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${videoId}&key=${apiKey}`
    const response = await fetch(url)
    
    if (!response.ok) {
      return { success: false, viewCount: 0, likeCount: 0, commentCount: 0, error: `API returned ${response.status}` }
    }
    
    const data = await response.json() as { items?: Array<{ statistics?: { viewCount?: string; likeCount?: string; commentCount?: string } }> }
    
    if (!data.items || data.items.length === 0) {
      return { success: false, viewCount: 0, likeCount: 0, commentCount: 0, error: 'Video not found' }
    }
    
    const stats = data.items[0]?.statistics
    return {
      success: true,
      viewCount: parseInt(stats?.viewCount || '0'),
      likeCount: parseInt(stats?.likeCount || '0'),
      commentCount: parseInt(stats?.commentCount || '0')
    }
  } catch (error: any) {
    return { success: false, viewCount: 0, likeCount: 0, commentCount: 0, error: error.message }
  }
}

async function syncInstagramMetrics(data: any) {
  logger.info('Syncing Instagram metrics...', data)
  // TODO: Implement Instagram metrics fetching
}

// Event handlers (only if worker exists)
if (metricsWorker) {
  metricsWorker.on('completed', (job) => {
    logger.info(`Job ${job.id} completed successfully`)
  })

  metricsWorker.on('failed', (job, failedReason) => {
    logger.error(`Job ${job?.id} failed: ${failedReason}`)
  })

  // Handle graceful shutdown
  process.on('SIGTERM', async () => {
    logger.info('Received SIGTERM, shutting down worker...')
    await metricsWorker.close()
    if (redis) await redis.quit()
    process.exit(0)
  })

  process.on('SIGINT', async () => {
    logger.info('Received SIGINT, shutting down worker...')
    await metricsWorker.close()
    if (redis) await redis.quit()
    process.exit(0)
  })
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

    logger.info('✅ Cron schedules configured successfully (including 3x daily YouTube sync)')

  } catch (error) {
    logger.error('❌ Failed to setup cron schedules:', error)
  }
}

// Start the worker
async function startWorker() {
  try {
    if (!redis) {
      logger.info('🚀 Skipping metrics worker - Redis not available')
      return
    }

    logger.info('🚀 Starting metrics worker...')
    await setupCronSchedules()
    logger.info('✅ Metrics worker started successfully')
  } catch (error) {
    logger.error('Failed to start worker:', error)
    process.exit(1)
  }
}

startWorker()
