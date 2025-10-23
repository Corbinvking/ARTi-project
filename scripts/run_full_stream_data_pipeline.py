#!/usr/bin/env python3
"""
Complete Stream Data Pipeline
Runs all three stages: URL collection, scraping, and database import

This script automates the entire workflow:
1. Collect SFA URLs from Spotify for Artists Roster
2. Scrape stream data for all collected URLs
3. Import data to database

Usage:
    python scripts/run_full_stream_data_pipeline.py
    
For cron job:
    0 2 * * 0 cd /path/to/project && python3 scripts/run_full_stream_data_pipeline.py >> logs/workflow.log 2>&1
"""

import os
import sys
import subprocess
import time
from pathlib import Path
from datetime import datetime

def print_header(text):
    """Print a formatted header"""
    print("\n" + "=" * 80)
    print(f"  {text}")
    print("=" * 80 + "\n")

def print_stage(stage_num, title):
    """Print a stage header"""
    print("\n" + "-" * 80)
    print(f"🚀 STAGE {stage_num}: {title}")
    print("-" * 80 + "\n")

def run_command(command, cwd=None, shell=True):
    """
    Run a command and return success status
    
    Args:
        command: Command to run (string or list)
        cwd: Working directory
        shell: Whether to use shell
    
    Returns:
        bool: True if successful, False otherwise
    """
    print(f"📝 Running: {command}")
    print(f"📂 Working directory: {cwd or os.getcwd()}\n")
    
    try:
        result = subprocess.run(
            command,
            cwd=cwd,
            shell=shell,
            check=True,
            text=True
        )
        return result.returncode == 0
    except subprocess.CalledProcessError as e:
        print(f"\n❌ Command failed with error code: {e.returncode}")
        return False
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")
        return False

def check_prerequisites(project_root):
    """Check if all required files and directories exist"""
    print_stage("0", "Checking Prerequisites")
    
    required_items = {
        "CSV file": project_root / "Spotify Playlisting-Active Campaigns.csv",
        "Roster scraper": project_root / "roster_scraper" / "run_roster_scraper.py",
        "Stream scraper": project_root / "spotify_scraper" / "run_roster_urls.py",
        "Import script": project_root / "scripts" / "import-roster-scraped-data.js"
    }
    
    all_present = True
    for name, path in required_items.items():
        if path.exists():
            print(f"✅ {name}: {path}")
        else:
            print(f"❌ {name}: NOT FOUND at {path}")
            all_present = False
    
    return all_present

def create_logs_dir(project_root):
    """Ensure logs directory exists"""
    logs_dir = project_root / "logs"
    logs_dir.mkdir(exist_ok=True)
    return logs_dir

def main():
    """Main pipeline execution"""
    start_time = datetime.now()
    
    print_header("🎵 AUTOMATED STREAM DATA WORKFLOW")
    print(f"📅 Started at: {start_time.strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"💻 Python: {sys.version.split()[0]}")
    print(f"📂 Working directory: {os.getcwd()}")
    
    # Get project root (one level up from scripts/)
    project_root = Path(__file__).parent.parent.resolve()
    print(f"🏠 Project root: {project_root}\n")
    
    # Create logs directory
    logs_dir = create_logs_dir(project_root)
    
    # Check prerequisites
    if not check_prerequisites(project_root):
        print("\n❌ Prerequisites check failed. Please ensure all files are present.")
        sys.exit(1)
    
    print("\n✅ All prerequisites present\n")
    time.sleep(1)
    
    # Track results
    results = {
        "stage_1": False,
        "stage_2": False,
        "stage_3": False
    }
    
    # STAGE 1: Collect SFA URLs from Roster
    print_stage(1, "Collecting SFA URLs from Roster")
    print("📋 This will:")
    print("   - Parse active campaigns from CSV")
    print("   - Search Spotify for Artists Roster")
    print("   - Extract SFA URLs for matching songs")
    print("   - Expected time: ~15-20 minutes\n")
    
    roster_dir = project_root / "roster_scraper"
    
    if run_command("python run_roster_scraper.py", cwd=roster_dir):
        print("\n✅ Stage 1 complete: SFA URLs collected")
        results["stage_1"] = True
        time.sleep(2)
    else:
        print("\n❌ Stage 1 failed: URL collection error")
        print("   Check roster_scraper logs for details")
        sys.exit(1)
    
    # STAGE 2: Scrape stream data from collected URLs
    print_stage(2, "Scraping Stream Data from SFA")
    print("📋 This will:")
    print("   - Read collected SFA URLs")
    print("   - Navigate to each song's stats page")
    print("   - Extract playlist data (28d, 7d, 12m)")
    print("   - Expected time: ~2 minutes per song\n")
    
    scraper_dir = project_root / "spotify_scraper"
    
    if run_command("python run_roster_urls.py", cwd=scraper_dir):
        print("\n✅ Stage 2 complete: Stream data scraped")
        results["stage_2"] = True
        time.sleep(2)
    else:
        print("\n❌ Stage 2 failed: Stream data scraping error")
        print("   Check spotify_scraper logs for details")
        sys.exit(1)
    
    # STAGE 3: Import data to database
    print_stage(3, "Importing Data to Database")
    print("📋 This will:")
    print("   - Read all scraped JSON files")
    print("   - Match to campaigns in database")
    print("   - Create/update campaign_playlists records")
    print("   - Expected time: ~30 seconds\n")
    
    if run_command("node scripts/import-roster-scraped-data.js", cwd=project_root):
        print("\n✅ Stage 3 complete: Data imported to database")
        results["stage_3"] = True
    else:
        print("\n❌ Stage 3 failed: Database import error")
        print("   Check database connection and logs")
        sys.exit(1)
    
    # Final summary
    end_time = datetime.now()
    duration = end_time - start_time
    
    print_header("🎉 WORKFLOW COMPLETE")
    
    print("📊 RESULTS SUMMARY")
    print("-" * 80)
    print(f"✅ Stage 1 (URL Collection):    {'SUCCESS' if results['stage_1'] else 'FAILED'}")
    print(f"✅ Stage 2 (Stream Scraping):   {'SUCCESS' if results['stage_2'] else 'FAILED'}")
    print(f"✅ Stage 3 (Database Import):   {'SUCCESS' if results['stage_3'] else 'FAILED'}")
    print("-" * 80)
    
    print(f"\n⏱️  Total execution time: {duration}")
    print(f"📅 Finished at: {end_time.strftime('%Y-%m-%d %H:%M:%S')}")
    print("\n✅ All stages completed successfully!")
    print("📊 Check your database for updated campaign playlist data")
    print(f"📁 Logs available in: {logs_dir}\n")
    
    # Write completion marker
    completion_log = logs_dir / "last_successful_run.txt"
    with open(completion_log, 'w') as f:
        f.write(f"Last successful run: {end_time.strftime('%Y-%m-%d %H:%M:%S')}\n")
        f.write(f"Duration: {duration}\n")
        f.write(f"All stages: SUCCESS\n")
    
    print(f"✅ Completion marker written to: {completion_log}")
    print("\n🎊 Ready for next scheduled run!\n")

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n⚠️  Workflow interrupted by user")
        sys.exit(130)
    except Exception as e:
        print(f"\n\n❌ Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

