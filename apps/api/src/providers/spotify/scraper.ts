import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs/promises';
import { logger } from '../../lib/logger.js';

const execAsync = promisify(exec);

interface ScrapingResult {
  success: boolean;
  data?: any;
  error?: string;
  executionTime?: number;
  filepath?: string;
}

interface ScrapingJob {
  id: string;
  orgId: string;
  songUrls: string[];
  status: 'pending' | 'running' | 'completed' | 'failed';
  startedAt?: Date;
  completedAt?: Date;
  results?: ScrapingResult[];
  errorMessage?: string;
}

export class SpotifyScraperService {
  private scraperPath: string;
  private outputPath: string;
  private activeJobs: Map<string, ScrapingJob> = new Map();

  constructor() {
    // Path to your existing scraper
    this.scraperPath = path.resolve(process.cwd(), '../../spotify_scraper');
    this.outputPath = path.join(this.scraperPath, 'data');
  }

  /**
   * Start a scraping job for multiple songs
   */
  async startScrapingJob(orgId: string, songUrls: string[]): Promise<string> {
    const jobId = `spotify_${orgId}_${Date.now()}`;
    
    const job: ScrapingJob = {
      id: jobId,
      orgId,
      songUrls,
      status: 'pending',
    };

    this.activeJobs.set(jobId, job);
    
    // Start scraping in background
    this.executeScrapingJob(jobId).catch(error => {
      logger.error('Scraping job failed', { jobId, error: error.message });
      this.updateJobStatus(jobId, 'failed', error.message);
    });

    return jobId;
  }

  /**
   * Execute the scraping job using your existing Python scraper
   */
  private async executeScrapingJob(jobId: string): Promise<void> {
    const job = this.activeJobs.get(jobId);
    if (!job) throw new Error(`Job ${jobId} not found`);

    try {
      this.updateJobStatus(jobId, 'running');
      job.startedAt = new Date();

      // Create a temporary config file for this job
      const configPath = await this.createJobConfig(job);
      
      logger.info('Starting Spotify scraping job', { 
        jobId, 
        orgId: job.orgId, 
        songCount: job.songUrls.length 
      });

      // Execute your Python scraper
      const command = `cd ${this.scraperPath} && python run_multi_scraper_config.py --config ${configPath}`;
      const { stdout } = await execAsync(command, {
        timeout: 30 * 60 * 1000, // 30 minutes timeout
        maxBuffer: 1024 * 1024 * 10 // 10MB buffer
      });

      logger.info('Scraping completed', { jobId, stdout });

      // Parse results from the summary file
      const results = await this.parseScrapingResults(jobId);
      job.results = results;
      job.completedAt = new Date();

      this.updateJobStatus(jobId, 'completed');

      // Trigger webhook notification
      await this.notifyScrapingComplete(job);

    } catch (error: any) {
      logger.error('Scraping job execution failed', { 
        jobId, 
        error: error.message,
        stderr: error.stderr 
      });
      
      this.updateJobStatus(jobId, 'failed', error.message);
      throw error;
    }
  }

  /**
   * Create a temporary config file for the scraping job
   */
  private async createJobConfig(job: ScrapingJob): Promise<string> {
    const config = {
      songs: job.songUrls.map((url, index) => ({
        name: `Song ${index + 1} - Job ${job.id}`,
        url: url,
        timeRanges: ['28day', '7day', '12months']
      }))
    };

    const configPath = path.join(this.outputPath, `job_config_${job.id}.json`);
    await fs.writeFile(configPath, JSON.stringify(config, null, 2));
    
    return configPath;
  }

  /**
   * Parse scraping results from the summary file
   */
  private async parseScrapingResults(jobId: string): Promise<ScrapingResult[]> {
    try {
      // Look for the most recent summary file
      const summaryFiles = await fs.readdir(this.outputPath);
      const summaryFile = summaryFiles
        .filter(f => f.startsWith('scraping_summary_') && f.endsWith('.json'))
        .sort()
        .pop();

      if (!summaryFile) {
        throw new Error('No summary file found');
      }

      const summaryPath = path.join(this.outputPath, summaryFile);
      const summaryContent = await fs.readFile(summaryPath, 'utf-8');
      const summary = JSON.parse(summaryContent);

      return summary.songs.map((song: any) => ({
        success: song.success,
        data: song.success ? { 
          songName: song.song_name,
          songUrl: song.song_url,
          filepath: song.filepath,
          timestamp: song.timestamp
        } : null,
        error: song.success ? undefined : 'Scraping failed',
        filepath: song.filepath
      }));

    } catch (error: any) {
      logger.error('Failed to parse scraping results', { jobId, error: error.message });
      return [];
    }
  }

