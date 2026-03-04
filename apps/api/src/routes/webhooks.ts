import { FastifyInstance } from 'fastify';
import { createHmac, createVerify, timingSafeEqual, randomUUID } from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { validateRequest } from 'twilio';

const crypto = { randomUUID };

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

// Maps provider status strings to our canonical status enum
const SENDGRID_STATUS_MAP: Record<string, string> = {
  processed: 'sent',
  delivered: 'delivered',
  open: 'opened',
  bounce: 'bounced',
  dropped: 'failed',
  deferred: 'queued',
  spamreport: 'failed',
};

const TWILIO_STATUS_MAP: Record<string, string> = {
  queued: 'queued',
  sent: 'sent',
  delivered: 'delivered',
  read: 'delivered',
  failed: 'failed',
  undelivered: 'failed',
};

export async function webhookRoutes(server: FastifyInstance) {
  // n8n test webhook endpoint
  server.post('/n8n', async (request, reply) => {
    const signature = request.headers['x-signature'] as string;
    const body = JSON.stringify(request.body);
    
    // Verify HMAC signature if webhook secret is configured
    if (process.env.WEBHOOK_SECRET && signature) {
      const expectedSignature = createHmac('sha256', process.env.WEBHOOK_SECRET)
        .update(body)
        .digest('hex');
      
      const providedSignature = signature.startsWith('sha256=') 
        ? signature.slice(7) 
        : signature;

      if (!timingSafeEqual(
        Buffer.from(expectedSignature, 'hex'),
        Buffer.from(providedSignature, 'hex')
      )) {
        request.log.warn({ 
          provided: providedSignature.slice(0, 8) + '...',
          expected: expectedSignature.slice(0, 8) + '...',
        }, 'Webhook signature verification failed');
        
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'Invalid webhook signature',
        });
      }
    }

    request.log.info({ 
      body: request.body,
      headers: {
        'content-type': request.headers['content-type'],
        'user-agent': request.headers['user-agent'],
      },
    }, 'Webhook received from n8n');

    return {
      status: 'received',
      timestamp: new Date().toISOString(),
      payload: request.body,
    };
  });

  // Outbound webhook test endpoint (for testing n8n connectivity)
  server.post('/test-outbound', async (request, reply) => {
    const n8nWebhookUrl = process.env.N8N_WEBHOOK_URL;
    
    if (!n8nWebhookUrl) {
      return reply.status(400).send({
        error: 'N8N_WEBHOOK_URL not configured',
      });
    }

    const testPayload = {
      event_id: crypto.randomUUID(),
      type: 'test.event',
      timestamp: new Date().toISOString(),
      data: request.body || { message: 'Test webhook from API' },
    };

    try {
      // Sign the payload if secret is available
      let headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'User-Agent': 'arti-marketing-ops-api/1.0.0',
      };

      if (process.env.WEBHOOK_SECRET) {
        const signature = createHmac('sha256', process.env.WEBHOOK_SECRET)
          .update(JSON.stringify(testPayload))
          .digest('hex');
        headers['x-signature'] = `sha256=${signature}`;
      }

      const response = await fetch(n8nWebhookUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(testPayload),
      });

      const responseText = await response.text();

      return {
        status: 'sent',
        n8nResponse: {
          status: response.status,
          statusText: response.statusText,
          body: responseText,
        },
        payload: testPayload,
      };

    } catch (err) {
      request.log.error({ err }, 'Failed to send webhook to n8n');
      return reply.status(500).send({
        error: 'Failed to send webhook',
        message: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  });

  // ---------------------------------------------------------------------------
  // SendGrid Event Webhook — delivery status updates
  // ---------------------------------------------------------------------------
  server.post('/sendgrid', {
    config: { rawBody: true },
  }, async (request, reply) => {
    const verificationKey = process.env.SENDGRID_WEBHOOK_VERIFICATION_KEY;

    if (verificationKey) {
      const signature = request.headers['x-twilio-email-event-webhook-signature'] as string;
      const timestamp = request.headers['x-twilio-email-event-webhook-timestamp'] as string;

      if (!signature || !timestamp) {
        return reply.status(401).send({ error: 'Missing webhook signature headers' });
      }

      try {
        const payload = timestamp + (typeof request.body === 'string'
          ? request.body
          : JSON.stringify(request.body));

        const decodedKey = Buffer.from(verificationKey, 'base64');

        const verifier = createVerify('sha256');
        verifier.update(payload);
        verifier.end();

        const valid = verifier.verify(
          { key: decodedKey, format: 'der', type: 'spki' },
          signature,
          'base64',
        );

        if (!valid) {
          request.log.warn('SendGrid webhook signature verification failed');
          return reply.status(401).send({ error: 'Invalid webhook signature' });
        }
      } catch (err) {
        request.log.error({ err }, 'SendGrid signature verification error');
        return reply.status(401).send({ error: 'Signature verification error' });
      }
    }

    const events = Array.isArray(request.body) ? request.body : [request.body];
    let updated = 0;

    for (const event of events) {
      const sgMessageId = event.sg_message_id?.split('.')[0];
      const mappedStatus = SENDGRID_STATUS_MAP[event.event];

      if (!sgMessageId || !mappedStatus) continue;

      const { error } = await supabase
        .from('outbound_messages')
        .update({ status: mappedStatus })
        .eq('provider_message_id', sgMessageId);

      if (!error) updated++;
    }

    request.log.info({ eventCount: events.length, updated }, 'SendGrid webhook processed');
    return { received: events.length, updated };
  });

  // ---------------------------------------------------------------------------
  // Twilio Status Callback — WhatsApp delivery status updates
  // ---------------------------------------------------------------------------
  server.post('/twilio', async (request, reply) => {
    const authToken = process.env.TWILIO_AUTH_TOKEN;

    if (authToken) {
      const twilioSignature = request.headers['x-twilio-signature'] as string;
      if (!twilioSignature) {
        return reply.status(401).send({ error: 'Missing Twilio signature' });
      }

      const webhookBase = process.env.PUBLIC_WEBHOOK_BASE_URL || 'http://localhost:3001';
      const url = `${webhookBase}/webhooks/twilio`;

      const params = (request.body && typeof request.body === 'object')
        ? request.body as Record<string, string>
        : {};

      const valid = validateRequest(authToken, twilioSignature, url, params);
      if (!valid) {
        request.log.warn('Twilio webhook signature verification failed');
        return reply.status(401).send({ error: 'Invalid Twilio signature' });
      }
    }

    const body = request.body as Record<string, string>;
    const messageSid = body.MessageSid;
    const messageStatus = body.MessageStatus;

    if (!messageSid || !messageStatus) {
      return reply.status(400).send({ error: 'Missing MessageSid or MessageStatus' });
    }

    const mappedStatus = TWILIO_STATUS_MAP[messageStatus];
    if (!mappedStatus) {
      request.log.warn({ messageStatus }, 'Unknown Twilio status');
      return { received: true, mapped: false };
    }

    const { error } = await supabase
      .from('outbound_messages')
      .update({ status: mappedStatus })
      .eq('provider_message_id', messageSid);

    if (error) {
      request.log.error({ error, messageSid }, 'Failed to update outbound message');
    }

    request.log.info({ messageSid, messageStatus, mappedStatus }, 'Twilio webhook processed');
    return { received: true, updated: !error };
  });
}
