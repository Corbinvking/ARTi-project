import { FastifyInstance } from 'fastify';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);

const SCRAPER_PATH = '/root/arti-marketing-ops/spotify_scraper';

export async function scraperControlRoutes(server: FastifyInstance) {
  // Get health status (runs health check)
  server.get('/scraper/health', async (request, reply) => {
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
  server.get('/scraper/status', async (request, reply) => {
    try {
      // Check if scraper is running
      let isRunning = false;
      try {
        const { stdout } = await execAsync('ps aux | grep run_production_scraper | grep -v grep');
        isRunning = !!stdout.trim();
      } catch {}

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
          lastRun = JSON.parse(lines[lines.length - 1]);
        }
      } catch {}

      // Check cron schedule
      let cronScheduled = false;
      let cronSchedule = null;
      try {
        const { stdout } = await execAsync('crontab -l');
        const lines = stdout.split('\n');
        const scraperLine = lines.find(l => l.includes('run_production_scraper'));
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
  server.post('/scraper/trigger', async (request, reply) => {
    try {
      // Check if already running
      try {
        const { stdout: psOutput } = await execAsync('ps aux | grep run_production_scraper | grep -v grep');
        if (psOutput.trim()) {
          reply.code(409);
          return { 
            error: 'Scraper is already running',
            isRunning: true 
          };
        }
      } catch {}

      // Trigger in background
      exec(`cd ${SCRAPER_PATH} && bash run_production_scraper.sh >> logs/manual_run.log 2>&1 &`);
      
      return { 
        success: true, 
        message: 'Scraper triggered successfully',
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
      const logType = request.query.type || 'production';
      const lines = parseInt(request.query.lines || '100');

      const logFiles: Record<string, string> = {
        production: 'logs/production.log',
        errors: 'logs/errors.log',
        cron: 'logs/cron.log',
      };

      const logFile = logFiles[logType] || logFiles.production;
      const logPath = path.join(SCRAPER_PATH, logFile);
      
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

