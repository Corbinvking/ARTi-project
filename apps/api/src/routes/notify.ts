import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import { sendEmail } from '../lib/notifications/sendgrid.js';
import { sendWhatsApp } from '../lib/notifications/twilio-whatsapp.js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const notifyBodySchema = z.object({
  to: z.string().min(1),
  templateKey: z.string().min(1),
  data: z.record(z.unknown()).default({}),
  idempotencyKey: z.string().min(1),
});

type NotifyBody = z.infer<typeof notifyBodySchema>;

async function findExisting(idempotencyKey: string) {
  const { data } = await supabase
    .from('outbound_messages')
    .select('*')
    .eq('idempotency_key', idempotencyKey)
    .maybeSingle();
  return data;
}

async function insertQueued(
  channel: 'email' | 'whatsapp',
  provider: 'sendgrid' | 'twilio',
  body: NotifyBody,
) {
  const { data, error } = await supabase
    .from('outbound_messages')
    .insert({
      channel,
      recipient: body.to,
      template_key: body.templateKey,
      provider,
      status: 'queued',
      idempotency_key: body.idempotencyKey,
      payload_json: body.data,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function markSent(id: string, providerMessageId: string) {
  await supabase
    .from('outbound_messages')
    .update({
      status: 'sent',
      provider_message_id: providerMessageId,
    })
    .eq('id', id);
}

async function markFailed(id: string, errorMessage: string) {
  await supabase
    .from('outbound_messages')
    .update({
      status: 'failed',
      error_message: errorMessage,
    })
    .eq('id', id);
}

export async function notifyRoutes(server: FastifyInstance) {
  // -----------------------------------------------------------------------
  // POST /notify/email
  // -----------------------------------------------------------------------
  server.post('/notify/email', async (request, reply) => {
    const parsed = notifyBodySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: 'Validation failed',
        details: parsed.error.flatten(),
      });
    }
    const body = parsed.data;

    const existing = await findExisting(body.idempotencyKey);
    if (existing) {
      return reply.status(200).send({
        message: 'Duplicate request — already processed',
        outboundMessage: existing,
      });
    }

    const row = await insertQueued('email', 'sendgrid', body);

    try {
      const result = await sendEmail({
        to: body.to,
        templateKey: body.templateKey,
        data: body.data,
      });
      await markSent(row.id, result.messageId);

      return reply.status(200).send({
        message: 'Email sent',
        outboundMessage: { ...row, status: 'sent', provider_message_id: result.messageId },
      });
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Unknown error';
      request.log.error({ err, idempotencyKey: body.idempotencyKey }, 'Email send failed');
      await markFailed(row.id, errMsg);

      return reply.status(502).send({
        error: 'Email delivery failed',
        message: errMsg,
        outboundMessage: { ...row, status: 'failed', error_message: errMsg },
      });
    }
  });

  // -----------------------------------------------------------------------
  // POST /notify/whatsapp
  // -----------------------------------------------------------------------
  server.post('/notify/whatsapp', async (request, reply) => {
    const parsed = notifyBodySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: 'Validation failed',
        details: parsed.error.flatten(),
      });
    }
    const body = parsed.data;

    const existing = await findExisting(body.idempotencyKey);
    if (existing) {
      return reply.status(200).send({
        message: 'Duplicate request — already processed',
        outboundMessage: existing,
      });
    }

    const row = await insertQueued('whatsapp', 'twilio', body);

    try {
      const result = await sendWhatsApp({
        to: body.to,
        templateKey: body.templateKey,
        data: body.data,
      });
      await markSent(row.id, result.messageSid);

      return reply.status(200).send({
        message: 'WhatsApp message sent',
        outboundMessage: { ...row, status: 'sent', provider_message_id: result.messageSid },
      });
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Unknown error';
      request.log.error({ err, idempotencyKey: body.idempotencyKey }, 'WhatsApp send failed');
      await markFailed(row.id, errMsg);

      return reply.status(502).send({
        error: 'WhatsApp delivery failed',
        message: errMsg,
        outboundMessage: { ...row, status: 'failed', error_message: errMsg },
      });
    }
  });
}
