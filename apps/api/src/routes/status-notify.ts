import { FastifyInstance } from 'fastify';
import nodemailer from 'nodemailer';

type StatusNotifyBody = {
  service?: string;
  campaignId?: string;
  status?: string;
  previousStatus?: string | null;
  campaignName?: string | null;
  actorEmail?: string | null;
};

type CampaignCreatedNotifyBody = {
  service?: string;
  campaignId?: string;
  campaignName?: string;
  youtubeUrl?: string | null;
  clientName?: string | null;
  actorEmail?: string | null;
  eventType?: string;
};

const parseRecipients = (value?: string) =>
  (value || '')
    .split(',')
    .map((email) => email.trim())
    .filter(Boolean);

export async function statusNotifyRoutes(server: FastifyInstance) {
  server.post('/status-notify', async (request, reply) => {
    const body = request.body as StatusNotifyBody;
    const { service, campaignId, status, previousStatus, campaignName, actorEmail } = body;

    if (!service || !campaignId || !status) {
      return reply.code(400).send({ ok: false, message: 'Missing required fields' });
    }

    const recipients =
      parseRecipients(process.env.OPS_NOTIFICATION_EMAILS) ||
      (actorEmail ? [actorEmail] : []);

    if (!recipients.length) {
      request.log.warn('No ops notification recipients configured.');
      return reply.code(200).send({ ok: true, message: 'No recipients configured' });
    }

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

    const from = process.env.SMTP_FROM || process.env.SMTP_USER || 'ops@artistinfluence.com';
    const subject = `[Status] ${service} campaign ${campaignId} -> ${status}`;
    const text = [
      `Service: ${service}`,
      `Campaign: ${campaignName || campaignId}`,
      `Status: ${status}`,
      previousStatus ? `Previous: ${previousStatus}` : null,
      actorEmail ? `Changed by: ${actorEmail}` : null,
    ]
      .filter(Boolean)
      .join('\n');

    await transporter.sendMail({
      from,
      to: recipients,
      subject,
      text,
    });

    return reply.code(200).send({ ok: true });
  });

  // Notify ops when a new campaign is created
  server.post('/campaign-created-notify', async (request, reply) => {
    const body = request.body as CampaignCreatedNotifyBody;
    const { service, campaignId, campaignName, youtubeUrl, clientName, actorEmail } = body;

    if (!service || !campaignId || !campaignName) {
      return reply.code(400).send({ ok: false, message: 'Missing required fields' });
    }

    const recipients =
      parseRecipients(process.env.OPS_NOTIFICATION_EMAILS) ||
      (actorEmail ? [actorEmail] : []);

    if (!recipients.length) {
      request.log.warn('No ops notification recipients configured.');
      return reply.code(200).send({ ok: true, message: 'No recipients configured' });
    }

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

    const from = process.env.SMTP_FROM || process.env.SMTP_USER || 'ops@artistinfluence.com';
    const subject = `[New Campaign] ${service}: ${campaignName}`;
    const text = [
      `A new ${service} campaign has been created and needs attention.`,
      '',
      `Campaign: ${campaignName}`,
      `Campaign ID: ${campaignId}`,
      youtubeUrl ? `YouTube URL: ${youtubeUrl}` : null,
      clientName ? `Client: ${clientName}` : null,
      actorEmail ? `Created by: ${actorEmail}` : null,
      '',
      'Next Steps:',
      '1. Review the campaign details',
      '2. Complete technical setup if needed',
      '3. Notify the comment scraper if comments are needed',
      '4. Mark the campaign as Ready when setup is complete',
    ]
      .filter(Boolean)
      .join('\n');

    await transporter.sendMail({
      from,
      to: recipients,
      subject,
      text,
    });

    return reply.code(200).send({ ok: true });
  });
}
