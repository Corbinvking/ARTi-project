import { FastifyInstance } from 'fastify';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);

// Use different paths depending on environment
// In Docker: /app/scraper_data (mounted volume)
// On host: /root/arti-marketing-ops/spotify_scraper (for direct script execution)
const SCRAPER_PATH = process.env.NODE_ENV === 'production' && process.env.DOCKER_ENV === 'true'
  ? '/app/scraper_data'
  : '/root/arti-marketing-ops/spotify_scraper';

export async function scraperControlRoutes(server: FastifyInstance) {
  // Get health status (runs health check)
  server.get('/scraper/health', async (_request, reply) => {
    try {
      // Run health check script
      await execAsync(`cd ${SCRAPER_PATH} && bash run_health_check.sh`);
      
      // Read results
      const healthData = await fs.readFile(
        path.join(SCRAPER_PATH, 'health_status.json'),
        'utf-8'
      );
      
      return JSON.parse(healthData);
    } catch (error: any) {
      // Health check failed
      try {
        const healthData = await fs.readFile(
          path.join(SCRAPER_PATH, 'health_status.json'),
          'utf-8'
        );
        reply.code(503);
        return JSON.parse(healthData);
      } catch {
        reply.code(500);
        return { 
          error: 'Health check failed',
          overall_status: 'unhealthy',
          message: error.message 
        };
      }
    }
  });

  // Get scraper status (quick check without running health)
  server.get('/scraper/status', async (_request, reply) => {
    try {
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
      } catch {}

      // Read last run from status.jsonl
      let lastRun = null;
      try {
        const statusFile = await fs.readFile(
          path.join(SCRAPER_PATH, 'status.jsonl'),
          'utf-8'
        );
        const lines = statusFile.trim().split('\n').filter(Boolean);
        if (lines.length > 0) {
          const lastLine = lines[lines.length - 1];
          if (lastLine) {
            lastRun = JSON.parse(lastLine);
          }
        }
      } catch {}

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
      } catch {}

      return {
        isRunning,
        lastRun,
        cronScheduled,
        cronSchedule,
        lastHealthCheck: healthData,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      reply.code(500);
      return { error: 'Failed to get status' };
    }
  });

  // Trigger manual scraper run
  server.post('/scraper/trigger', async (_request, reply) => {
    try {
      // Check if already running (check lock file)
      try {
        await fs.access(path.join(SCRAPER_PATH, 'scraper.lock'));
        reply.code(409);
        return { 
          error: 'Scraper is already running (lock file exists)',
          isRunning: true 
        };
      } catch {}

      // Create a trigger file that the host's cron/watchdog can pick up
      // This allows the API to trigger runs even from within Docker
      const triggerFile = path.join(SCRAPER_PATH, 'trigger_manual_run.flag');
      await fs.writeFile(triggerFile, JSON.stringify({
        triggered_at: new Date().toISOString(),
        triggered_by: 'admin_ui'
      }));
      
      return { 
        success: true, 
        message: 'Scraper trigger requested - will start shortly if watchdog is running',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      reply.code(500);
      return { error: 'Failed to trigger scraper' };
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

