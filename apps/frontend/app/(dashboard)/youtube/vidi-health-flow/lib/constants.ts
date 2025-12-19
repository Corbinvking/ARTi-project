import type { Database } from "../integrations/supabase/types";

type ServiceType = Database['public']['Enums']['service_type'];

export const SERVICE_TYPES: { value: ServiceType; label: string }[] = [
  { value: 'ww_display', label: 'WW Display' },
  { value: 'us_website', label: 'US Website' },
  { value: 'ww_website', label: 'WW Website' },
  { value: 'latam_display', label: 'LATAM Display' },
  { value: 'latam_website', label: 'LATAM Website' },
  { value: 'latam_skip', label: 'LATAM Skip' },
  { value: 'eur_display', label: 'EUR Display' },
  { value: 'eur_website', label: 'EUR Website' },
  { value: 'eur_skip', label: 'EUR Skip' },
  { value: 'asia_website', label: 'ASIA Website' },
  { value: 'youtube_eng_ad', label: 'YouTube Eng. Ad' },
  { value: 'ww_website_ads', label: 'WW Website Ads' },
  { value: 'engagements_only', label: 'ENGAGEMENTS ONLY' },
  { value: 'us_website_ads', label: 'US Website Ads' },
  { value: 'aus_website', label: 'AUS Website' },
  { value: 'aus_display', label: 'AUS Display' },
  { value: 'aus_skip', label: 'AUS Skip' },
  { value: 'us_display', label: 'US Display' },
  { value: 'us_eur_website', label: 'US/EUR Website' },
  { value: 'us_skip', label: 'US Skip' },
  { value: 'ww_skip', label: 'WW Skip' },
  { value: 'mena_display', label: 'MENA Display' },
  { value: 'cad_display', label: 'CAD Display' },
  { value: 'cad_website', label: 'CAD Website' },
  { value: 'cad_skip', label: 'CAD Skip' },
  { value: 'custom', label: 'Custom' },
];

export const GENRE_OPTIONS = [
  'Hip Hop',
  'Latin',
  'Dubstep',
  'House',
  'EDM',
  'Rock',
  'Pop',
  'R&B'
];

// JingleSMM Like Server Options (service_id from JingleSMM API)
export const LIKE_SERVER_OPTIONS = [
  { value: '113', label: 'Youtube Likes (Non drop) [30 DAYS REFILL] INSTANT' },
  { value: '2324', label: 'Youtube Likes [Non Drop] [MAX 100K] - SUPER FAST [Refill 30 Days]' },
  { value: '438', label: 'Youtube Video Likes [Refill 30 days] [No Drop] [MAX - 5k]' },
];

// JingleSMM Comment Server Options (service_id from JingleSMM API)
export const COMMENT_SERVER_OPTIONS = [
  { value: '439', label: 'Youtube Custom Comments [Non Drop] [Speed 10K/Day] [Super Instant] [English Names]' },
  { value: '2557', label: 'Youtube Custom Comments [Instant Start]' },
  { value: '4458', label: 'YouTube Comments [Custom] [USA]' },
  { value: '1579', label: 'Youtube Comments [CUSTOM] [100] [HISPANIC]' },
  { value: '1378', label: 'Youtube Custom Comments [High Quality] [English Names] [Start Time: Instant] Non Drop' },
];

// Google Sheets GID values for comment tiers
export const SHEET_TIER_OPTIONS = [
  { value: '0', label: 'Tier 1 (Main Sheet)' },
  { value: '1606211645', label: 'Tier 2' },
  { value: '793138276', label: 'Tier 3' }
];