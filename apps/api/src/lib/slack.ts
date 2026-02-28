import { supabase } from './supabase';
import { logger } from './logger';

export type Platform = 'soundcloud' | 'spotify' | 'instagram' | 'youtube';

interface SlackSettings {
  slack_enabled: boolean;
  slack_webhook: string | null;
  slack_channel: string | null;
}

interface SlackBlock {
  type: string;
  text?: { type: string; text: string; emoji?: boolean };
  fields?: { type: string; text: string }[];
  elements?: any[];
}

interface SlackMessage {
  text: string;
  channel?: string;
  blocks?: SlackBlock[];
}

const settingsCache = new Map<Platform, { settings: SlackSettings; fetchedAt: number }>();
const CACHE_TTL_MS = 60_000;

export async function getSlackSettings(platform: Platform): Promise<SlackSettings | null> {
  const cached = settingsCache.get(platform);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.settings;
  }

  try {
    const { data, error } = await supabase
      .from('platform_notification_settings')
      .select('slack_enabled, slack_webhook, slack_channel')
      .eq('platform', platform)
      .limit(1)
      .single();

    if (error || !data) {
      logger.debug({ error, platform }, 'No Slack settings found for platform');
      return null;
    }

    const settings: SlackSettings = {
      slack_enabled: data.slack_enabled ?? false,
      slack_webhook: data.slack_webhook ?? null,
      slack_channel: data.slack_channel ?? null,
    };

    settingsCache.set(platform, { settings, fetchedAt: Date.now() });
    return settings;
  } catch (err) {
    logger.error({ err, platform }, 'Error fetching Slack settings');
    return null;
  }
}

export function clearSlackSettingsCache(platform?: Platform) {
  if (platform) {
    settingsCache.delete(platform);
  } else {
    settingsCache.clear();
  }
}

export async function sendSlackMessage(platform: Platform, message: SlackMessage): Promise<boolean> {
  const settings = await getSlackSettings(platform);

  if (!settings || !settings.slack_enabled) {
    logger.debug({ platform }, 'Slack notifications disabled, skipping');
    return false;
  }

  if (!settings.slack_webhook) {
    logger.warn({ platform }, 'Slack webhook URL not configured');
    return false;
  }

  const payload: any = {
    text: message.text,
  };

  if (message.channel || settings.slack_channel) {
    payload.channel = message.channel || settings.slack_channel;
  }

  if (message.blocks) {
    payload.blocks = message.blocks;
  }

  try {
    const response = await fetch(settings.slack_webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const body = await response.text();
      logger.error({ status: response.status, body, platform }, 'Slack webhook request failed');
      return false;
    }

    logger.info({ channel: payload.channel, platform }, 'Slack notification sent');
    return true;
  } catch (err) {
    logger.error({ err, platform }, 'Failed to send Slack webhook');
    return false;
  }
}

const PLATFORM_LABELS: Record<Platform, string> = {
  soundcloud: 'SoundCloud',
  spotify: 'Spotify',
  instagram: 'Instagram',
  youtube: 'YouTube',
};

export function buildSlackBlocks(
  platform: Platform,
  event: string,
  data: Record<string, any>
): { text: string; blocks: SlackBlock[] } {
  const label = PLATFORM_LABELS[platform];

  switch (event) {
    case 'campaign_status_change': {
      const text = `[${label}] Campaign "${data.campaignName || data.campaignId}" status changed to ${data.status}`;
      return {
        text,
        blocks: [
          {
            type: 'header',
            text: { type: 'plain_text', text: `${label} — Campaign Status Update`, emoji: true },
          },
          {
            type: 'section',
            fields: [
              { type: 'mrkdwn', text: `*Campaign:*\n${data.campaignName || data.campaignId}` },
              { type: 'mrkdwn', text: `*New Status:*\n${data.status}` },
              ...(data.previousStatus
                ? [{ type: 'mrkdwn', text: `*Previous Status:*\n${data.previousStatus}` }]
                : []),
              ...(data.actorEmail
                ? [{ type: 'mrkdwn', text: `*Changed By:*\n${data.actorEmail}` }]
                : []),
            ],
          },
        ],
      };
    }

    case 'campaign_created': {
      const text = `[${label}] New campaign created: "${data.campaignName || data.campaignId}"`;
      return {
        text,
        blocks: [
          {
            type: 'header',
            text: { type: 'plain_text', text: `${label} — New Campaign Created`, emoji: true },
          },
          {
            type: 'section',
            fields: [
              { type: 'mrkdwn', text: `*Campaign:*\n${data.campaignName || data.campaignId}` },
              ...(data.clientName
                ? [{ type: 'mrkdwn', text: `*Client:*\n${data.clientName}` }]
                : []),
              ...(data.actorEmail
                ? [{ type: 'mrkdwn', text: `*Created By:*\n${data.actorEmail}` }]
                : []),
            ],
          },
        ],
      };
    }

    case 'submission_status_change': {
      const text = `[${label}] Submission "${data.trackName || data.submissionId}" status changed to ${data.status}`;
      return {
        text,
        blocks: [
          {
            type: 'header',
            text: { type: 'plain_text', text: `${label} — Submission Update`, emoji: true },
          },
          {
            type: 'section',
            fields: [
              { type: 'mrkdwn', text: `*Track:*\n${data.trackName || data.submissionId}` },
              { type: 'mrkdwn', text: `*Status:*\n${data.status}` },
              ...(data.artistName
                ? [{ type: 'mrkdwn', text: `*Artist:*\n${data.artistName}` }]
                : []),
            ],
          },
        ],
      };
    }

    case 'inquiry_status_change': {
      const text = `[${label}] Inquiry from "${data.name}" has been ${data.status}`;
      return {
        text,
        blocks: [
          {
            type: 'header',
            text: { type: 'plain_text', text: `${label} — Inquiry Status Update`, emoji: true },
          },
          {
            type: 'section',
            fields: [
              { type: 'mrkdwn', text: `*Name:*\n${data.name}` },
              { type: 'mrkdwn', text: `*Status:*\n${data.status}` },
              ...(data.email
                ? [{ type: 'mrkdwn', text: `*Email:*\n${data.email}` }]
                : []),
              ...(data.admittedGroup
                ? [{ type: 'mrkdwn', text: `*Group:*\n${data.admittedGroup}` }]
                : []),
            ],
          },
        ],
      };
    }

    case 'reconnect_email_sent': {
      const text = `[${label}] Reconnect email sent to "${data.memberName}"`;
      return {
        text,
        blocks: [
          {
            type: 'header',
            text: { type: 'plain_text', text: `${label} — Reconnect Email Sent`, emoji: true },
          },
          {
            type: 'section',
            fields: [
              { type: 'mrkdwn', text: `*Member:*\n${data.memberName}` },
              { type: 'mrkdwn', text: `*Email:*\n${data.email}` },
            ],
          },
        ],
      };
    }

    default: {
      const text = `[${label}] ${event}: ${JSON.stringify(data)}`;
      return {
        text,
        blocks: [
          {
            type: 'section',
            text: { type: 'mrkdwn', text: `*[${label}] ${event}*\n\`\`\`${JSON.stringify(data, null, 2)}\`\`\`` },
          },
        ],
      };
    }
  }
}
