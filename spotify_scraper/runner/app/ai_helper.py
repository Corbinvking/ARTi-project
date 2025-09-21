from typing import Dict, List, Any, Optional
import re
from datetime import datetime, timedelta

class SpotifyAIHelper:
    """AI helper for intelligent scraping decisions and data analysis"""
    
    @staticmethod
    def analyze_page_state(page_content: str, current_url: str) -> Dict[str, Any]:
        """Analyze current page state and determine next actions"""
        state = {
            "page_type": None,
            "available_actions": [],
            "important_elements": [],
            "suggested_next_action": None,
            "data_points": {}
        }
        
        # Detect page type
        if "Overview" in page_content:
            state["page_type"] = "song_overview"
            state["available_actions"] = ["export_data", "view_playlists", "change_timeframe"]
        elif "Playlists" in page_content:
            state["page_type"] = "playlists"
            state["available_actions"] = ["sort_by_streams", "filter_by_date", "export_data"]
        
        # Extract important metrics
        metrics = SpotifyAIHelper._extract_metrics(page_content)
        state["data_points"] = metrics
        
        # Determine next best action
        state["suggested_next_action"] = SpotifyAIHelper._determine_next_action(state)
        
        return state
    
    @staticmethod
    def _extract_metrics(content: str) -> Dict[str, Any]:
        """Extract key metrics from page content"""
        metrics = {}
        
        # Stream patterns
        stream_pattern = r"(\d{1,3}(?:,\d{3})*)\s*streams"
        stream_matches = re.findall(stream_pattern, content, re.IGNORECASE)
        if stream_matches:
            metrics["total_streams"] = stream_matches[0]
        
        # Date patterns
        date_pattern = r"(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2},\s+\d{4}"
        date_matches = re.findall(date_pattern, content)
        if date_matches:
            metrics["release_date"] = date_matches[0]
        
        # Playlist patterns
        playlist_pattern = r"Top\s+(\d+)\s+of\s+(\d{1,3}(?:,\d{3})*)\s+playlists"
        playlist_matches = re.findall(playlist_pattern, content)
        if playlist_matches:
            metrics["playlist_ranking"] = {
                "position": playlist_matches[0][0],
                "total": playlist_matches[0][1]
            }
        
        return metrics
    
    @staticmethod
    def _determine_next_action(state: Dict[str, Any]) -> str:
        """Determine the next best action based on current state"""
        if state["page_type"] == "song_overview":
            if "total_streams" not in state["data_points"]:
                return "refresh_page"
            return "view_playlists"
        elif state["page_type"] == "playlists":
            if "playlist_ranking" not in state["data_points"]:
                return "sort_by_streams"
            return "export_data"
        return "analyze_page"
    
    @staticmethod
    def analyze_playlist_performance(playlists: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Analyze playlist performance and provide insights"""
        insights = {
            "top_performing": [],
            "trending": [],
            "opportunities": [],
            "stats": {
                "total_streams": 0,
                "avg_streams": 0,
                "playlist_count": len(playlists)
            }
        }
        
        # Calculate basic stats
        total_streams = sum(int(p["streams"].replace(",", "")) for p in playlists if p["streams"].isdigit())
        insights["stats"]["total_streams"] = total_streams
        insights["stats"]["avg_streams"] = total_streams / len(playlists) if playlists else 0
        
        # Identify top performing playlists
        sorted_by_streams = sorted(
            playlists,
            key=lambda x: int(x["streams"].replace(",", "")) if x["streams"].isdigit() else 0,
            reverse=True
        )
        insights["top_performing"] = sorted_by_streams[:5]
        
        # Identify trending (recent additions with good performance)
        for playlist in playlists:
            if playlist.get("date_added") and playlist.get("streams"):
                added_date = datetime.strptime(playlist["date_added"], "%Y-%m-%d")
                if datetime.now() - added_date <= timedelta(days=30):
                    streams = int(playlist["streams"].replace(",", ""))
                    if streams > insights["stats"]["avg_streams"]:
                        insights["trending"].append(playlist)
        
        # Identify opportunities (high-follower playlists with below-average streams)
        for playlist in playlists:
            if playlist.get("streams") and playlist.get("made_by") == "Spotify":
                streams = int(playlist["streams"].replace(",", ""))
                if streams < insights["stats"]["avg_streams"]:
                    insights["opportunities"].append(playlist)
        
        return insights
    
    @staticmethod
    def suggest_timeframe(metrics: Dict[str, Any]) -> str:
        """Suggest best timeframe for analysis based on metrics"""
        release_date = metrics.get("release_date")
        if not release_date:
            return "28 days"  # default
            
        release_date = datetime.strptime(release_date, "%b %d, %Y")
        days_since_release = (datetime.now() - release_date).days
        
        if days_since_release <= 7:
            return "7 days"
        elif days_since_release <= 28:
            return "28 days"
        else:
            return "12 months"
    
    @staticmethod
    def detect_anomalies(metrics: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Detect anomalies in metrics data"""
        anomalies = []
        
        # Check for unusual stream patterns
        if "total_streams" in metrics:
            streams = int(metrics["total_streams"].replace(",", ""))
            if streams == 0:
                anomalies.append({
                    "type": "zero_streams",
                    "severity": "high",
                    "message": "Song has zero streams - possible tracking issue"
                })
        
        # Check playlist performance
        if "playlist_ranking" in metrics:
            position = int(metrics["playlist_ranking"]["position"])
            total = int(metrics["playlist_ranking"]["total"].replace(",", ""))
            if position > total * 0.9:  # In bottom 10%
                anomalies.append({
                    "type": "low_playlist_ranking",
                    "severity": "medium",
                    "message": f"Song is ranked low ({position}/{total}) in playlists"
                })
        
        return anomalies

