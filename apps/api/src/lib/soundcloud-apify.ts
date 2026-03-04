import { ApifyClient } from 'apify-client';
import { logger } from './logger';

const APIFY_API_TOKEN = process.env.APIFY_API_TOKEN || '';
const SOUNDCLOUD_SCRAPER_ACTOR_ID = 'T7Ee1ggCzRUSaUgme';

if (!APIFY_API_TOKEN) {
  console.warn('⚠️ APIFY_API_TOKEN is not set. SoundCloud scraping will fail.');
}

const client = new ApifyClient({
  token: APIFY_API_TOKEN,
});

export interface SoundCloudTrackData {
  id: number;
  title: string;
  permalink_url: string;
  genre: string;
  duration: number;
  playback_count: number;
  likes_count: number;
  reposts_count: number;
  comment_count: number;
  artwork_url: string | null;
  created_at: string;
  description: string | null;
  user: {
    id: number;
    username: string;
    permalink_url: string;
    followers_count: number;
    avatar_url: string | null;
  };
}

function mapRawToTrackData(item: any): SoundCloudTrackData {
  return {
    id: item.id || 0,
    title: item.title || '',
    permalink_url: item.permalink_url || '',
    genre: item.genre || '',
    duration: item.duration || item.full_duration || 0,
    playback_count: item.playback_count ?? 0,
    likes_count: item.likes_count ?? 0,
    reposts_count: item.reposts_count ?? 0,
    comment_count: item.comment_count ?? 0,
    artwork_url: item.artwork_url || null,
    created_at: item.created_at || '',
    description: item.description || null,
    user: {
      id: item.user?.id || item.user_id || 0,
      username: item.user?.username || '',
      permalink_url: item.user?.permalink_url || '',
      followers_count: item.user?.followers_count ?? 0,
      avatar_url: item.user?.avatar_url || null,
    },
  };
}

/**
 * Scrape a single SoundCloud track URL via the Apify actor.
 */
export async function scrapeSoundCloudTrack(
  trackUrl: string,
): Promise<SoundCloudTrackData | null> {
  try {
    logger.info({ trackUrl }, 'Starting SoundCloud track scrape');

    const input = {
      startUrls: [trackUrl],
      includeComments: false,
      maxItems: 1,
      proxy: {
        useApifyProxy: true,
        apifyProxyGroups: ['RESIDENTIAL'],
      },
    };

    const run = await client.actor(SOUNDCLOUD_SCRAPER_ACTOR_ID).call(input);

    logger.info({ runId: run.id, status: run.status }, 'Apify SoundCloud run completed');

    const { items } = await client.dataset(run.defaultDatasetId).listItems();

    if (!items || items.length === 0) {
      logger.warn({ trackUrl }, 'SoundCloud scraper returned no data');
      return null;
    }

    const track = mapRawToTrackData(items[0]);
    logger.info({
      trackId: track.id,
      title: track.title,
      plays: track.playback_count,
      likes: track.likes_count,
      reposts: track.reposts_count,
    }, 'SoundCloud track scraped');

    return track;
  } catch (error: any) {
    logger.error({ error: error.message, trackUrl }, 'SoundCloud scraper error');
    return null;
  }
}

/**
 * Scrape multiple SoundCloud track URLs in a single actor run.
 * The actor accepts an array of startUrls and returns items for each.
 */
export async function scrapeSoundCloudTracks(
  trackUrls: string[],
): Promise<SoundCloudTrackData[]> {
  if (trackUrls.length === 0) return [];

  try {
    logger.info({ count: trackUrls.length }, 'Starting batch SoundCloud scrape');

    const input = {
      startUrls: trackUrls,
      includeComments: false,
      maxItems: trackUrls.length,
      proxy: {
        useApifyProxy: true,
        apifyProxyGroups: ['RESIDENTIAL'],
      },
    };

    const run = await client.actor(SOUNDCLOUD_SCRAPER_ACTOR_ID).call(input);

    logger.info({ runId: run.id, status: run.status }, 'Apify batch SoundCloud run completed');

    const { items } = await client.dataset(run.defaultDatasetId).listItems();

    const tracks = (items || [])
      .filter((item: any) => item.kind === 'track' || item.id)
      .map(mapRawToTrackData);

    logger.info({ scraped: tracks.length, requested: trackUrls.length }, 'Batch SoundCloud scrape results');

    return tracks;
  } catch (error: any) {
    logger.error({ error: error.message, count: trackUrls.length }, 'Batch SoundCloud scraper error');
    return [];
  }
}
