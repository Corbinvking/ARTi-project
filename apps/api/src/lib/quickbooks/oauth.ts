// ============================================================================
// QuickBooks Online — OAuth 2.0 wrapper (using official intuit-oauth)
// ============================================================================

import OAuthClient from 'intuit-oauth';
import { supabase } from '../supabase.js';
import { logger } from '../logger.js';
import {
  storeTokens,
  getTokens,
  isTokenExpired,
  acquireRefreshLock,
  releaseRefreshLock,
} from './token-store.js';

// Singleton OAuthClient (one per process, environment-wide)
let _oauthClient: any | null = null;

export function getOAuthClient(): any {
  if (_oauthClient) return _oauthClient;

  const clientId = process.env.INTUIT_CLIENT_ID;
  const clientSecret = process.env.INTUIT_CLIENT_SECRET;
  const redirectUri = process.env.INTUIT_REDIRECT_URI;
  const environment = process.env.INTUIT_ENVIRONMENT || 'sandbox';

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error('Missing INTUIT_CLIENT_ID, INTUIT_CLIENT_SECRET, or INTUIT_REDIRECT_URI');
  }

  _oauthClient = new OAuthClient({
    clientId,
    clientSecret,
    environment, // 'sandbox' or 'production'
    redirectUri,
  });

  return _oauthClient;
}

/** Build the Intuit authorization URL the user is redirected to */
export function getAuthorizationUrl(state: string): string {
  const client = getOAuthClient();
  return client.authorizeUri({
    scope: [OAuthClient.scopes.Accounting],
    state,
  });
}

/**
 * Exchange the authorization code for access + refresh tokens.
 * Stores tokens and creates / updates a qbo_connection row.
 */
export async function handleCallback(
  redirectUrl: string,
  orgId: string,
  userId: string
): Promise<{ connectionId: string; realmId: string }> {
  const client = getOAuthClient();
  const authResponse = await client.createToken(redirectUrl);
  const tokenJson = authResponse.getJson();

  const params = new URL(redirectUrl).searchParams;
  const realmId = params.get('realmId') ?? params.get('realm_id');
  if (!realmId) {
    throw new Error('Callback URL missing realmId or realm_id (required for Accounting scope)');
  }
  const environment = process.env.INTUIT_ENVIRONMENT || 'sandbox';

  // Upsert connection
  const { data: conn, error: connErr } = await supabase
    .from('qbo_connections')
    .upsert({
      org_id: orgId,
      realm_id: realmId,
      environment,
      status: 'active',
      scopes: ['com.intuit.quickbooks.accounting'],
      connected_by: userId,
      connected_at: new Date().toISOString(),
      disconnected_at: null,
    }, { onConflict: 'org_id,realm_id' })
    .select('id')
    .single();

  if (connErr || !conn) {
    logger.error({ connErr }, 'Failed to upsert QBO connection');
    throw connErr || new Error('Connection upsert returned no data');
  }

  // Store encrypted tokens
  await storeTokens(
    conn.id,
    tokenJson.access_token,
    tokenJson.refresh_token,
    tokenJson.expires_in ?? 3600
  );

  // Fetch company name for display
  try {
    await fetchAndStoreCompanyName(conn.id, realmId, tokenJson.access_token);
  } catch (err) {
    logger.warn({ err }, 'Could not fetch company name on connect (non-fatal)');
  }

  logger.info({ connectionId: conn.id, realmId }, 'QBO connection established');
  return { connectionId: conn.id, realmId };
}

/** Revoke tokens and mark connection as disconnected */
export async function disconnect(connectionId: string): Promise<void> {
  const tokens = await getTokens(connectionId);
  if (tokens) {
    try {
      const client = getOAuthClient();
      client.setToken({
        access_token: tokens.accessToken,
        refresh_token: tokens.refreshToken,
      });
      await client.revoke({ token: tokens.accessToken });
    } catch (err) {
      logger.warn({ err }, 'Revoke call failed (non-fatal, proceeding with disconnect)');
    }
  }

  await supabase
    .from('qbo_connections')
    .update({ status: 'disconnected', disconnected_at: new Date().toISOString() })
    .eq('id', connectionId);

  await supabase.from('qbo_tokens').delete().eq('connection_id', connectionId);

  logger.info({ connectionId }, 'QBO connection disconnected');
}

/**
 * Get a valid access token for a connection (auto-refreshes if expired).
 * Uses single-flight locking to prevent concurrent refreshes.
 */
export async function getValidAccessToken(connectionId: string): Promise<string> {
  const tokens = await getTokens(connectionId);
  if (!tokens) throw new Error(`No tokens found for connection ${connectionId}`);

  if (!isTokenExpired(tokens.accessExpiresAt)) {
    return tokens.accessToken;
  }

  // Need refresh — acquire lock
  const lockAcquired = await acquireRefreshLock(connectionId);
  if (!lockAcquired) {
    // Another process is refreshing; wait a bit and retry
    await new Promise((r) => setTimeout(r, 2000));
    const retryTokens = await getTokens(connectionId);
    if (retryTokens && !isTokenExpired(retryTokens.accessExpiresAt)) {
      return retryTokens.accessToken;
    }
    throw new Error('Token refresh lock contention — retry later');
  }

  try {
    const client = getOAuthClient();
    client.setToken({
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
    });

    const refreshResponse = await client.refresh();
    const newToken = refreshResponse.getJson();

    await storeTokens(
      connectionId,
      newToken.access_token,
      newToken.refresh_token,
      newToken.expires_in ?? 3600
    );

    logger.info({ connectionId }, 'QBO access token refreshed');
    return newToken.access_token;
  } catch (err: any) {
    logger.error({ err, connectionId }, 'QBO token refresh failed');
    // Mark connection as errored
    await supabase
      .from('qbo_connections')
      .update({ status: 'error' })
      .eq('id', connectionId);
    throw err;
  } finally {
    await releaseRefreshLock(connectionId);
  }
}

/** Fetch CompanyInfo and store the name on the connection row */
async function fetchAndStoreCompanyName(
  connectionId: string,
  realmId: string,
  accessToken: string
): Promise<void> {
  const baseUrl = process.env.INTUIT_ENVIRONMENT === 'production'
    ? 'https://quickbooks.api.intuit.com'
    : 'https://sandbox-quickbooks.api.intuit.com';

  const res = await fetch(
    `${baseUrl}/v3/company/${realmId}/companyinfo/${realmId}`,
    { headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' } }
  );

  if (res.ok) {
    const data = await res.json();
    const companyName = data?.CompanyInfo?.CompanyName;
    if (companyName) {
      await supabase
        .from('qbo_connections')
        .update({ company_name: companyName })
        .eq('id', connectionId);
    }
  }
}
