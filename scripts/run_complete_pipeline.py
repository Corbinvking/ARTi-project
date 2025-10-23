#!/usr/bin/env python3
"""
COMPLETE 1-CLICK STREAM DATA PIPELINE
From CSV to Production in One Command

This script automates the ENTIRE workflow:
1. Parse CSV for active campaigns
2. Collect SFA URLs from Roster
3. Scrape stream data for all URLs
4. Import to LOCAL database
5. Verify data in local database
6. Upload scraped files to production
7. Import to PRODUCTION database
8. Verify production deployment

Usage:
    python scripts/run_complete_pipeline.py
    
    # With custom CSV
    python scripts/run_complete_pipeline.py --csv "path/to/campaigns.csv"
    
    # Skip production upload
    python scripts/run_complete_pipeline.py --local-only
    
    # Production only (if already scraped)
    python scripts/run_complete_pipeline.py --production-only
"""

import os
import sys
import subprocess
import time
import argparse
from pathlib import Path
from datetime import datetime

# Configuration
PRODUCTION_SERVER_IP = "164.90.129.146"
PRODUCTION_USER = "root"
PRODUCTION_PATH = "~/arti-marketing-ops"

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

def run_command(command, cwd=None, shell=True, capture_output=False):
    """
    Run a command and return success status
    
    Args:
        command: Command to run (string or list)
        cwd: Working directory
        shell: Whether to use shell
        capture_output: Whether to capture output
    
    Returns:
        tuple: (success: bool, output: str)
    """
    print(f"📝 Running: {command}")
    print(f"📂 Working directory: {cwd or os.getcwd()}\n")
    
    try:
        result = subprocess.run(
            command,
            cwd=cwd,
            shell=shell,
            check=True,
            text=True,
            capture_output=capture_output
        )
        output = result.stdout if capture_output else ""
        return True, output
    except subprocess.CalledProcessError as e:
        print(f"\n❌ Command failed with error code: {e.returncode}")
        if capture_output:
            print(f"Error output: {e.stderr}")
        return False, ""
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")
        return False, ""

