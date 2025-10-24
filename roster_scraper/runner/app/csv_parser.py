#!/usr/bin/env python3
"""
CSV Parser for Spotify Playlisting Active Campaigns
Handles BOM encoding and extracts client/campaign relationships
"""
import csv
import re
from typing import List, Dict, Any
from dataclasses import dataclass
from collections import defaultdict


@dataclass
class CampaignSong:
    """Represents a song from an active campaign"""
    campaign_name: str          # e.g., "Segan - DNBMF"
    client_name: str            # e.g., "Segan"
    artist_name: str            # Extracted from campaign name
    song_name: str              # Extracted from campaign name
    spotify_url: str            # Track URL (if available)
    sfa_url: str                # SFA URL (if available)
    goal: int                   # Stream goal
    remaining: int              # Remaining streams
    daily: int                  # Daily streams
    weekly: int                 # Weekly streams
    vendor: str                 # Vendor name
    status: str                 # Campaign status
    start_date: str             # Start date


class CampaignCSVParser:
    """Parse Spotify Playlisting-Active Campaigns.csv"""
    
    def __init__(self, csv_path: str):
        self.csv_path = csv_path
        self.campaigns: List[CampaignSong] = []
        self.clients_map: Dict[str, List[CampaignSong]] = defaultdict(list)
    
    def parse(self) -> List[CampaignSong]:
        """Parse CSV and extract all campaign songs"""
        
        # Handle BOM encoding
        with open(self.csv_path, 'r', encoding='utf-8-sig') as f:
            reader = csv.DictReader(f)
            
            for row in reader:
                # Get campaign and client names
                campaign_name = row.get('Campaign', '').strip()
                client_name = row.get('Client', '').strip()
                
                if not campaign_name or not client_name:
                    continue
                
                # Parse campaign name to extract artist and song
                artist_name, song_name = self.parse_campaign_name(campaign_name)
                
                # Create CampaignSong object
                song = CampaignSong(
                    campaign_name=campaign_name,
                    client_name=client_name,
                    artist_name=artist_name,
                    song_name=song_name,
                    spotify_url=row.get('URL', '').strip(),
                    sfa_url=row.get('SFA', '').strip(),
                    goal=self.parse_int(row.get('Goal', '0')),
                    remaining=self.parse_int(row.get('Remaining', '0')),
                    daily=self.parse_int(row.get('Daily', '0')),
                    weekly=self.parse_int(row.get('Weekly', '0')),
                    vendor=row.get('Vendor', '').strip(),
                    status=row.get('Status', '').strip(),
                    start_date=row.get('Start Date', '').strip()
                )
                
                self.campaigns.append(song)
                self.clients_map[client_name].append(song)
        
        return self.campaigns
    
    def parse_campaign_name(self, campaign_name: str) -> tuple:
        """
        Parse 'Artist - Song' format
        
        Examples:
            "Segan - DNBMF" → ("Segan", "DNBMF")
            "Reece Rosé - Back Back" → ("Reece Rosé", "Back Back")
            "The Beautiful Blu - Three Tracks" → ("The Beautiful Blu", "Three Tracks")
        """
        if ' - ' in campaign_name:
            parts = campaign_name.split(' - ', 1)
            return parts[0].strip(), parts[1].strip()
        else:
            # If no separator, use campaign name as both
            return campaign_name, campaign_name
    
    def parse_int(self, value: str) -> int:
        """Safely parse integer from string"""
        try:
            # Remove commas and convert
            clean_value = value.replace(',', '').strip()
            return int(clean_value) if clean_value else 0
        except (ValueError, AttributeError):
            return 0
    
    def get_unique_clients(self) -> List[str]:
        """Get list of unique client names, sorted"""
        return sorted(list(self.clients_map.keys()))
    
    def get_songs_by_client(self, client_name: str) -> List[CampaignSong]:
        """Get all songs for a specific client"""
        return self.clients_map.get(client_name, [])
    
    def get_stats(self) -> Dict[str, Any]:
        """Get parsing statistics"""
        return {
            'total_campaigns': len(self.campaigns),
            'unique_clients': len(self.clients_map),
            'campaigns_with_spotify_url': sum(1 for c in self.campaigns if c.spotify_url),
            'campaigns_with_sfa_url': sum(1 for c in self.campaigns if c.sfa_url),
            'campaigns_without_url': sum(1 for c in self.campaigns if not c.spotify_url and not c.sfa_url),
        }
    
    def print_summary(self):
        """Print a summary of the parsed data"""
        stats = self.get_stats()
        
        print("=" * 80)
        print("CSV PARSING SUMMARY")
        print("=" * 80)
        print(f"\n📊 Total Campaigns: {stats['total_campaigns']}")
        print(f"👥 Unique Clients: {stats['unique_clients']}")
        print(f"\n✅ With Spotify URL: {stats['campaigns_with_spotify_url']}")
        print(f"✅ With SFA URL: {stats['campaigns_with_sfa_url']}")
        print(f"⚠️  Without URL: {stats['campaigns_without_url']}")
        
        # Show top clients
        print(f"\n🎤 Top 10 Clients by Campaign Count:")
        client_counts = [(client, len(songs)) for client, songs in self.clients_map.items()]
        client_counts.sort(key=lambda x: x[1], reverse=True)
        
        for i, (client, count) in enumerate(client_counts[:10], 1):
            print(f"  {i:2d}. {client:30s} → {count:3d} campaigns")


def extract_track_id(spotify_url: str) -> str:
    """
    Extract track ID from Spotify URL
    
    Example:
        "https://open.spotify.com/track/0LfS8z5VUqkD9WlMLOZskY" 
        → "0LfS8z5VUqkD9WlMLOZskY"
    """
    if not spotify_url:
        return None
    
    match = re.search(r'/track/([a-zA-Z0-9]+)', spotify_url)
    return match.group(1) if match else None


if __name__ == "__main__":
    # Test the parser
    parser = CampaignCSVParser('../Spotify Playlisting-Active Campaigns.csv')
    campaigns = parser.parse()
    parser.print_summary()
    
    # Show example campaigns
    print("\n" + "=" * 80)
    print("EXAMPLE CAMPAIGNS")
    print("=" * 80)
    
    for client in list(parser.get_unique_clients())[:3]:
        songs = parser.get_songs_by_client(client)
        print(f"\n{client} ({len(songs)} campaigns):")
        for song in songs[:3]:
            print(f"  • {song.campaign_name}")
            if song.spotify_url:
                track_id = extract_track_id(song.spotify_url)
                print(f"    Track ID: {track_id}")