  /**
   * Get job status and results
   */
  getJobStatus(jobId: string): ScrapingJob | null {
    return this.activeJobs.get(jobId) || null;
  }

  /**
   * Get all jobs for an organization
   */
  getOrgJobs(orgId: string): ScrapingJob[] {
    return Array.from(this.activeJobs.values())
      .filter(job => job.orgId === orgId)
      .sort((a, b) => (b.startedAt?.getTime() || 0) - (a.startedAt?.getTime() || 0));
  }

  /**
   * Update job status
   */
  private updateJobStatus(jobId: string, status: ScrapingJob['status'], errorMessage?: string): void {
    const job = this.activeJobs.get(jobId);
    if (job) {
      job.status = status;
      if (errorMessage) job.errorMessage = errorMessage;
      if (status === 'completed' || status === 'failed') {
        job.completedAt = new Date();
      }
    }
  }

  /**
   * Get scraper health metrics
   */
  async getHealthMetrics(): Promise<{
    status: 'healthy' | 'unhealthy';
    activeJobs: number;
    completedJobs: number;
    failedJobs: number;
    averageExecutionTime: number;
    lastSuccessfulRun: Date | undefined;
  }> {
    const jobs = Array.from(this.activeJobs.values());
    const activeJobs = jobs.filter(j => j.status === 'running').length;
    const completedJobs = jobs.filter(j => j.status === 'completed').length;
    const failedJobs = jobs.filter(j => j.status === 'failed').length;
    
    const completedJobsWithTime = jobs.filter(j => 
      j.status === 'completed' && j.startedAt && j.completedAt
    );
    
    const averageExecutionTime = completedJobsWithTime.length > 0
      ? completedJobsWithTime.reduce((sum, job) => {
          const duration = job.completedAt!.getTime() - job.startedAt!.getTime();
          return sum + duration;
        }, 0) / completedJobsWithTime.length
      : 0;

    const lastSuccessfulRun = completedJobsWithTime
      .sort((a, b) => b.completedAt!.getTime() - a.completedAt!.getTime())[0]
      ?.completedAt;

    // Check if scraper dependencies are available
    const status = await this.checkScraperHealth();

    return {
      status,
      activeJobs,
      completedJobs,
      failedJobs,
      averageExecutionTime,
      lastSuccessfulRun
    };
  }

  /**
   * Check if scraper environment is healthy
   */
  private async checkScraperHealth(): Promise<'healthy' | 'unhealthy'> {
    try {
      // Check if Python and dependencies are available
      const { stdout } = await execAsync(`cd ${this.scraperPath} && python -c "import playwright; print('OK')"`);
      return stdout.trim() === 'OK' ? 'healthy' : 'unhealthy';
    } catch (error) {
      logger.error('Scraper health check failed', { error });
      return 'unhealthy';
    }
  }

  /**
   * Notify via webhook when scraping completes
   */
  private async notifyScrapingComplete(job: ScrapingJob): Promise<void> {
    try {
      // This will be implemented with our webhook system
      const eventData = {
        type: 'spotify.scraping.completed',
        orgId: job.orgId,
        jobId: job.id,
        songCount: job.songUrls.length,
        successCount: job.results?.filter(r => r.success).length || 0,
        failureCount: job.results?.filter(r => !r.success).length || 0,
        executionTime: job.completedAt && job.startedAt 
          ? job.completedAt.getTime() - job.startedAt.getTime()
          : null,
        timestamp: new Date().toISOString()
      };

      logger.info('Scraping job completed, webhook event prepared', eventData);
      
      // TODO: Dispatch to webhook system
      // await this.webhookDispatcher.dispatch(eventData);
      
    } catch (error: any) {
      logger.error('Failed to notify scraping completion', { 
        jobId: job.id, 
        error: error.message 
      });
    }
  }

  /**
   * Clean up old jobs and files
   */
  async cleanup(olderThanDays: number = 7): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    // Remove old jobs from memory
    for (const [jobId, job] of this.activeJobs.entries()) {
      if (job.completedAt && job.completedAt < cutoffDate) {
        this.activeJobs.delete(jobId);
      }
    }

    // Clean up old data files
    try {
      const files = await fs.readdir(this.outputPath);
      for (const file of files) {
        if (file.startsWith('job_config_') || file.startsWith('scraping_summary_')) {
          const filePath = path.join(this.outputPath, file);
          const stats = await fs.stat(filePath);
          if (stats.mtime < cutoffDate) {
            await fs.unlink(filePath);
          }
        }
      }
    } catch (error: any) {
      logger.error('Failed to cleanup old files', { error: error.message });
    }
  }
}
