import Redis from 'ioredis';
import { logger } from './logger';

if (!process.env.REDIS_URL) {
  throw new Error('Missing REDIS_URL environment variable');
}

export const redis = new Redis(process.env.REDIS_URL!, {
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
