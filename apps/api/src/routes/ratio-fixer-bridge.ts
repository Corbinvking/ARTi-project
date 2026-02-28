import { FastifyInstance } from 'fastify';
import { logger } from '@/lib/logger';
import { supabase } from '@/lib/supabase';

// Ratio Fixer Flask app configuration
const RATIO_FIXER_URL = process.env.RATIO_FIXER_URL || 'http://localhost:5001';
const RATIO_FIXER_API_KEY = process.env.RATIO_FIXER_API_KEY || '';

// Throttle snapshot inserts to once every 5 minutes per campaign
const SNAPSHOT_INTERVAL_MS = 5 * 60 * 1000;
const lastSnapshotTime = new Map<string, number>();

interface StartRatioFixerRequest {
  campaignId: string;
  videoUrl: string;
  videoId: string;
  genre: string;
  commentsSheetUrl: string;
  waitTime?: number;
  minimumEngagement?: number;
  commentServerId?: number;
  likeServerId?: number;
  sheetTier?: string;
}

interface FlaskCreateCampaignResponse {
  success: boolean;
  campaign_id: string;
  message?: string;
}

interface RatioFixerStatus {
  views: number;
  likes: number;
  comments: number;
  status: string;
  desired_comments: number;
  desired_likes: number;
  ordered_likes?: number;
  ordered_comments?: number;
}

/**
 * API Bridge routes for Flask Ratio Fixer integration
 * 
 * This provides a proxy between the YouTube Manager app and the standalone
 * Flask Ratio Fixer application, enabling automated engagement ordering.
 */
