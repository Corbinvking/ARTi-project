import { FastifyInstance } from 'fastify';
import { sendSlackMessage, buildSlackBlocks, clearSlackSettingsCache, Platform } from '../lib/slack';

const VALID_PLATFORMS: Platform[] = ['soundcloud', 'spotify', 'instagram', 'youtube'];

type SlackNotifyBody = {
  platform: Platform;
  event: string;
  channel?: string;
  data?: Record<string, any>;
};

type SlackTestBody = {
  platform: Platform;
};

export async function slackNotifyRoutes(server: FastifyInstance) {
  server.post('/slack-notify', async (request, reply) => {
    const body = request.body as SlackNotifyBody;
    const { platform, event, channel, data } = body;

    if (!platform || !VALID_PLATFORMS.includes(platform)) {
      return reply.code(400).send({
        ok: false,
        message: `Missing or invalid platform. Must be one of: ${VALID_PLATFORMS.join(', ')}`,
      });
    }

    if (!event) {
      return reply.code(400).send({ ok: false, message: 'Missing required field: event' });
    }

    const { text, blocks } = buildSlackBlocks(platform, event, data || {});

    const sent = await sendSlackMessage(platform, { text, blocks, channel });

    return reply.code(200).send({ ok: true, sent });
  });

  server.post('/slack-notify/test', async (request, reply) => {
    const body = (request.body || {}) as SlackTestBody;
    const platform = body.platform;

    if (!platform || !VALID_PLATFORMS.includes(platform)) {
      return reply.code(400).send({
        ok: false,
        message: `Missing or invalid platform. Must be one of: ${VALID_PLATFORMS.join(', ')}`,
      });
    }

    clearSlackSettingsCache(platform);

    const platformLabels: Record<Platform, string> = {
      soundcloud: 'SoundCloud',
      spotify: 'Spotify',
      instagram: 'Instagram',
      youtube: 'YouTube',
    };

    const sent = await sendSlackMessage(platform, {
      text: `${platformLabels[platform]} Slack integration is working!`,
      blocks: [
        {
          type: 'header',
          text: { type: 'plain_text', text: `${platformLabels[platform]} — Slack Integration Test`, emoji: true },
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `Your ${platformLabels[platform]} Slack integration is configured and working correctly.`,
          },
        },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: `Sent at ${new Date().toISOString()}`,
            },
          ],
        },
      ],
    });

    if (!sent) {
      return reply.code(200).send({
        ok: false,
        message: 'Slack is disabled or webhook URL is not configured. Save your settings first, then try again.',
      });
    }

    return reply.code(200).send({ ok: true, message: 'Test message sent to Slack' });
  });
}
