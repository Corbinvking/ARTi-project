import { FastifyPluginAsync } from 'fastify';
import { SpotifyScraperService } from '../../providers/spotify/scraper.js';
import { requireAuth } from '../../lib/auth.js';
import { logger } from '../../lib/logger.js';

const spotify: FastifyPluginAsync = async (fastify) => {
  const scraperService = new SpotifyScraperService();

  // Middleware to require authentication and extract org_id
  fastify.addHook('preHandler', requireAuth);

  /**
   * Start a new Spotify scraping job
   */
  fastify.post('/scrape', {
    schema: {
      body: {
        type: 'object',
        required: ['songUrls'],
        properties: {
          songUrls: {
            type: 'array',
            items: { type: 'string' },
            minItems: 1,
            maxItems: 20 // Reasonable limit
          }
        }
      }
    }
  }, async (request, reply) => {
    const { songUrls } = request.body as { songUrls: string[] };
    const { org_id } = request.user;

    try {
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

      if (validUrls.length !== songUrls.length) {
        logger.warn('Some URLs were filtered out', {
          total: songUrls.length,
          valid: validUrls.length,
          orgId: org_id
        });
      }

      const jobId = await scraperService.startScrapingJob(org_id, validUrls);

      logger.info('Spotify scraping job started', {
        jobId,
        orgId: org_id,
        songCount: validUrls.length
      });

      return reply.send({
        success: true,
        jobId,
        songCount: validUrls.length,
        message: 'Scraping job started successfully'
      });

    } catch (error: any) {
      logger.error('Failed to start scraping job', {
        orgId: org_id,
        error: error.message
      });

      return reply.code(500).send({
        error: 'Failed to start scraping job',
        message: error.message
      });
    }
  });

  /**
   * Get status of a specific scraping job
   */
  fastify.get('/scrape/:jobId', {
    schema: {
      params: {
        type: 'object',
        required: ['jobId'],
        properties: {
          jobId: { type: 'string' }
        }
      }
    }
  }, async (request, reply) => {
    const { jobId } = request.params as { jobId: string };
    const { org_id } = request.user;

    try {
      const job = scraperService.getJobStatus(jobId);

      if (!job) {
        return reply.code(404).send({
          error: 'Job not found',
          message: `No scraping job found with ID: ${jobId}`
        });
      }

      // Ensure user can only access their org's jobs
      if (job.orgId !== org_id) {
        return reply.code(403).send({
          error: 'Access denied',
          message: 'You can only access jobs from your organization'
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
      logger.error('Failed to get job status', {
        jobId,
        orgId: org_id,
        error: error.message
      });

      return reply.code(500).send({
        error: 'Failed to get job status',
        message: error.message
      });
    }
  });

  /**
   * Get all scraping jobs for the organization
   */
  fastify.get('/scrape', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          limit: { type: 'number', minimum: 1, maximum: 100, default: 20 },
          status: { type: 'string', enum: ['pending', 'running', 'completed', 'failed'] }
        }
      }
    }
  }, async (request, reply) => {
    const { limit = 20, status } = request.query as { 
      limit?: number; 
      status?: 'pending' | 'running' | 'completed' | 'failed' 
    };
    const { org_id } = request.user;

    try {
      let jobs = scraperService.getOrgJobs(org_id);

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
      logger.error('Failed to get organization jobs', {
        orgId: org_id,
        error: error.message
      });

      return reply.code(500).send({
        error: 'Failed to get jobs',
        message: error.message
      });
    }
  });

  /**
   * Get scraper health metrics
   */
  fastify.get('/health', async (request, reply) => {
    const { org_id } = request.user;

    try {
      const health = await scraperService.getHealthMetrics();

      logger.info('Scraper health check requested', {
        orgId: org_id,
        status: health.status
      });

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
      logger.error('Failed to get scraper health', {
        orgId: org_id,
        error: error.message
      });

      return reply.code(500).send({
        error: 'Failed to get scraper health',
        message: error.message
      });
    }
  });

  /**
   * Cancel a running scraping job (admin only)
   */
  fastify.delete('/scrape/:jobId', {
    schema: {
      params: {
        type: 'object',
        required: ['jobId'],
        properties: {
          jobId: { type: 'string' }
        }
      }
    }
  }, async (request, reply) => {
    const { jobId } = request.params as { jobId: string };
    const { org_id, role } = request.user;

    // Only admins can cancel jobs
    if (role !== 'admin') {
      return reply.code(403).send({
        error: 'Access denied',
        message: 'Only administrators can cancel scraping jobs'
      });
    }

    try {
      const job = scraperService.getJobStatus(jobId);

      if (!job) {
        return reply.code(404).send({
          error: 'Job not found',
          message: `No scraping job found with ID: ${jobId}`
        });
      }

      if (job.orgId !== org_id) {
        return reply.code(403).send({
          error: 'Access denied',
          message: 'You can only cancel jobs from your organization'
        });
      }

      if (job.status !== 'running' && job.status !== 'pending') {
        return reply.code(400).send({
          error: 'Cannot cancel job',
          message: `Job is ${job.status} and cannot be cancelled`
        });
      }

      // TODO: Implement actual job cancellation
      // For now, just mark as failed
      job.status = 'failed';
      job.errorMessage = 'Cancelled by administrator';
      job.completedAt = new Date();

      logger.info('Scraping job cancelled', {
        jobId,
        orgId: org_id,
        cancelledBy: request.user.sub
      });

      return reply.send({
        success: true,
        message: 'Job cancelled successfully'
      });

    } catch (error: any) {
      logger.error('Failed to cancel job', {
        jobId,
        orgId: org_id,
        error: error.message
      });

      return reply.code(500).send({
        error: 'Failed to cancel job',
        message: error.message
      });
    }
  });

  /**
   * Cleanup old jobs and files (admin only)
   */
  fastify.post('/cleanup', {
    schema: {
      body: {
        type: 'object',
        properties: {
          olderThanDays: { type: 'number', minimum: 1, maximum: 30, default: 7 }
        }
      }
    }
  }, async (request, reply) => {
    const { olderThanDays = 7 } = request.body as { olderThanDays?: number };
    const { org_id, role } = request.user;

    if (role !== 'admin') {
      return reply.code(403).send({
        error: 'Access denied',
        message: 'Only administrators can perform cleanup'
      });
    }

    try {
      await scraperService.cleanup(olderThanDays);

      logger.info('Scraper cleanup completed', {
        orgId: org_id,
        olderThanDays,
        requestedBy: request.user.sub
      });

      return reply.send({
        success: true,
        message: `Cleanup completed for data older than ${olderThanDays} days`
      });

    } catch (error: any) {
      logger.error('Failed to cleanup scraper data', {
        orgId: org_id,
        error: error.message
      });

      return reply.code(500).send({
        error: 'Failed to cleanup',
        message: error.message
      });
    }
  });
};

export default spotify;
