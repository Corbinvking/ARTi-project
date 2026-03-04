/**
 * Template registry: maps application-level template keys to provider-specific
 * template IDs (SendGrid) and content builders (WhatsApp).
 */

// ---------------------------------------------------------------------------
// Email — SendGrid Dynamic Templates
// ---------------------------------------------------------------------------

export const EMAIL_TEMPLATES: Record<string, string> = {
  welcome: process.env.SENDGRID_TEMPLATE_WELCOME || '',
  password_reset: process.env.SENDGRID_TEMPLATE_PASSWORD_RESET || '',
  campaign_update: process.env.SENDGRID_TEMPLATE_CAMPAIGN_UPDATE || '',
};

export function resolveEmailTemplate(key: string): string {
  const templateId = EMAIL_TEMPLATES[key];
  if (!templateId) {
    throw new Error(`Unknown email template key: "${key}"`);
  }
  return templateId;
}

// ---------------------------------------------------------------------------
// WhatsApp — content builders
// ---------------------------------------------------------------------------

export type WhatsAppContentBuilder = (data: Record<string, unknown>) => string;

export const WHATSAPP_TEMPLATES: Record<string, WhatsAppContentBuilder> = {
  welcome: (d) =>
    `Welcome to ARTi, ${d.name ?? 'there'}! Your account is ready.`,

  password_reset: (d) =>
    `Your password reset code is: ${d.code ?? '------'}. It expires in 15 minutes.`,

  campaign_update: (d) =>
    `Campaign "${d.campaignName ?? 'Unknown'}" update: ${d.message ?? 'No details provided.'}`,
};

export function resolveWhatsAppContent(
  key: string,
  data: Record<string, unknown>,
): string {
  const builder = WHATSAPP_TEMPLATES[key];
  if (!builder) {
    throw new Error(`Unknown WhatsApp template key: "${key}"`);
  }
  return builder(data);
}
