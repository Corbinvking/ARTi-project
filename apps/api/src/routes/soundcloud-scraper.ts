import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { scrapeSoundCloudTrack, scrapeSoundCloudTracks, SoundCloudTrackData } from '../lib/soundcloud-apify';
import { supabase } from '../lib/supabase';
import { logger } from '../lib/logger';

interface ScrapeTracksBody {
  trackUrls: string[];
}

interface ScrapeCampaignParams {
  campaignId: string;
}

function buildCampaignUpdate(track: SoundCloudTrackData) {
  return {
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
  };
}

async function upsertDailyStats(campaignId: string | number, track: SoundCloudTrackData) {
  const today = new Date().toISOString().slice(0, 10);
  await supabase.from('sc_campaign_stats_daily').upsert(
    {
      campaign_id: Number(campaignId),
      date: today,
      playback_count: track.playback_count,
      likes_count: track.likes_count,
      reposts_count: track.reposts_count,
      comment_count: track.comment_count,
      artist_followers: track.user.followers_count || null,
      collected_at: new Date().toISOString(),
    },
    { onConflict: 'campaign_id,date' },
  );
}

export async function soundcloudScraperRoutes(fastify: FastifyInstance) {
  fastify.log.info('Registering SoundCloud scraper routes...');

  /**
   * POST /api/soundcloud/scrape
   * Scrape one or more SoundCloud track URLs on demand.
   */
  fastify.post<{ Body: ScrapeTracksBody }>(
    '/soundcloud/scrape',
    async (request: FastifyRequest<{ Body: ScrapeTracksBody }>, reply: FastifyReply) => {
      const { trackUrls } = request.body || {};

      if (!trackUrls || !Array.isArray(trackUrls) || trackUrls.length === 0) {
        return reply.code(400).send({ ok: false, message: 'trackUrls array is required' });
      }

      if (trackUrls.length > 20) {
        return reply.code(400).send({ ok: false, message: 'Maximum 20 URLs per request' });
      }

      try {
        const tracks = await scrapeSoundCloudTracks(trackUrls);
        return reply.send({ ok: true, tracks, count: tracks.length });
      } catch (error: any) {
        logger.error({ error: error.message }, 'SoundCloud scrape failed');
        return reply.code(500).send({ ok: false, message: error.message });
      }
    },
  );

  /**
   * GET /api/soundcloud/scrape/:campaignId
   * Scrape the track URL for a specific campaign and update the DB row.
   */
  fastify.get<{ Params: ScrapeCampaignParams }>(
    '/soundcloud/scrape/:campaignId',
    async (request: FastifyRequest<{ Params: ScrapeCampaignParams }>, reply: FastifyReply) => {
      const { campaignId } = request.params;

      const { data: campaign, error: fetchError } = await supabase
        .from('soundcloud_campaigns')
        .select('id, url')
        .eq('id', campaignId)
        .single();

      if (fetchError || !campaign) {
        return reply.code(404).send({ ok: false, message: 'Campaign not found' });
      }

      if (!campaign.url) {
        return reply.code(400).send({ ok: false, message: 'Campaign has no track URL' });
      }

      try {
        const track = await scrapeSoundCloudTrack(campaign.url);

        if (!track) {
          return reply.code(502).send({ ok: false, message: 'Scraper returned no data for this URL' });
        }

        const updatePayload = buildCampaignUpdate(track);

        const { error: updateError } = await supabase
          .from('soundcloud_campaigns')
          .update(updatePayload)
          .eq('id', campaignId);

        if (updateError) {
          logger.error({ error: updateError, campaignId }, 'Failed to update campaign with scraped data');
          return reply.code(500).send({ ok: false, message: 'Failed to save scraped data' });
        }

        await upsertDailyStats(campaignId, track);

        return reply.send({ ok: true, track, campaignId });
      } catch (error: any) {
        logger.error({ error: error.message, campaignId }, 'Campaign scrape failed');
        return reply.code(500).send({ ok: false, message: error.message });
      }
    },
  );
}
