import sgMail from '@sendgrid/mail';
import { resolveEmailTemplate } from './templates.js';

let initialized = false;

function ensureInit() {
  if (initialized) return;
  const apiKey = process.env.SENDGRID_API_KEY;
  if (!apiKey) throw new Error('SENDGRID_API_KEY is not configured');
  sgMail.setApiKey(apiKey);
  initialized = true;
}

export interface SendEmailParams {
  to: string;
  templateKey: string;
  data: Record<string, unknown>;
}

export interface SendEmailResult {
  messageId: string;
}

/**
 * Send a transactional email via SendGrid Dynamic Templates.
 * Returns the provider message ID on success.
 */
export async function sendEmail(
  params: SendEmailParams,
): Promise<SendEmailResult> {
  ensureInit();

  const templateId = resolveEmailTemplate(params.templateKey);
  const fromEmail = process.env.SENDGRID_FROM_EMAIL || 'noreply@artistinfluence.com';

  const [response] = await sgMail.send({
    to: params.to,
    from: fromEmail,
    templateId,
    dynamicTemplateData: params.data,
  });

  const messageId =
    response.headers['x-message-id']?.toString() ?? '';

  return { messageId };
}