export async function ratioFixerBridgeRoutes(server: FastifyInstance) {
  
  /**
   * POST /ratio-fixer/start
   * 
   * Start the ratio fixer for a campaign
   * Creates a campaign in the Flask app and starts automated monitoring
   */
  server.post('/ratio-fixer/start', async (request, reply) => {
    try {
      const body = request.body as StartRatioFixerRequest;
      
      logger.info('Starting ratio fixer for campaign:', body.campaignId);
      
      // Validate required fields
      if (!body.videoUrl || !body.videoId || !body.genre) {
        return reply.status(400).send({
          success: false,
          error: 'Missing required fields: videoUrl, videoId, or genre'
        });
      }
      
      // Call Flask API to create campaign
      const flaskResponse = await fetch(`${RATIO_FIXER_URL}/api/create_campaign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': RATIO_FIXER_API_KEY
        },
        body: JSON.stringify({
          youtube_url: body.videoUrl,
          video_id: body.videoId,
          genre: body.genre,
          comments_sheet: body.commentsSheetUrl,
          wait_time: body.waitTime || 36,
          minimum_engagement: body.minimumEngagement || 500,
          comment_server: body.commentServerId || 439,
          like_server: body.likeServerId || 2324,
          sheet_tier: body.sheetTier || '1847390823'
        })
      });
      
      if (!flaskResponse.ok) {
        const errorText = await flaskResponse.text();
        logger.error('Flask API error:', errorText);
        return reply.status(502).send({
          success: false,
          error: 'Failed to start ratio fixer',
          message: errorText
        });
      }
      
      const flaskData = await flaskResponse.json() as FlaskCreateCampaignResponse;
      
      logger.info('Ratio fixer started successfully:', flaskData);

      // Sync status back to the youtube_campaigns table so the UI
      // shows "In Fixer" automatically without a manual toggle.
      // Also snapshot current likes/comments as baseline for delta tracking.
      if (body.campaignId && flaskData.campaign_id) {
        const { data: currentCampaign } = await supabase
          .from('youtube_campaigns')
          .select('current_likes, current_comments')
          .eq('id', body.campaignId)
          .single();

        const { error: updateErr } = await supabase
          .from('youtube_campaigns')
          .update({
            in_fixer: true,
            ratio_fixer_campaign_id: flaskData.campaign_id,
            ratio_fixer_status: 'running',
            ratio_fixer_started_at: new Date().toISOString(),
            ratio_fixer_stopped_at: null,
            ordered_likes: 0,
            ordered_comments: 0,
            likes_at_fixer_start: currentCampaign?.current_likes ?? 0,
            comments_at_fixer_start: currentCampaign?.current_comments ?? 0,
          })
          .eq('id', body.campaignId);

        if (updateErr) {
          logger.warn('Failed to sync ratio fixer state to youtube_campaigns:', updateErr);
        }
      }

      // Insert baseline snapshot so the chart starts at time zero
      if (body.campaignId) {
        const { data: curr } = await supabase
          .from('youtube_campaigns')
          .select('current_views, current_likes, current_comments')
          .eq('id', body.campaignId)
          .single();

        await supabase.from('ratio_fixer_snapshots').insert({
          campaign_id: body.campaignId,
          views: curr?.current_views ?? 0,
          likes: curr?.current_likes ?? 0,
          comments: curr?.current_comments ?? 0,
          ordered_likes: 0,
          ordered_comments: 0,
          desired_likes: 0,
          desired_comments: 0,
          flask_status: 'started',
        });
      }

      return reply.send({
        success: true,
        ratioFixerCampaignId: flaskData.campaign_id,
        message: 'Ratio fixer started successfully'
      });
      
    } catch (error: any) {
      logger.error('Error starting ratio fixer:', error);
      return reply.status(500).send({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  });
  
  /**
   * GET /ratio-fixer/status/:ratioFixerCampaignId
   * 
   * Get current status of a ratio fixer campaign
   * Polls the Flask app for real-time stats
   */
  server.get('/ratio-fixer/status/:ratioFixerCampaignId', async (request, reply) => {
    try {
      const { ratioFixerCampaignId } = request.params as { ratioFixerCampaignId: string };
      
      logger.info('Fetching ratio fixer status for:', ratioFixerCampaignId);
      
      // Call Flask API to get status
      const flaskResponse = await fetch(
        `${RATIO_FIXER_URL}/api/campaign_status/${ratioFixerCampaignId}`,
        {
          headers: {
            'X-API-Key': RATIO_FIXER_API_KEY
          }
        }
      );
      
      if (!flaskResponse.ok) {
        if (flaskResponse.status === 404) {
          return reply.status(404).send({
            error: 'Ratio fixer campaign not found'
          });
        }
        const errorText = await flaskResponse.text();
        logger.error('Flask API error:', errorText);
        return reply.status(502).send({
          error: 'Failed to fetch status from ratio fixer',
          message: errorText
        });
      }
      
      const statusData = await flaskResponse.json() as RatioFixerStatus;

      // Persist Flask stats back to youtube_campaigns so data survives
      // Flask restarts and the UI can show session summaries.
      const { error: syncErr } = await supabase
        .from('youtube_campaigns')
        .update({
          ordered_likes: statusData.ordered_likes ?? 0,
          ordered_comments: statusData.ordered_comments ?? 0,
          desired_likes: statusData.desired_likes ?? 0,
          desired_comments: statusData.desired_comments ?? 0,
          ratio_fixer_last_check: new Date().toISOString(),
        })
        .eq('ratio_fixer_campaign_id', ratioFixerCampaignId);

      if (syncErr) {
        logger.warn('Failed to sync ratio fixer stats to youtube_campaigns:', syncErr);
      }

      // Insert a time-series snapshot (throttled to every 5 minutes)
      const now = Date.now();
      const lastSnap = lastSnapshotTime.get(ratioFixerCampaignId) ?? 0;
      if (now - lastSnap >= SNAPSHOT_INTERVAL_MS) {
        // Look up the Supabase campaign UUID for this Flask campaign
        const { data: row } = await supabase
          .from('youtube_campaigns')
          .select('id')
          .eq('ratio_fixer_campaign_id', ratioFixerCampaignId)
          .single();

        if (row?.id) {
          const { error: snapErr } = await supabase
            .from('ratio_fixer_snapshots')
            .insert({
              campaign_id: row.id,
              views: statusData.views ?? 0,
              likes: statusData.likes ?? 0,
              comments: statusData.comments ?? 0,
              ordered_likes: statusData.ordered_likes ?? 0,
              ordered_comments: statusData.ordered_comments ?? 0,
              desired_likes: statusData.desired_likes ?? 0,
              desired_comments: statusData.desired_comments ?? 0,
              flask_status: statusData.status ?? null,
            });

          if (snapErr) {
            logger.warn('Failed to insert ratio fixer snapshot:', snapErr);
          } else {
            lastSnapshotTime.set(ratioFixerCampaignId, now);
          }
        }
      }
      
      return reply.send(statusData);
      
    } catch (error: any) {
      logger.error('Error fetching ratio fixer status:', error);
      return reply.status(500).send({
        error: 'Internal server error',
        message: error.message
      });
    }
  });
  
  /**
   * POST /ratio-fixer/stop/:ratioFixerCampaignId
   * 
   * Stop a running ratio fixer campaign
   */
  server.post('/ratio-fixer/stop/:ratioFixerCampaignId', async (request, reply) => {
    try {
      const { ratioFixerCampaignId } = request.params as { ratioFixerCampaignId: string };
      
      logger.info('Stopping ratio fixer campaign:', ratioFixerCampaignId);

      // Snapshot final stats from Flask before stopping
      try {
        const statusRes = await fetch(
          `${RATIO_FIXER_URL}/api/campaign_status/${ratioFixerCampaignId}`,
          { headers: { 'X-API-Key': RATIO_FIXER_API_KEY } }
        );
        if (statusRes.ok) {
          const finalStats = await statusRes.json() as RatioFixerStatus;
          await supabase
            .from('youtube_campaigns')
            .update({
              ordered_likes: finalStats.ordered_likes ?? 0,
              ordered_comments: finalStats.ordered_comments ?? 0,
              desired_likes: finalStats.desired_likes ?? 0,
              desired_comments: finalStats.desired_comments ?? 0,
              ratio_fixer_last_check: new Date().toISOString(),
            })
            .eq('ratio_fixer_campaign_id', ratioFixerCampaignId);
        }
      } catch (snapErr: any) {
        logger.warn('Could not snapshot final stats before stop:', snapErr.message);
      }
      
      // Call Flask API to stop campaign
      const flaskResponse = await fetch(
        `${RATIO_FIXER_URL}/api/stop_campaign/${ratioFixerCampaignId}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': RATIO_FIXER_API_KEY
          }
        }
      );
      
      if (!flaskResponse.ok) {
        const errorText = await flaskResponse.text();
        logger.error('Flask API error:', errorText);
        return reply.status(502).send({
          success: false,
          error: 'Failed to stop ratio fixer',
          message: errorText
        });
      }
      
      const responseData = await flaskResponse.json();
      
      logger.info('Ratio fixer stopped successfully');

      // Insert final snapshot before marking stopped
      const { data: stoppedRow } = await supabase
        .from('youtube_campaigns')
        .select('id, ordered_likes, ordered_comments, desired_likes, desired_comments, current_views, current_likes, current_comments')
        .eq('ratio_fixer_campaign_id', ratioFixerCampaignId)
        .single();

      if (stoppedRow?.id) {
        await supabase.from('ratio_fixer_snapshots').insert({
          campaign_id: stoppedRow.id,
          views: stoppedRow.current_views ?? 0,
          likes: stoppedRow.current_likes ?? 0,
          comments: stoppedRow.current_comments ?? 0,
          ordered_likes: stoppedRow.ordered_likes ?? 0,
          ordered_comments: stoppedRow.ordered_comments ?? 0,
          desired_likes: stoppedRow.desired_likes ?? 0,
          desired_comments: stoppedRow.desired_comments ?? 0,
          flask_status: 'stopped',
        });
        lastSnapshotTime.delete(ratioFixerCampaignId);
      }

      // Sync status back to the youtube_campaigns table
      const { error: updateErr } = await supabase
        .from('youtube_campaigns')
        .update({
          in_fixer: false,
          ratio_fixer_status: 'stopped',
          ratio_fixer_stopped_at: new Date().toISOString(),
        })
        .eq('ratio_fixer_campaign_id', ratioFixerCampaignId);

      if (updateErr) {
        logger.warn('Failed to sync ratio fixer stop state to youtube_campaigns:', updateErr);
      }

      return reply.send({
        success: true,
        message: 'Ratio fixer stopped successfully',
        data: responseData
      });
      
    } catch (error: any) {
      logger.error('Error stopping ratio fixer:', error);
      return reply.status(500).send({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  });
  
  /**
   * GET /ratio-fixer/health
   * 
   * Check if the Flask Ratio Fixer service is available
   */
  server.get('/ratio-fixer/health', async (_request, reply) => {
    try {
      const flaskResponse = await fetch(`${RATIO_FIXER_URL}/healthz`, {
        headers: {
          'X-API-Key': RATIO_FIXER_API_KEY
        },
        signal: AbortSignal.timeout(5000) // 5 second timeout
      });
      
      if (flaskResponse.ok) {
        return reply.send({
          status: 'healthy',
          ratioFixerUrl: RATIO_FIXER_URL,
          available: true
        });
      } else {
        return reply.status(503).send({
          status: 'unhealthy',
          ratioFixerUrl: RATIO_FIXER_URL,
          available: false,
          error: `Flask app returned status ${flaskResponse.status}`
        });
      }
    } catch (error: any) {
      logger.error('Ratio fixer health check failed:', error);
      return reply.status(503).send({
        status: 'unreachable',
        ratioFixerUrl: RATIO_FIXER_URL,
        available: false,
        error: error.message
      });
    }
  });
}

