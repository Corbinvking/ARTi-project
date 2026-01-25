import "server-only";

import { createClient } from "@supabase/supabase-js";

type InfluencePlannerSettings = {
  ip_base_url: string;
  ip_username: string;
  ip_api_key: string;
};

type RequestOptions = {
  method: "GET" | "POST";
  path: string;
  query?: Record<string, string | number | boolean | undefined>;
  body?: unknown;
};

const MIN_REQUEST_INTERVAL_MS = 2000;
let lastRequestAt = 0;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const enforceRateLimit = async () => {
  const now = Date.now();
  const elapsed = now - lastRequestAt;
  if (elapsed < MIN_REQUEST_INTERVAL_MS) {
    await sleep(MIN_REQUEST_INTERVAL_MS - elapsed);
  }
  lastRequestAt = Date.now();
};

const createAdminClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing Supabase service role configuration.");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
};

export const getInfluencePlannerSettings = async (): Promise<InfluencePlannerSettings> => {
  const supabaseAdmin = createAdminClient();
  const { data, error } = await supabaseAdmin
    .from("settings")
    .select("ip_base_url, ip_username, ip_api_key")
    .single();

  if (error || !data?.ip_base_url || !data?.ip_username || !data?.ip_api_key) {
    throw new Error("InfluencePlanner API credentials are not configured.");
  }

  return {
    ip_base_url: data.ip_base_url,
    ip_username: data.ip_username,
    ip_api_key: data.ip_api_key,
  };
};

const buildAuthHeader = (username: string, apiKey: string) => {
  const token = Buffer.from(`${username}:${apiKey}`).toString("base64");
  return `Basic ${token}`;
};

const requestWithRetry = async (url: string, options: RequestInit, retries = 3) => {
  let attempt = 0;
  while (attempt <= retries) {
    await enforceRateLimit();
    const response = await fetch(url, options);

    if (!response.ok && (response.status === 429 || response.status >= 500)) {
      const delay = Math.min(2000 * Math.pow(2, attempt), 10000);
      await sleep(delay);
      attempt += 1;
      continue;
    }

    return response;
  }

  return fetch(url, options);
};

export const influencePlannerRequest = async <T>({
  method,
  path,
  query,
  body,
}: RequestOptions): Promise<{ data: T; status: number }> => {
  const { ip_base_url, ip_username, ip_api_key } = await getInfluencePlannerSettings();
  const url = new URL(path.replace(/^\//, ""), ip_base_url.endsWith("/") ? ip_base_url : `${ip_base_url}/`);

  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value));
      }
    });
  }

  const response = await requestWithRetry(url.toString(), {
    method,
    headers: {
      Authorization: buildAuthHeader(ip_username, ip_api_key),
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await response.text();
  let json: any = null;
  if (text) {
    try {
      json = JSON.parse(text);
    } catch {
      json = null;
    }
  }

  if (!response.ok) {
    const message =
      json?.message ||
      json?.error ||
      (text ? text.slice(0, 300) : null) ||
      `InfluencePlanner API error (${response.status})`;
    throw new Error(message);
  }

  return { data: json as T, status: response.status };
};
