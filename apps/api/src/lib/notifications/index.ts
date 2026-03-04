export { sendEmail } from './sendgrid.js';
export type { SendEmailParams, SendEmailResult } from './sendgrid.js';

export { sendWhatsApp } from './twilio-whatsapp.js';
export type { SendWhatsAppParams, SendWhatsAppResult } from './twilio-whatsapp.js';

export {
  resolveEmailTemplate,
  resolveWhatsAppContent,
  EMAIL_TEMPLATES,
  WHATSAPP_TEMPLATES,
} from './templates.js';
