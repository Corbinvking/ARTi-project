import { FastifyInstance } from 'fastify';
import { logger } from '@/lib/logger';

// Ratio Fixer Flask app configuration
const RATIO_FIXER_URL = process.env.RATIO_FIXER_URL || 'http://localhost:5000';
const RATIO_FIXER_API_KEY = process.env.RATIO_FIXER_API_KEY || '';

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

