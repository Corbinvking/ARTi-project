import { FastifyInstance } from 'fastify';
import { createHmac, timingSafeEqual, randomUUID } from 'crypto';

const crypto = { randomUUID };

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
      const headers: Record<string, string> = {
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
}
