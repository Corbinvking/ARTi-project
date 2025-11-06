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

export const LIKE_SERVER_OPTIONS = [
  'Server-LA-01',
  'Server-NY-02',
  'Server-EU-01',
  'Server-ASIA-01',
  'Server-LA-03',
  'Server-NY-04'
];

export const COMMENT_SERVER_OPTIONS = [
  'Comment-US-East',
  'Comment-US-West',
  'Comment-EU-Central',
  'Comment-Asia-Pacific',
  'Comment-Canada-01',
  'Comment-Australia-01'
];

export const SHEET_TIER_OPTIONS = [
  { value: '1', label: 'Tier 1' },
  { value: '2', label: 'Tier 2' },
  { value: '3', label: 'Tier 3' }
];