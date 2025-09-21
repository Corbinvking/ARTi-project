import { createClient } from '@supabase/supabase-js';
import { logger } from './logger';

if (!process.env.SUPABASE_URL) {
  throw new Error('Missing SUPABASE_URL environment variable');
}

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable');
}

export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      headers: {
        'x-application-name': 'arti-marketing-ops-api',
      },
    },
  }
);

// Test connection on startup
(async () => {
  try {
    const { error } = await supabase
      .from('orgs')
      .select('id')
      .limit(1);
    
    if (error && !error.message.includes('relation "orgs" does not exist')) {
      logger.error({ error }, 'Supabase connection test failed');
    } else {
      logger.info('Supabase connection established');
    }
  } catch (err) {
    logger.error({ err }, 'Supabase connection error');
  }
})();
