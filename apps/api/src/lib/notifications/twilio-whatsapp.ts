import Twilio from 'twilio';
import { resolveWhatsAppContent } from './templates.js';

let client: ReturnType<typeof Twilio> | null = null;

function getClient(): ReturnType<typeof Twilio> {
  if (client) return client;
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) {
    throw new Error('TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN are required');
  }
  client = Twilio(sid, token);
  return client;
}

export interface SendWhatsAppParams {
  to: string;
  templateKey: string;
  data: Record<string, unknown>;
}

export interface SendWhatsAppResult {
  messageSid: string;
}

/**
 * Send a WhatsApp message via Twilio Programmable Messaging.
 * The `to` field should be a plain phone number (e.g. +15551234567);
 * the whatsapp: prefix is added automatically.
 */
export async function sendWhatsApp(
  params: SendWhatsAppParams,
): Promise<SendWhatsAppResult> {
  const twilioClient = getClient();
  const from = process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+14155238886';

  const body = resolveWhatsAppContent(params.templateKey, params.data);

  const toNumber = params.to.startsWith('whatsapp:')
    ? params.to
    : `whatsapp:${params.to}`;

  const message = await twilioClient.messages.create({
    from,
    to: toNumber,
    body,
  });

  return { messageSid: message.sid };
}
