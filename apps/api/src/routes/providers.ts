import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { supabase } from '../lib/supabase.js'

// interface ConnectRequest {
//   Body: {
//     provider: 'spotify' | 'instagram' | 'youtube' | 'soundcloud'
//   }
// }

interface MetricsRequest {
  Querystring: {
    asset_id?: string
    from?: string
    to?: string
    platform?: string
  }
}

export async function providersRoutes(fastify: FastifyInstance) {
  
  // Health check for providers
  fastify.get('/providers/health', async (_request: FastifyRequest, reply: FastifyReply) => {
    return reply.send({ 
      status: 'ok', 
      providers: ['spotify', 'instagram', 'youtube', 'soundcloud'] 
    })
  })

  // Get provider connections for org
  fastify.get('/providers/connections', {
    // preHandler: [fastify.requireAuth]
  }, async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      // const user = request.user!
      
      const { data: connections, error } = await supabase
        .from('connected_accounts')
        .select('provider, account_name, last_sync_at, created_at')
        // .eq('org_id', user.orgId)
        .order('created_at', { ascending: false })
      
      if (error) {
        throw error
      }
      
      return reply.send({
        connections: connections || []
      })
      
    } catch (error) {
      _request.log.error(error, 'Error fetching provider connections')
      return reply.code(500).send({ error: 'Failed to fetch connections' })
    }
  })

  // Spotify Provider Routes
  fastify.post('/providers/spotify/connect', {
    // preHandler: [fastify.requireAuth]
  }, async (_request: FastifyRequest, reply: FastifyReply) => {
    const authUrl = `https://accounts.spotify.com/authorize?response_type=code&client_id=${process.env.SPOTIFY_CLIENT_ID}&scope=user-read-private%20user-read-email%20playlist-read-private%20playlist-read-collaborative%20user-follow-read&redirect_uri=${process.env.SPOTIFY_REDIRECT_URI}&state=mock_state`
    return reply.send({
      auth_url: authUrl,
      message: 'Redirect to this URL to connect Spotify'
    })
  })

  fastify.get('/providers/spotify/callback', async (_request: FastifyRequest, reply: FastifyReply) => {
    // TODO: Implement OAuth callback handling
    return reply.redirect(`http://localhost:3000/spotify?status=success`)
  })

  fastify.post('/providers/spotify/sync', {
    // preHandler: [fastify.requireAuth]
  }, async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      // const user = request.user!
      
      // Add job to queue (imported from worker)
      // For now, return success message
      return reply.send({
        message: 'Spotify sync job queued successfully',
        provider: 'spotify',
        // org_id: user.orgId
      })
      
    } catch (error) {
      _request.log.error(error, 'Error queueing Spotify sync job')
      return reply.code(500).send({ error: 'Failed to queue sync job' })
    }
  })

  // Instagram Provider Routes (Placeholder)
  fastify.post('/providers/instagram/connect', {
    // preHandler: [fastify.requireAuth]
  }, async (_request: FastifyRequest, reply: FastifyReply) => {
    return reply.send({
      message: 'Instagram integration coming soon',
      status: 'not_implemented'
    })
  })

  // YouTube Provider Routes (Placeholder)
  fastify.post('/providers/youtube/connect', {
    // preHandler: [fastify.requireAuth]
  }, async (_request: FastifyRequest, reply: FastifyReply) => {
    return reply.send({
      message: 'YouTube integration coming soon',
      status: 'not_implemented'
    })
  })

  // SoundCloud Provider Routes (Placeholder)
  fastify.post('/providers/soundcloud/connect', {
    // preHandler: [fastify.requireAuth]
  }, async (_request: FastifyRequest, reply: FastifyReply) => {
    return reply.send({
      message: 'SoundCloud integration coming soon',
      status: 'not_implemented'
    })
  })

  // Spotify Scraper Routes (Playlist Data)
  fastify.post('/providers/spotify/scrape', {
    // preHandler: [fastify.requireAuth]
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // Import scraper service when needed to avoid startup issues
      const { SpotifyScraperService } = await import('../providers/spotify/scraper.js');
      const scraperService = new SpotifyScraperService();
      
      const { songUrls } = request.body as { songUrls: string[] };
      // const user = request.user!;
      const orgId = 'default_org'; // TODO: Get from authenticated user
      
      // Validate URLs
      const validUrls = songUrls.filter(url => 
        url.includes('artists.spotify.com') && url.includes('/song/')
      );

      if (validUrls.length === 0) {
        return reply.code(400).send({
          error: 'No valid Spotify song URLs provided',
          message: 'URLs must be from artists.spotify.com and contain /song/'
        });
      }

      const jobId = await scraperService.startScrapingJob(orgId, validUrls);

      return reply.send({
        success: true,
        jobId,
        songCount: validUrls.length,
        message: 'Scraping job started successfully'
      });

    } catch (error: any) {
      request.log.error(error, 'Failed to start scraping job');
      return reply.code(500).send({
        error: 'Failed to start scraping job',
        message: error.message
      });
    }
  })

  fastify.get('/providers/spotify/scrape/:jobId', {
    // preHandler: [fastify.requireAuth]
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { SpotifyScraperService } = await import('../providers/spotify/scraper.js');
      const scraperService = new SpotifyScraperService();
      
      const { jobId } = request.params as { jobId: string };
      // const user = request.user!;
      
      const job = scraperService.getJobStatus(jobId);

      if (!job) {
        return reply.code(404).send({
          error: 'Job not found',
          message: `No scraping job found with ID: ${jobId}`
        });
      }

      return reply.send({
        success: true,
        job: {
          id: job.id,
          status: job.status,
          songCount: job.songUrls.length,
          startedAt: job.startedAt,
          completedAt: job.completedAt,
          results: job.results ? {
            successful: job.results.filter(r => r.success).length,
            failed: job.results.filter(r => !r.success).length,
            details: job.results
          } : null,
          errorMessage: job.errorMessage
        }
      });

    } catch (error: any) {
      request.log.error(error, 'Failed to get job status');
      return reply.code(500).send({
        error: 'Failed to get job status',
        message: error.message
      });
    }
  })

  fastify.get('/providers/spotify/scrape', {
    // preHandler: [fastify.requireAuth]
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { SpotifyScraperService } = await import('../providers/spotify/scraper.js');
      const scraperService = new SpotifyScraperService();
      
      const { limit = 20, status } = request.query as { 
        limit?: number; 
        status?: 'pending' | 'running' | 'completed' | 'failed' 
      };
      // const user = request.user!;
      const orgId = 'default_org'; // TODO: Get from authenticated user

      let jobs = scraperService.getOrgJobs(orgId);

      // Filter by status if provided
      if (status) {
        jobs = jobs.filter(job => job.status === status);
      }

      // Apply limit
      jobs = jobs.slice(0, limit);

      const jobSummaries = jobs.map(job => ({
        id: job.id,
        status: job.status,
        songCount: job.songUrls.length,
        startedAt: job.startedAt,
        completedAt: job.completedAt,
        successCount: job.results?.filter(r => r.success).length || 0,
        failureCount: job.results?.filter(r => !r.success).length || 0,
        errorMessage: job.errorMessage
      }));

      return reply.send({
        success: true,
        jobs: jobSummaries,
        total: jobSummaries.length
      });

    } catch (error: any) {
      request.log.error(error, 'Failed to get organization jobs');
      return reply.code(500).send({
        error: 'Failed to get jobs',
        message: error.message
      });
    }
  })

  fastify.get('/providers/spotify/health', {
    // preHandler: [fastify.requireAuth]
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { SpotifyScraperService } = await import('../providers/spotify/scraper.js');
      const scraperService = new SpotifyScraperService();
      
      const health = await scraperService.getHealthMetrics();

      return reply.send({
        success: true,
        health: {
          status: health.status,
          activeJobs: health.activeJobs,
          completedJobs: health.completedJobs,
          failedJobs: health.failedJobs,
          averageExecutionTime: Math.round(health.averageExecutionTime / 1000), // Convert to seconds
          lastSuccessfulRun: health.lastSuccessfulRun
        }
      });

    } catch (error: any) {
      request.log.error(error, 'Failed to get scraper health');
      return reply.code(500).send({
        error: 'Failed to get scraper health',
        message: error.message
      });
    }
  })

  // Get metrics for any platform
  fastify.get<{ Querystring: MetricsRequest['Querystring'], Params: { platform: string } }>('/metrics/:platform', {
    // preHandler: [fastify.requireAuth]
  }, async (request: FastifyRequest<{ Querystring: MetricsRequest['Querystring'], Params: { platform: string } }>, reply: FastifyReply) => {
    try {
      // const user = request.user!
      const { platform } = request.params
      const { asset_id, from, to } = request.query
      
      let query = supabase
        .from('metrics')
        .select('*')
        // .eq('org_id', user.orgId)
        .eq('platform', platform)
        .order('ts', { ascending: false })
        .limit(100)
      
      if (asset_id) {
        query = query.eq('asset_id', asset_id)
      }
      
      if (from) {
        query = query.gte('ts', from)
      }
      
      if (to) {
        query = query.lte('ts', to)
      }
      
      const { data: metrics, error } = await query
      
      if (error) {
        throw error
      }
      
      return reply.send({ 
        platform,
        metrics: metrics || [] 
      })
      
    } catch (error) {
      request.log.error(error, 'Error fetching metrics')
      return reply.code(500).send({ error: 'Failed to fetch metrics' })
    }
  })
}
