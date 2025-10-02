// SINGLE SOURCE OF TRUTH - Use everywhere in the app
export const UNIFIED_GENRES = [
  'phonk', 'tech house', 'techno', 'minimal', 'house', 'progressive house',
  'bass house', 'big room', 'afro house', 'afrobeats', 'hardstyle', 
  'dubstep', 'trap', 'melodic bass', 'trance', 'dance', 'pop', 'indie', 
  'alternative', 'rock', 'hip-hop', 'r&b', 'country', 'jazz', 'folk', 
  'metal', 'classical', 'reggae', 'latin', 'brazilian', 'blues', 'punk', 
  'chill', 'ambient', 'experimental'
];

// Campaign filtering - CRITICAL for preventing cross-project data leaks
export const APP_CAMPAIGN_SOURCE = 'artist_influence_spotify_campaigns';
export const APP_CAMPAIGN_SOURCE_INTAKE = 'campaign_intake'; // Support both sources
export const APP_CAMPAIGN_TYPE = 'artist_influence_spotify_promotion';

// Project identification  
export const PROJECT_NAME = 'Artist Influence - Spotify Campaign Manager';
export const PROJECT_ID = 'artist-influence-spotify';

// Keyboard shortcuts
export const KEYBOARD_SHORTCUTS = [
  { key: 'Ctrl+K', description: 'Global Search' },
  { key: 'Ctrl+N', description: 'New Campaign' },
  { key: 'Ctrl+E', description: 'Export Data' },
  { key: 'Ctrl+1', description: 'Dashboard' },
  { key: 'Ctrl+2', description: 'Browse Playlists' },
  { key: 'Ctrl+3', description: 'Build Campaign' },
  { key: 'Ctrl+4', description: 'View Campaigns' },
];







