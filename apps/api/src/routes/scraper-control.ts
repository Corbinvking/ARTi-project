import { FastifyInstance } from 'fastify';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import { logger } from '../lib/logger.js';
import { supabase } from '../lib/supabase.js';

const execAsync = promisify(exec);

// Use different paths depending on environment
// In Docker: /app/scraper_data (mounted volume)
// On host: /root/arti-marketing-ops/spotify_scraper (for direct script execution)
const SCRAPER_PATH = process.env.NODE_ENV === 'production' && process.env.DOCKER_ENV === 'true'
  ? '/app/scraper_data'
  : '/root/arti-marketing-ops/spotify_scraper';

export async function scraperControlRoutes(server: FastifyInstance) {
  // Get health status (lightweight check from Docker)
  server.get('/scraper/health', async (_request, reply) => {
    try {
      logger.info('Running lightweight health check from API');
      
      const checks: Record<string, string> = {};
      const errors: string[] = [];
      
      // Check database connectivity and get last scrape time
      try {
        const { data, error } = await supabase
          .from('spotify_campaigns')
          .select('last_scraped_at')
          .not('last_scraped_at', 'is', null)
          .order('last_scraped_at', { ascending: false })
          .limit(1)
          .single();

        if (error) {
          checks.database = `✗ FAIL: ${error.message}`;
          errors.push('Database connection failed');
        } else if (data?.last_scraped_at) {
          const lastScrape = new Date(data.last_scraped_at);
          const hoursAgo = Math.floor((Date.now() - lastScrape.getTime()) / (1000 * 60 * 60));
          if (hoursAgo < 36) {
            checks.database = `✓ OK: Last scrape ${hoursAgo}h ago`;
          } else {
            checks.database = `⚠ WARNING: Last scrape ${hoursAgo}h ago (stale)`;
          }
          checks.last_scrape = lastScrape.toISOString();
        } else {
          checks.database = '⚠ WARNING: No scrape data found';
        }
      } catch (err) {
        checks.database = `✗ FAIL: ${(err as Error).message}`;
        errors.push('Database query failed');
      }
      
      // Check if lock file exists (scraper running)
      try {
        await fs.access(path.join(SCRAPER_PATH, 'scraper.lock'));
        checks.scraper_status = '🔄 Running (lock file present)';
      } catch {
        checks.scraper_status = '✓ Idle (ready to run)';
      }
      
      // Check if logs directory exists and has recent logs
      try {
        const prodLog = await fs.readFile(path.join(SCRAPER_PATH, 'logs/production.log'), 'utf-8');
        const lines = prodLog.trim().split('\n');
        const lastLine = lines[lines.length - 1] || '';
        // Try to extract timestamp from last log line
        const timestampMatch = lastLine.match(/\d{4}-\d{2}-\d{2}/);
        checks.logs = `✓ OK: ${lines.length} lines${timestampMatch ? `, last: ${timestampMatch[0]}` : ''}`;
      } catch {
        checks.logs = '⚠ INFO: Logs not accessible from API (normal in Docker)';
      }

      // Cron runs on the host
      checks.cron = '✓ Scheduled on host (daily at 2 AM UTC)';
      
      // Determine overall status based on database health primarily
      const hasErrors = errors.length > 0;
      const hasWarnings = Object.values(checks).some(v => v.includes('WARNING'));
      const overall_status = hasErrors ? 'unhealthy' : hasWarnings ? 'degraded' : 'healthy';
      
      const result = {
        timestamp: new Date().toISOString(),
        checks,
        overall_status,
        errors: errors.length > 0 ? errors : undefined
      };
      
      logger.info({ result }, 'Health check completed');
      
      if (overall_status === 'unhealthy') {
        reply.code(503);
      }
      
      return result;
    } catch (error: any) {
      logger.error({ error: error.message }, 'Health check failed');
      reply.code(500);
      return { 
        error: 'Health check failed',
        overall_status: 'unhealthy',
        message: error.message 
      };
    }
  });

  // Get scraper status (quick check without running health)
  server.get('/scraper/status', async (_request, reply) => {
    try {
      logger.info({ scraperPath: SCRAPER_PATH }, '📊 Status check');
      
      // Check if scraper is running (check lock file - works in Docker)
      let isRunning = false;
      try {
        await fs.access(path.join(SCRAPER_PATH, 'scraper.lock'));
        isRunning = true;
        logger.info('🔒 Lock file found - scraper is running');
      } catch {
        logger.info('✅ No lock file - scraper not running');
      }

      // PRIMARY SOURCE: Check database for most recent scrape time (most reliable)
      let lastRun = null;
      try {
        logger.info('🔍 Querying database for last scrape time...');
        const { data, error } = await supabase
          .from('spotify_campaigns')
          .select('last_scraped_at')
          .not('last_scraped_at', 'is', null)
          .order('last_scraped_at', { ascending: false })
          .limit(1)
          .single();

        if (error) {
          logger.warn({ error: error.message }, '⚠️ Database query error');
        } else if (data?.last_scraped_at) {
          lastRun = {
            timestamp: data.last_scraped_at,
            status: 'success',
            source: 'database'
          };
          logger.info({ lastRun }, '✅ Last scrape from database');
        } else {
          logger.warn('⚠️ No last_scraped_at found in database');
        }
      } catch (err) {
        logger.error({ error: (err as Error).message }, '❌ Database query failed');
      }

      // FALLBACK: Read last run from status.jsonl if database didn't return data
      if (!lastRun) {
        try {
          const statusPath = path.join(SCRAPER_PATH, 'status.jsonl');
          const statusFile = await fs.readFile(statusPath, 'utf-8');
          const lines = statusFile.trim().split('\n').filter(Boolean);
          if (lines.length > 0) {
            const lastLine = lines[lines.length - 1];
            if (lastLine) {
              lastRun = JSON.parse(lastLine);
              lastRun.source = 'status_file';
              logger.info({ lastRun }, '📁 Last run from status file (fallback)');
            }
          }
        } catch (err) {
          logger.warn({ error: (err as Error).message }, '⚠️ Could not load status file');
        }
      }

      // Read last health check results (if available)
      let healthData = null;
      try {
        const data = await fs.readFile(
          path.join(SCRAPER_PATH, 'health_status.json'),
          'utf-8'
        );
        healthData = JSON.parse(data);
        // Don't show stale health data (older than 24 hours)
        const healthTime = new Date(healthData.timestamp).getTime();
        const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
        if (healthTime < oneDayAgo) {
          logger.info('⚠️ Health data is stale (>24h old), ignoring');
          healthData = null;
        }
      } catch (err) {
        // Health data is optional, don't warn
      }

      // Cron is scheduled on the HOST, not in Docker - always show as scheduled
      // The host runs check_trigger.sh every minute via cron
      const cronScheduled = true;
      const cronSchedule = '0 2 * * * (Daily at 2 AM UTC)';

      const result = {
        isRunning,
        lastRun,
        cronScheduled,
        cronSchedule,
        lastHealthCheck: healthData,
        timestamp: new Date().toISOString(),
        // Debug info
        _debug: {
          scraperPath: SCRAPER_PATH,
          nodeEnv: process.env.NODE_ENV,
          dockerEnv: process.env.DOCKER_ENV,
          dataSource: lastRun?.source || 'none'
        }
      };
      
      logger.info({ result }, '📤 Returning scraper status');
      return result;
    } catch (error) {
      logger.error({ error }, '❌ Status check error');
      reply.code(500);
      return { error: 'Failed to get status' };
    }
  });

  // Trigger manual scraper run
  server.post('/scraper/trigger', async (_request, reply) => {
    try {
      logger.info({ scraperPath: SCRAPER_PATH }, '🚀 Trigger request received');
      
      // Check if already running (check lock file)
      const lockFile = path.join(SCRAPER_PATH, 'scraper.lock');
      try {
        await fs.access(lockFile);
        logger.warn('⚠️ Scraper already running (lock file exists)');
        reply.code(409);
        return { 
          error: 'Scraper is already running (lock file exists)',
          isRunning: true 
        };
      } catch {
        logger.info('✅ No lock file - scraper not running');
      }

      // Create a trigger file that the host's cron/watchdog can pick up
      // This allows the API to trigger runs even from within Docker
      const triggerFile = path.join(SCRAPER_PATH, 'trigger_manual_run.flag');
      const triggerData = JSON.stringify({
        triggered_at: new Date().toISOString(),
        triggered_by: 'admin_ui'
      });
      
      logger.info({ triggerFile }, '📝 Writing trigger file');
      await fs.writeFile(triggerFile, triggerData);
      
      // Verify file was written
      try {
        const written = await fs.readFile(triggerFile, 'utf-8');
        logger.info({ written }, '✅ Trigger file written and verified');
      } catch (verifyError) {
        logger.error({ error: verifyError }, '❌ Failed to verify trigger file');
      }
      
      return { 
        success: true, 
        message: 'Scraper trigger created - check_trigger.sh will pick it up within 1 minute',
        triggerFile,
        timestamp: new Date().toISOString()
      };
    } catch (error: any) {
      logger.error({ error: error.message, stack: error.stack }, '❌ Failed to trigger scraper');
      reply.code(500);
      return { 
        error: 'Failed to trigger scraper',
        details: error.message 
      };
    }
  });

  // Get logs
  server.get<{
    Querystring: {
      type?: string;
      lines?: string;
    }
  }>('/scraper/logs', async (request, reply) => {
    try {
      const logType = (request.query as any).type || 'production';
      const lines = parseInt((request.query as any).lines || '100');

      const logFiles: Record<string, string> = {
        production: 'logs/production.log',
        errors: 'logs/errors.log',
        cron: 'logs/cron.log',
      };

      const logFile = logFiles[logType as string] || logFiles.production;
      const logPath = path.join(SCRAPER_PATH, logFile!);
      
      const logContent = await fs.readFile(logPath, 'utf-8');
      const recentLines = logContent.trim().split('\n').slice(-lines);

      return {
        logs: recentLines,
        logType,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      reply.code(404);
      return { error: 'Log file not found', logs: [] };
    }
  });
}


