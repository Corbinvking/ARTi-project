import { FastifyInstance } from 'fastify';
import nodemailer from 'nodemailer';
import { createClient } from '@supabase/supabase-js';

type WeeklyUpdateBody = {
  mode?: 'manual' | 'scheduled';
  campaign_id?: string;
};

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const parseRecipients = (value?: string) =>
  (value || '')
    .split(',')
    .map((email) => email.trim())
    .filter(Boolean);

const formatNumber = (num: number): string => {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toLocaleString();
};

const calculateProgress = (current: number, goal: number): number => {
  if (!goal || goal === 0) return 0;
  return Math.min(Math.round((current / goal) * 100), 100);
};

export async function weeklyUpdatesRoutes(server: FastifyInstance) {
  server.post('/weekly-updates/send', async (request, reply) => {
    const body = request.body as WeeklyUpdateBody;
    const { mode, campaign_id } = body;

    if (!campaign_id) {
      return reply.code(400).send({ ok: false, message: 'campaign_id is required' });
    }

    if (!supabaseUrl || !supabaseServiceKey) {
      request.log.error('Supabase credentials not configured');
      return reply.code(500).send({ ok: false, message: 'Supabase not configured' });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    try {
      // Fetch campaign with client info
      const { data: campaign, error: campaignError } = await supabase
        .from('youtube_campaigns')
        .select(`
          *,
          youtube_clients (
            id,
            name,
            email,
            company
          )
        `)
        .eq('id', campaign_id)
        .single();

      if (campaignError || !campaign) {
        request.log.error('Failed to fetch campaign:', campaignError);
        return reply.code(404).send({ ok: false, message: 'Campaign not found' });
      }

      // Get client email
      const clientEmail = campaign.youtube_clients?.email;
      if (!clientEmail) {
        request.log.warn('No client email found for campaign:', campaign_id);
        return reply.code(400).send({ ok: false, message: 'No client email configured' });
      }

      // Fetch stats from 7 days ago for comparison
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];

      const { data: weekAgoStats } = await supabase
        .from('campaign_stats_daily')
        .select('views, likes, comments')
        .eq('campaign_id', campaign_id)
        .lte('date', sevenDaysAgoStr)
        .order('date', { ascending: false })
        .limit(1)
        .single();

      // Calculate current values and deltas
      const currentViews = campaign.current_views || 0;
      const currentLikes = campaign.current_likes || 0;
      const currentComments = campaign.current_comments || 0;
      const goalViews = campaign.goal_views || 0;
      const likeGoal = campaign.like_goal || 0;
      const commentGoal = campaign.comment_goal || 0;

      const previousViews = weekAgoStats?.views || 0;
      const previousLikes = weekAgoStats?.likes || 0;
      const previousComments = weekAgoStats?.comments || 0;

      const viewsDelta = currentViews - previousViews;
      const likesDelta = currentLikes - previousLikes;
      const commentsDelta = currentComments - previousComments;

      const remainingViews = Math.max(0, goalViews - currentViews);
      const remainingLikes = Math.max(0, likeGoal - currentLikes);
      const remainingComments = Math.max(0, commentGoal - currentComments);

      const viewsProgress = calculateProgress(currentViews, goalViews);
      const likesProgress = calculateProgress(currentLikes, likeGoal);
      const commentsProgress = calculateProgress(currentComments, commentGoal);

      // Check SMTP configuration
      if (!process.env.SMTP_HOST) {
        request.log.warn('SMTP is not configured. Skipping email send.');
        return reply.code(200).send({ ok: true, message: 'SMTP not configured' });
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

      const from = process.env.SMTP_FROM || process.env.SMTP_USER || 'updates@artistinfluence.com';
      const subject = `Weekly Update: ${campaign.campaign_name}`;

      // Build email content with delivered vs remaining
      const textContent = [
        `Campaign Progress Report`,
        `========================`,
        ``,
        `Campaign: ${campaign.campaign_name}`,
        campaign.youtube_url ? `Video: ${campaign.youtube_url}` : null,
        ``,
        `This Week's Progress:`,
        `---------------------`,
        ``,
        `VIEWS`,
        `  Current: ${formatNumber(currentViews)}${goalViews ? ` / ${formatNumber(goalViews)} (${viewsProgress}%)` : ''}`,
        goalViews ? `  Remaining: ${formatNumber(remainingViews)}` : null,
        viewsDelta > 0 ? `  +${formatNumber(viewsDelta)} this week` : null,
        ``,
        `LIKES`,
        `  Current: ${formatNumber(currentLikes)}${likeGoal ? ` / ${formatNumber(likeGoal)} (${likesProgress}%)` : ''}`,
        likeGoal ? `  Remaining: ${formatNumber(remainingLikes)}` : null,
        likesDelta > 0 ? `  +${formatNumber(likesDelta)} this week` : null,
        ``,
        `COMMENTS`,
        `  Current: ${formatNumber(currentComments)}${commentGoal ? ` / ${formatNumber(commentGoal)} (${commentsProgress}%)` : ''}`,
        commentGoal ? `  Remaining: ${formatNumber(remainingComments)}` : null,
        commentsDelta > 0 ? `  +${formatNumber(commentsDelta)} this week` : null,
        ``,
        campaign.client_notes ? `Notes:\n${campaign.client_notes}` : null,
        ``,
        `---`,
        `This is an automated weekly update from Artist Influence.`,
      ]
        .filter(Boolean)
        .join('\n');

      // HTML version for better formatting
      const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    h1 { color: #1a1a1a; border-bottom: 2px solid #e5e5e5; padding-bottom: 10px; }
    .metric { background: #f8f9fa; padding: 15px; margin: 10px 0; border-radius: 8px; }
    .metric-title { font-weight: bold; color: #555; margin-bottom: 5px; }
    .metric-value { font-size: 24px; font-weight: bold; color: #1a1a1a; }
    .progress-bar { background: #e5e5e5; height: 8px; border-radius: 4px; margin-top: 8px; }
    .progress-fill { height: 100%; border-radius: 4px; }
    .views .progress-fill { background: #3b82f6; }
    .likes .progress-fill { background: #ef4444; }
    .comments .progress-fill { background: #22c55e; }
    .remaining { color: #666; font-size: 14px; }
    .delta { color: #22c55e; font-size: 14px; }
    .notes { background: #fff3cd; padding: 15px; border-radius: 8px; margin-top: 20px; }
    .footer { color: #999; font-size: 12px; margin-top: 30px; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Weekly Campaign Update</h1>
    <p><strong>Campaign:</strong> ${campaign.campaign_name}</p>
    ${campaign.youtube_url ? `<p><strong>Video:</strong> <a href="${campaign.youtube_url}">${campaign.youtube_url}</a></p>` : ''}
    
    <div class="metric views">
      <div class="metric-title">Views</div>
      <div class="metric-value">${formatNumber(currentViews)}${goalViews ? ` <span style="font-size: 16px; color: #666;">/ ${formatNumber(goalViews)}</span>` : ''}</div>
      ${goalViews ? `
        <div class="progress-bar"><div class="progress-fill" style="width: ${viewsProgress}%"></div></div>
        <div class="remaining">${formatNumber(remainingViews)} remaining (${viewsProgress}% complete)</div>
      ` : ''}
      ${viewsDelta > 0 ? `<div class="delta">+${formatNumber(viewsDelta)} this week</div>` : ''}
    </div>
    
    <div class="metric likes">
      <div class="metric-title">Likes</div>
      <div class="metric-value">${formatNumber(currentLikes)}${likeGoal ? ` <span style="font-size: 16px; color: #666;">/ ${formatNumber(likeGoal)}</span>` : ''}</div>
      ${likeGoal ? `
        <div class="progress-bar"><div class="progress-fill" style="width: ${likesProgress}%"></div></div>
        <div class="remaining">${formatNumber(remainingLikes)} remaining (${likesProgress}% complete)</div>
      ` : ''}
      ${likesDelta > 0 ? `<div class="delta">+${formatNumber(likesDelta)} this week</div>` : ''}
    </div>
    
    <div class="metric comments">
      <div class="metric-title">Comments</div>
      <div class="metric-value">${formatNumber(currentComments)}${commentGoal ? ` <span style="font-size: 16px; color: #666;">/ ${formatNumber(commentGoal)}</span>` : ''}</div>
      ${commentGoal ? `
        <div class="progress-bar"><div class="progress-fill" style="width: ${commentsProgress}%"></div></div>
        <div class="remaining">${formatNumber(remainingComments)} remaining (${commentsProgress}% complete)</div>
      ` : ''}
      ${commentsDelta > 0 ? `<div class="delta">+${formatNumber(commentsDelta)} this week</div>` : ''}
    </div>
    
    ${campaign.client_notes ? `
      <div class="notes">
        <strong>Notes:</strong><br/>
        ${campaign.client_notes}
      </div>
    ` : ''}
    
    <div class="footer">
      This is an automated weekly update from Artist Influence.
    </div>
  </div>
</body>
</html>
      `;

      await transporter.sendMail({
        from,
        to: clientEmail,
        subject,
        text: textContent,
        html: htmlContent,
      });

      // Log the weekly update
      await supabase.from('youtube_weekly_updates_log').insert({
        campaign_id: campaign.id,
        week_ending: new Date().toISOString().split('T')[0],
        views_delta: viewsDelta,
        likes_delta: likesDelta,
        comments_delta: commentsDelta,
        recipient_email: clientEmail,
        org_id: campaign.org_id,
      });

      // Update last sent timestamp
      await supabase
        .from('youtube_campaigns')
        .update({ last_weekly_update_sent: new Date().toISOString() })
        .eq('id', campaign_id);

      request.log.info(`Weekly update sent for campaign ${campaign_id} to ${clientEmail}`);
      return reply.code(200).send({ ok: true, recipient: clientEmail });
    } catch (error) {
      request.log.error('Error sending weekly update:', error);
      return reply.code(500).send({ ok: false, message: 'Failed to send weekly update' });
    }
  });

  // Endpoint to send weekly updates to all campaigns with weekly_updates_enabled
  server.post('/weekly-updates/send-all', async (request, reply) => {
    if (!supabaseUrl || !supabaseServiceKey) {
      request.log.error('Supabase credentials not configured');
      return reply.code(500).send({ ok: false, message: 'Supabase not configured' });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    try {
      // Fetch all campaigns with weekly updates enabled
      const { data: campaigns, error } = await supabase
        .from('youtube_campaigns')
        .select('id')
        .eq('weekly_updates_enabled', true)
        .in('status', ['active', 'pending']);

      if (error) {
        request.log.error('Failed to fetch campaigns:', error);
        return reply.code(500).send({ ok: false, message: 'Failed to fetch campaigns' });
      }

      const results = {
        total: campaigns?.length || 0,
        success: 0,
        failed: 0,
        errors: [] as string[],
      };

      // Send updates for each campaign
      for (const campaign of campaigns || []) {
        try {
          const response = await server.inject({
            method: 'POST',
            url: '/api/weekly-updates/send',
            payload: { campaign_id: campaign.id, mode: 'scheduled' },
          });

          if (response.statusCode === 200) {
            results.success++;
          } else {
            results.failed++;
            results.errors.push(`Campaign ${campaign.id}: ${response.payload}`);
          }
        } catch (err) {
          results.failed++;
          results.errors.push(`Campaign ${campaign.id}: ${String(err)}`);
        }
      }

      request.log.info(`Weekly updates batch complete: ${results.success}/${results.total} succeeded`);
      return reply.code(200).send({ ok: true, results });
    } catch (error) {
      request.log.error('Error in batch weekly updates:', error);
      return reply.code(500).send({ ok: false, message: 'Failed to process batch updates' });
    }
  });
}
