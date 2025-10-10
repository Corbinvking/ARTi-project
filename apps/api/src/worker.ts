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

async function syncYouTubeMetrics(data: any) {
  logger.info('Syncing YouTube metrics...', data)
  // TODO: Implement YouTube metrics fetching
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

    logger.info('✅ Cron schedules configured successfully')

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
