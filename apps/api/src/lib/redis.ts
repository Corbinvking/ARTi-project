import Redis from 'ioredis';
import { logger } from './logger';

let redis: Redis | null = null;

if (process.env.REDIS_URL) {
  try {
    redis = new Redis(process.env.REDIS_URL!, {
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      lazyConnect: true,
    });

    redis.on('connect', () => {
      logger.info('Redis connected');
    });

    redis.on('ready', () => {
      logger.info('Redis ready');
    });

    redis.on('error', (err) => {
      logger.error({ err }, 'Redis error');
    });

    redis.on('close', () => {
      logger.info('Redis connection closed');
    });

    redis.on('reconnecting', () => {
      logger.info('Redis reconnecting');
    });

    // Test connection
    redis.ping().catch((err) => {
      logger.error({ err }, 'Redis ping failed');
    });
  } catch (error) {
    logger.warn('Failed to initialize Redis, continuing without Redis');
    redis = null;
  }
} else {
  logger.warn('REDIS_URL not provided, Redis features will be unavailable');
}

export { redis };
