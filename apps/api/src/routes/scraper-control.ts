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
      
      // Check if status.jsonl exists and is readable
      try {
        await fs.access(path.join(SCRAPER_PATH, 'status.jsonl'));
        checks.status_file = '✓ OK';
      } catch {
        checks.status_file = '✗ FAIL: status.jsonl not found';
        errors.push('Status file not accessible');
      }
      
      // Check if logs directory exists
      try {
        await fs.access(path.join(SCRAPER_PATH, 'logs'));
        checks.logs_directory = '✓ OK';
      } catch {
        checks.logs_directory = '✗ FAIL: logs directory not found';
        errors.push('Logs directory not accessible');
      }
      
      // Check if lock file exists (scraper running)
      try {
        await fs.access(path.join(SCRAPER_PATH, 'scraper.lock'));
        checks.lock_file = '⚠ WARNING: Lock file exists (scraper may be running)';
      } catch {
        checks.lock_file = '✓ OK: No lock file (scraper not running)';
      }
      
      // Check if we can read recent logs
      try {
        const prodLog = await fs.readFile(path.join(SCRAPER_PATH, 'logs/production.log'), 'utf-8');
        const lines = prodLog.trim().split('\n');
        checks.production_log = `✓ OK: ${lines.length} log lines`;
      } catch {
        checks.production_log = '⚠ WARNING: Cannot read production log';
      }
      
      // Read last health check if available
      let savedHealthData = null;
      try {
        const data = await fs.readFile(
          path.join(SCRAPER_PATH, 'health_status.json'),
          'utf-8'
        );
        savedHealthData = JSON.parse(data);
        checks.saved_health_check = `✓ OK: Last check ${savedHealthData.timestamp}`;
      } catch {
        checks.saved_health_check = '⚠ INFO: No saved health check found';
      }
      
      // Determine overall status
      const hasErrors = errors.length > 0;
      const hasWarnings = Object.values(checks).some(v => v.includes('WARNING'));
      const overall_status = hasErrors ? 'unhealthy' : hasWarnings ? 'degraded' : 'healthy';
      
      const result = {
        timestamp: new Date().toISOString(),
        checks,
        overall_status,
        errors,
        saved_health_check: savedHealthData
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
      
      // Check if scraper is running (check for both script name and lock file)
      let isRunning = false;
      try {
        // Check for running process
        const { stdout } = await execAsync('ps aux | grep "run_scraper_with_monitoring\\|run_production_scraper" | grep -v grep');
        isRunning = !!stdout.trim();
      } catch {}
      
      // Also check lock file
      if (!isRunning) {
        try {
          await fs.access(path.join(SCRAPER_PATH, 'scraper.lock'));
          isRunning = true;
        } catch {}
      }

      // Read last health check results
      let healthData = null;
      try {
        const data = await fs.readFile(
          path.join(SCRAPER_PATH, 'health_status.json'),
          'utf-8'
        );
        healthData = JSON.parse(data);
        logger.info('✅ Health data loaded');
      } catch (err) {
        logger.warn({ error: (err as Error).message }, '⚠️ Could not load health data');
      }

      // Read last run from status.jsonl
      let lastRun = null;
      try {
        const statusPath = path.join(SCRAPER_PATH, 'status.jsonl');
        logger.info({ statusPath }, '📁 Reading status file');
        const statusFile = await fs.readFile(statusPath, 'utf-8');
        logger.info({ length: statusFile.length }, '📄 Status file read');
        const lines = statusFile.trim().split('\n').filter(Boolean);
        logger.info({ count: lines.length }, '📊 Status lines parsed');
        if (lines.length > 0) {
          const lastLine = lines[lines.length - 1];
          logger.info({ lastLine }, '📝 Last status line');
          if (lastLine) {
            lastRun = JSON.parse(lastLine);
            logger.info({ lastRun }, '✅ Last run parsed');
          }
        }
      } catch (err) {
        logger.warn({ error: (err as Error).message }, '⚠️ Could not load status');
      }

      // ALSO check database for most recent scrape time (more reliable)
      let lastScrapedFromDb = null;
      try {
        const { data, error } = await supabase
          .from('spotify_campaigns')
          .select('last_scraped_at')
          .not('last_scraped_at', 'is', null)
          .order('last_scraped_at', { ascending: false })
          .limit(1)
          .single();

        if (!error && data?.last_scraped_at) {
          lastScrapedFromDb = {
            timestamp: data.last_scraped_at,
            status: 'success',
            source: 'database'
          };
          logger.info({ lastScrapedFromDb }, '✅ Last scrape from database');
        }
      } catch (err) {
        logger.warn({ error: (err as Error).message }, '⚠️ Could not query database for last scrape');
      }

      // Use the most recent of the two sources
      if (lastScrapedFromDb && lastScrapedFromDb.timestamp) {
        const dbTime = new Date(lastScrapedFromDb.timestamp).getTime();
        const fileTime = lastRun?.timestamp ? new Date(lastRun.timestamp).getTime() : 0;
        
        if (dbTime > fileTime) {
          logger.info('📊 Using database timestamp (more recent than status file)');
          lastRun = lastScrapedFromDb;
        }
      }

      // Check cron schedule
      let cronScheduled = false;
      let cronSchedule = null;
      try {
        const { stdout } = await execAsync('crontab -l');
        const lines = stdout.split('\n');
        const scraperLine = lines.find(l => l.includes('run_scraper_with_monitoring') || l.includes('run_production_scraper'));
        if (scraperLine) {
          cronScheduled = true;
          cronSchedule = scraperLine.trim();
        }
      } catch (err) {
        logger.warn({ error: (err as Error).message }, '⚠️ Could not check cron');
      }

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
          dockerEnv: process.env.DOCKER_ENV
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


