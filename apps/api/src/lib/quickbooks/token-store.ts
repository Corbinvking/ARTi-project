// ============================================================================
// QuickBooks Online — Token encryption/storage and single-flight refresh
// ============================================================================

import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import { supabase } from '../supabase.js';
import { redis } from '../redis.js';
import { logger } from '../logger.js';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

/** Derive a 32-byte key from the env hex string */
function getEncryptionKey(): Buffer {
  const hex = process.env.QBO_TOKEN_ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) {
    throw new Error('QBO_TOKEN_ENCRYPTION_KEY must be a 64-char hex string (32 bytes)');
  }
  return Buffer.from(hex, 'hex');
}

/** Encrypt a plaintext string → "iv:authTag:ciphertext" (all hex) */
export function encrypt(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  let enc = cipher.update(plaintext, 'utf8', 'hex');
  enc += cipher.final('hex');
  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${enc}`;
}

/** Decrypt an "iv:authTag:ciphertext" string back to plaintext */
export function decrypt(cipherString: string): string {
  const key = getEncryptionKey();
  const parts = cipherString.split(':');
  const ivHex = parts[0] ?? '';
  const authTagHex = parts[1] ?? '';
  const ciphertext = parts[2] ?? '';
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  let dec = decipher.update(ciphertext, 'hex', 'utf8');
  dec += decipher.final('utf8');
  return dec;
}

// ---- Store / retrieve helpers ----

export async function storeTokens(
  connectionId: string,
  accessToken: string,
  refreshToken: string,
  expiresIn: number // seconds
): Promise<void> {
  const accessExpiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();
  // Refresh tokens are typically valid for 100 days
  const refreshExpiresAt = new Date(Date.now() + 100 * 24 * 60 * 60 * 1000).toISOString();

  const { error } = await supabase
    .from('qbo_tokens')
    .upsert({
      connection_id: connectionId,
      access_token_enc: encrypt(accessToken),
      access_expires_at: accessExpiresAt,
      refresh_token_enc: encrypt(refreshToken),
      refresh_expires_at: refreshExpiresAt,
      last_refreshed_at: new Date().toISOString(),
    }, { onConflict: 'connection_id' });

  if (error) {
    logger.error({ error }, 'Failed to store QBO tokens');
    throw error;
  }
}

export async function getTokens(connectionId: string): Promise<{
  accessToken: string;
  refreshToken: string;
  accessExpiresAt: Date;
} | null> {
  const { data, error } = await supabase
    .from('qbo_tokens')
    .select('*')
    .eq('connection_id', connectionId)
    .single();

  if (error || !data) return null;

  return {
    accessToken: decrypt(data.access_token_enc),
    refreshToken: decrypt(data.refresh_token_enc),
    accessExpiresAt: new Date(data.access_expires_at),
  };
}

/** Check if access token is still valid (with 5-min buffer) */
export function isTokenExpired(expiresAt: Date): boolean {
  return Date.now() > expiresAt.getTime() - 5 * 60 * 1000;
}

// ---- Single-flight refresh lock via Redis ----

const LOCK_TTL_SECONDS = 30;
const LOCK_PREFIX = 'qbo:refresh-lock:';

/**
 * Acquire a refresh lock for a connection. Returns true if lock acquired.
 * Uses Redis SET NX EX for atomic lock acquisition.
 */
export async function acquireRefreshLock(connectionId: string): Promise<boolean> {
  if (!redis) {
    // No Redis → allow but log warning (no concurrency protection)
    logger.warn('Redis unavailable, skipping refresh lock');
    return true;
  }
  const result = await redis.set(
    `${LOCK_PREFIX}${connectionId}`,
    '1',
    'EX',
    LOCK_TTL_SECONDS,
    'NX'
  );
  return result === 'OK';
}

/** Release the refresh lock */
export async function releaseRefreshLock(connectionId: string): Promise<void> {
  if (!redis) return;
  await redis.del(`${LOCK_PREFIX}${connectionId}`);
}