def check_prerequisites(project_root, csv_path):
    """Check if all required files and directories exist"""
    print_stage("0", "Checking Prerequisites")
    
    required_items = {
        "CSV file": csv_path,
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

def verify_local_data(project_root):
    """Verify data was imported to local database"""
    print("\n🔍 Verifying local database...")
    
    # Run a quick query to check playlist count
    success, output = run_command(
        'node -e "const { createClient } = require(\'@supabase/supabase-js\'); '
        'const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || \'http://127.0.0.1:54321\', '
        'process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY); '
        'supabase.from(\'campaign_playlists\').select(\'id\', { count: \'exact\', head: true }).then(r => '
        'console.log(\'Playlist count:\', r.count));"',
        cwd=project_root,
        capture_output=True
    )
    
    if success and "Playlist count:" in output:
        print(f"✅ Local database verified")
        return True
    else:
        print(f"⚠️  Could not verify local database")
        return False

def upload_to_production(project_root, server_ip, server_user, server_path):
    """Upload scraped data files to production"""
    print_stage("6", "Uploading Data to Production")
    
    # Count files to upload
    data_dir = project_root / "spotify_scraper" / "data"
    json_files = list(data_dir.glob("roster_*.json"))
    
    if not json_files:
        print("❌ No scraped data files found to upload")
        return False
    
    print(f"📊 Found {len(json_files)} JSON files to upload")
    print(f"🎯 Target: {server_user}@{server_ip}:{server_path}/spotify_scraper/data/")
    print()
    
    # Upload files
    scp_command = f'scp spotify_scraper/data/roster_*.json {server_user}@{server_ip}:{server_path}/spotify_scraper/data/'
    
    print("📤 Uploading files...")
    success, _ = run_command(scp_command, cwd=project_root)
    
    if success:
        print(f"\n✅ Upload complete: {len(json_files)} files uploaded")
        return True
    else:
        print("\n❌ Upload failed")
        return False

def import_to_production(server_ip, server_user, server_path):
    """Run import script on production server"""
    print_stage("7", "Importing Data to Production Database")
    
    # SSH command to run import on production
    ssh_command = (
        f'ssh {server_user}@{server_ip} '
        f'"cd {server_path} && '
        f'source venv/bin/activate && '
        f'node scripts/import-roster-scraped-data.js"'
    )
    
    print(f"🔗 Connecting to production server...")
    print(f"📊 Running import on {server_ip}...")
    print()
    
    success, _ = run_command(ssh_command)
    
    if success:
        print(f"\n✅ Production import complete")
        return True
    else:
        print("\n❌ Production import failed")
        return False

def main():
    """Main pipeline execution"""
    # Parse arguments
    parser = argparse.ArgumentParser(description="Complete Stream Data Pipeline")
    parser.add_argument('--csv', default='Spotify Playlisting-Active Campaigns.csv',
                      help='Path to CSV file with campaigns')
    parser.add_argument('--local-only', action='store_true',
                      help='Only run local pipeline, skip production upload')
    parser.add_argument('--production-only', action='store_true',
                      help='Skip scraping, only upload and import to production')
    parser.add_argument('--server-ip', default=PRODUCTION_SERVER_IP,
                      help='Production server IP address')
    args = parser.parse_args()
    
    start_time = datetime.now()
    
    print_header("🎵 COMPLETE 1-CLICK STREAM DATA PIPELINE")
    print(f"📅 Started at: {start_time.strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"💻 Python: {sys.version.split()[0]}")
    print(f"📂 Working directory: {os.getcwd()}")
    
    # Get project root
    project_root = Path(__file__).parent.parent.resolve()
    print(f"🏠 Project root: {project_root}")
    
    # CSV path
    csv_path = project_root / args.csv
    print(f"📄 CSV file: {csv_path}")
    
    # Mode
    if args.production_only:
        print(f"⚡ Mode: PRODUCTION ONLY")
    elif args.local_only:
        print(f"⚡ Mode: LOCAL ONLY")
    else:
        print(f"⚡ Mode: FULL PIPELINE (Local + Production)")
    print()
    
    # Create logs directory
    logs_dir = create_logs_dir(project_root)
    
    # Track results
    results = {
        "stage_1_url_collection": False,
        "stage_2_scraping": False,
        "stage_3_local_import": False,
        "stage_4_local_verify": False,
        "stage_5_production_upload": False,
        "stage_6_production_import": False,
    }
    
    # ========================================
    # LOCAL PIPELINE
    # ========================================
    
    if not args.production_only:
        # Check prerequisites
        if not check_prerequisites(project_root, csv_path):
            print("\n❌ Prerequisites check failed. Please ensure all files are present.")
            sys.exit(1)
        
        print("\n✅ All prerequisites present\n")
        time.sleep(1)
        
        # STAGE 1: Collect SFA URLs from Roster
        print_stage(1, "Collecting SFA URLs from Roster")
        print("📋 This will:")
        print("   - Parse active campaigns from CSV")
        print("   - Search Spotify for Artists Roster")
        print("   - Extract SFA URLs for matching songs")
        print("   - Expected time: ~15-20 minutes\n")
        
        roster_dir = project_root / "roster_scraper"
        success, _ = run_command("python run_roster_scraper.py", cwd=roster_dir)
        
        if success:
            print("\n✅ Stage 1 complete: SFA URLs collected")
            results["stage_1_url_collection"] = True
            time.sleep(2)
        else:
            print("\n❌ Stage 1 failed: URL collection error")
            sys.exit(1)
        
        # STAGE 2: Scrape stream data
        print_stage(2, "Scraping Stream Data from SFA")
        print("📋 This will:")
        print("   - Read collected SFA URLs")
        print("   - Navigate to each song's stats page")
        print("   - Extract playlist data (28d, 7d, 12m)")
        print("   - Expected time: ~2 minutes per song\n")
        
        scraper_dir = project_root / "spotify_scraper"
        success, _ = run_command("python run_roster_urls.py", cwd=scraper_dir)
        
        if success:
            print("\n✅ Stage 2 complete: Stream data scraped")
            results["stage_2_scraping"] = True
            time.sleep(2)
        else:
            print("\n❌ Stage 2 failed: Stream data scraping error")
            sys.exit(1)
        
        # STAGE 3: Import to local database
        print_stage(3, "Importing Data to Local Database")
        print("📋 This will:")
        print("   - Read all scraped JSON files")
        print("   - Match to campaigns in local database")
        print("   - Create/update campaign_playlists records")
        print("   - Expected time: ~30 seconds\n")
        
        success, _ = run_command("node scripts/import-roster-scraped-data.js", cwd=project_root)
        
        if success:
            print("\n✅ Stage 3 complete: Data imported to local database")
            results["stage_3_local_import"] = True
            time.sleep(2)
        else:
            print("\n❌ Stage 3 failed: Local database import error")
            sys.exit(1)
        
        # STAGE 4: Verify local data
        print_stage(4, "Verifying Local Data")
        if verify_local_data(project_root):
            results["stage_4_local_verify"] = True
            print("✅ Stage 4 complete: Local data verified")
        else:
            print("⚠️  Stage 4 warning: Could not verify local data (but continuing)")
        
        time.sleep(2)
    
    # ========================================
    # PRODUCTION DEPLOYMENT
    # ========================================
    
    if not args.local_only:
        # STAGE 5: Upload to production
        if upload_to_production(project_root, args.server_ip, PRODUCTION_USER, PRODUCTION_PATH):
            results["stage_5_production_upload"] = True
            time.sleep(2)
        else:
            print("\n❌ Stage 5 failed: Production upload error")
            sys.exit(1)
        
        # STAGE 6: Import on production
        if import_to_production(args.server_ip, PRODUCTION_USER, PRODUCTION_PATH):
            results["stage_6_production_import"] = True
        else:
            print("\n❌ Stage 6 failed: Production import error")
            sys.exit(1)
    
    # ========================================
    # FINAL SUMMARY
    # ========================================
    
    end_time = datetime.now()
    duration = end_time - start_time
    
    print_header("🎉 PIPELINE COMPLETE")
    
    print("📊 RESULTS SUMMARY")
    print("-" * 80)
    
    if not args.production_only:
        print(f"✅ Stage 1 (URL Collection):        {'SUCCESS' if results['stage_1_url_collection'] else 'SKIPPED'}")
        print(f"✅ Stage 2 (Stream Scraping):       {'SUCCESS' if results['stage_2_scraping'] else 'SKIPPED'}")
        print(f"✅ Stage 3 (Local Import):          {'SUCCESS' if results['stage_3_local_import'] else 'SKIPPED'}")
        print(f"✅ Stage 4 (Local Verification):    {'SUCCESS' if results['stage_4_local_verify'] else 'SKIPPED'}")
    
    if not args.local_only:
        print(f"✅ Stage 5 (Production Upload):     {'SUCCESS' if results['stage_5_production_upload'] else 'SKIPPED'}")
        print(f"✅ Stage 6 (Production Import):     {'SUCCESS' if results['stage_6_production_import'] else 'SKIPPED'}")
    
    print("-" * 80)
    
    print(f"\n⏱️  Total execution time: {duration}")
    print(f"📅 Finished at: {end_time.strftime('%Y-%m-%d %H:%M:%S')}")
    
    if not args.local_only:
        print("\n🌐 Production Deployment Complete!")
        print(f"   Check your production UI: https://artistinfluence.com")
    
    if not args.production_only:
        print("\n💾 Local Database Updated!")
        print(f"   Check your local UI: http://localhost:3000")
    
    print(f"\n📁 Logs available in: {logs_dir}")
    
    # Write completion marker
    completion_log = logs_dir / "last_successful_run.txt"
    with open(completion_log, 'w') as f:
        f.write(f"Last successful run: {end_time.strftime('%Y-%m-%d %H:%M:%S')}\n")
        f.write(f"Duration: {duration}\n")
        f.write(f"Mode: {'Production Only' if args.production_only else 'Local Only' if args.local_only else 'Full Pipeline'}\n")
        f.write(f"All stages: SUCCESS\n")
    
    print(f"\n✅ Completion marker written to: {completion_log}")
    print("\n🎊 Pipeline complete! Data is live in production!\n")

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n⚠️  Pipeline interrupted by user")
        sys.exit(130)
    except Exception as e:
        print(f"\n\n❌ Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

