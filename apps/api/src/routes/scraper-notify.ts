import { FastifyInstance } from 'fastify';
import nodemailer from 'nodemailer';
import { createClient } from '@supabase/supabase-js';

type ScraperNotifyBody = {
  campaignId: string;
  campaignName: string;
  youtubeUrl: string;
  videoId?: string | null;
  actorEmail?: string | null;
};

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const parseRecipients = (value?: string) =>
  (value || '')
    .split(',')
    .map((email) => email.trim())
    .filter(Boolean);

export async function scraperNotifyRoutes(server: FastifyInstance) {
  // Notify comment scraper that a campaign needs comments scraped
  server.post('/scraper-notify/comments-needed', async (request, reply) => {
    const body = request.body as ScraperNotifyBody;
    const { campaignId, campaignName, youtubeUrl, videoId, actorEmail } = body;

    if (!campaignId || !campaignName || !youtubeUrl) {
      return reply.code(400).send({ ok: false, message: 'Missing required fields: campaignId, campaignName, youtubeUrl' });
    }

    // Get scraper notification recipients from env (separate from ops notifications)
    const scraperRecipients = parseRecipients(process.env.SCRAPER_NOTIFICATION_EMAILS);
    // Fall back to ops notification emails if scraper-specific not configured
    const recipients = scraperRecipients.length > 0 
      ? scraperRecipients 
      : parseRecipients(process.env.OPS_NOTIFICATION_EMAILS);

    if (!recipients.length) {
      request.log.warn('No scraper notification recipients configured.');
      return reply.code(200).send({ ok: true, message: 'No recipients configured' });
    }

    // Update the campaign to mark that scraper notification was sent
    if (supabaseUrl && supabaseServiceKey) {
      try {
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        await supabase
          .from('youtube_campaigns')
          .update({ 
            scraper_notification_sent: true,
            scraper_notification_sent_at: new Date().toISOString(),
          })
          .eq('id', campaignId);
      } catch (err) {
        request.log.warn({ err }, 'Failed to update scraper notification status');
        // Continue with sending the notification
      }
    }

    if (!process.env.SMTP_HOST) {
      request.log.warn('SMTP is not configured. Logging notification instead.');
      request.log.info(`[SCRAPER NOTIFICATION] Campaign "${campaignName}" needs comments scraped. URL: ${youtubeUrl}`);
      return reply.code(200).send({ ok: true, message: 'SMTP not configured, notification logged' });
    }

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === 'true',
      auth: process.env.SMTP_USER
        ? {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          }
        : undefined,
    });

    const from = process.env.SMTP_FROM || process.env.SMTP_USER || 'ops@artistinfluence.com';
    const subject = `[Comments Needed] ${campaignName}`;
    const text = [
      `A YouTube campaign needs comments scraped.`,
      '',
      `Campaign: ${campaignName}`,
      `Campaign ID: ${campaignId}`,
      `YouTube URL: ${youtubeUrl}`,
      videoId ? `Video ID: ${videoId}` : null,
      '',
      `Action Required:`,
      `1. Scrape comments from the YouTube video`,
      `2. Upload the CSV to the campaign in the YouTube app`,
      `   - Go to Campaign Settings → Metrics & Targets`,
      `   - Upload CSV or provide Google Sheet URL`,
      '',
      actorEmail ? `Requested by: ${actorEmail}` : null,
    ]
      .filter(Boolean)
      .join('\n');

    try {
      await transporter.sendMail({
        from,
        to: recipients,
        subject,
        text,
      });

      request.log.info(`Scraper notification sent for campaign ${campaignId}`);
      return reply.code(200).send({ ok: true, recipients: recipients.length });
    } catch (error) {
      request.log.error({ err: error }, 'Failed to send scraper notification email');
      return reply.code(500).send({ ok: false, message: 'Failed to send notification' });
    }
  });

  // Check if a campaign needs scraper notification
  server.get('/scraper-notify/pending', async (request, reply) => {
    if (!supabaseUrl || !supabaseServiceKey) {
      return reply.code(500).send({ ok: false, message: 'Supabase not configured' });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    try {
      // Find campaigns that are ready/active but don't have comments sheet URL and haven't been notified
      const { data: campaigns, error } = await supabase
        .from('youtube_campaigns')
        .select('id, campaign_name, youtube_url, video_id, status, comments_sheet_url, comments_csv_file_path, scraper_notification_sent')
        .in('status', ['ready', 'active'])
        .is('comments_sheet_url', null)
        .is('comments_csv_file_path', null)
        .or('scraper_notification_sent.is.null,scraper_notification_sent.eq.false');

      if (error) {
        request.log.error({ err: error }, 'Failed to fetch pending campaigns');
        return reply.code(500).send({ ok: false, message: 'Failed to fetch campaigns' });
      }

      return reply.code(200).send({ ok: true, campaigns: campaigns || [] });
    } catch (error) {
      request.log.error({ err: error }, 'Error checking pending scraper notifications');
      return reply.code(500).send({ ok: false, message: 'Server error' });
    }
  });
}
