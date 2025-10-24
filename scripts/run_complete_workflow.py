#!/usr/bin/env python3
"""
Complete End-to-End Workflow Automation
From CSV → Local Database → Scraped Data → Production

Usage:
    python scripts/run_complete_workflow.py
    python scripts/run_complete_workflow.py --skip-urls  # Skip URL collection
    python scripts/run_complete_workflow.py --skip-scrape  # Skip stream scraping
    python scripts/run_complete_workflow.py --auto-deploy  # Auto-deploy to production
"""

import os
import sys
import subprocess
import argparse
from pathlib import Path
from datetime import datetime

class WorkflowRunner:
    def __init__(self, base_dir, auto_deploy=False, skip_urls=False, skip_scrape=False):
        self.base_dir = Path(base_dir)
        self.auto_deploy = auto_deploy
        self.skip_urls = skip_urls
        self.skip_scrape = skip_scrape
        self.stages_completed = []
        
    def print_header(self, title):
        """Print a formatted header"""
        print("\n" + "="*80)
        print(f"🚀 {title}")
        print("="*80)
        
    def print_stage(self, stage_num, total_stages, description):
        """Print stage information"""
        print(f"\n{'='*80}")
        print(f"📍 Stage {stage_num}/{total_stages}: {description}")
        print(f"{'='*80}")
        
    def run_command(self, cmd, cwd=None, description="", check=True):
        """Run a command and handle errors"""
        print(f"\n💻 Running: {cmd}")
        print(f"📂 Directory: {cwd or self.base_dir}\n")
        
        try:
            result = subprocess.run(
                cmd,
                shell=True,
                cwd=cwd or self.base_dir,
                check=check,
                text=True
            )
            
            if result.returncode == 0:
                print(f"\n✅ {description} - SUCCESS")
                self.stages_completed.append(description)
                return True
            else:
                print(f"\n⚠️  {description} - COMPLETED WITH WARNINGS")
                return True
                
        except subprocess.CalledProcessError as e:
            print(f"\n❌ {description} - FAILED")
            print(f"Error: {e}")
            return False
    
    def confirm_action(self, message):
        """Ask user for confirmation"""
        response = input(f"\n{message} (yes/no): ").strip().lower()
        return response == 'yes'
    
    def stage_1_database_sync(self):
        """Sync CSV data to local database"""
        self.print_stage(1, 8, "Database Sync")
        print("📋 Syncing campaigns, clients, and vendors from CSV to local database...")
        
        success = self.run_command(
            "node scripts/run_full_database_sync.js",
            description="Database Sync"
        )
        
        if not success:
            print("\n⚠️  Database sync encountered issues. Continue anyway?")
            if not self.confirm_action("Continue?"):
                return False
        
        return True
    
    def stage_2_collect_urls(self):
        """Collect SFA URLs from Roster"""
        if self.skip_urls:
            print("\n⏭️  Skipping URL collection (--skip-urls flag)")
            return True
            
        self.print_stage(2, 8, "Collect SFA URLs")
        print("🌐 Opening Spotify for Artists Roster scraper...")
        print("\n⚠️  MANUAL LOGIN REQUIRED")
        print("The browser will open. Please:")
        print("  1. Log in to Spotify for Artists")
        print("  2. Complete 2FA if prompted")
        print("  3. Wait for scraping to complete")
        
        if not self.confirm_action("\nReady to start URL collection?"):
            print("❌ Aborted by user")
            return False
        
        success = self.run_command(
            "python run_roster_scraper.py",
            cwd=self.base_dir / "roster_scraper",
            description="URL Collection",
            check=False  # Don't fail on non-zero exit
        )
        
        # Check if output file was created
        data_dir = self.base_dir / "roster_scraper" / "data"
        result_files = list(data_dir.glob("roster_scraping_results_*.json"))
        
        if not result_files:
            print("\n❌ No roster results file found!")
            return False
        
        latest_file = sorted(result_files)[-1]
        print(f"\n✅ Found results: {latest_file.name}")
        
        return True
    
    def stage_3_save_urls(self):
        """Save collected URLs to database"""
        if self.skip_urls:
            print("\n⏭️  Skipping URL save (--skip-urls flag)")
            return True
            
        self.print_stage(3, 8, "Save URLs to Database")
        print("💾 Updating campaign records with SFA URLs...")
        
        return self.run_command(
            "node scripts/import-roster-urls.js",
            description="Save URLs to Database"
        )
    
    def stage_4_scrape_data(self):
        """Scrape streaming data"""
        if self.skip_scrape:
            print("\n⏭️  Skipping stream data scraping (--skip-scrape flag)")
            return True
            
        self.print_stage(4, 8, "Scrape Streaming Data")
        print("📊 Collecting playlist and stream data from Spotify for Artists...")
        print("\n⚠️  This uses your existing login session")
        print("The scraper will:")
        print("  - Visit each song's stats page")
        print("  - Collect playlist data (28d, 7d, 12m)")
        print("  - Save to local JSON files")
        print("  - Resume from where it left off if interrupted")
        
        if not self.confirm_action("\nReady to start scraping?"):
            print("❌ Aborted by user")
            return False
        
        success = self.run_command(
            "python run_s4a_list.py",
            cwd=self.base_dir / "spotify_scraper",
            description="Stream Data Scraping",
            check=False
        )
        
        # Check if song files were created
        data_dir = self.base_dir / "spotify_scraper" / "data"
        song_files = list(data_dir.glob("song_*.json"))
        
        print(f"\n📁 Found {len(song_files)} scraped song files")
        
        if len(song_files) == 0:
            print("❌ No song data files found!")
            return False
        
        return True
    
    def stage_5_import_local(self):
        """Import scraped data to local database"""
        self.print_stage(5, 8, "Import to Local Database")
        print("📥 Loading scraped data into local Supabase...")
        
        return self.run_command(
            "node scripts/import-roster-scraped-data.js",
            description="Local Database Import"
        )
    
    def stage_6_verify_local(self):
        """Verify local database"""
        self.print_stage(6, 8, "Verify Local Data")
        print("🔍 Checking local database...")
        
        # Count playlists
        self.run_command(
            'psql postgresql://postgres:postgres@127.0.0.1:54321/postgres -c "SELECT COUNT(*) as total_playlists FROM campaign_playlists;"',
            description="Count Local Playlists",
            check=False
        )
        
        # Count campaigns with data
        self.run_command(
            'psql postgresql://postgres:postgres@127.0.0.1:54321/postgres -c "SELECT COUNT(DISTINCT campaign_id) as campaigns_with_data FROM campaign_playlists;"',
            description="Count Campaigns with Data",
            check=False
        )
        
        return True
    
    def stage_7_generate_sql(self):
        """Generate production SQL"""
        self.print_stage(7, 8, "Generate Production SQL")
        print("📝 Creating SQL import file for production...")
        
        return self.run_command(
            "python scripts/generate_sql_import.py",
            description="Generate Production SQL"
        )
    
    def stage_8_deploy_production(self):
        """Deploy to production"""
        self.print_stage(8, 8, "Deploy to Production")
        
        if not self.auto_deploy:
            print("\n🚀 Ready to deploy to production!")
            if not self.confirm_action("Deploy now?"):
                print("\n📋 Manual deployment instructions:")
                self.print_manual_deploy_instructions()
                return True
        
        print("📤 Uploading SQL file to production...")
        
        # Upload SQL file
        upload_success = self.run_command(
            "scp IMPORT-SCRAPED-DATA.sql root@164.90.129.146:/root/arti-marketing-ops/",
            description="Upload to Production"
        )
        
        if not upload_success:
            print("❌ Upload failed!")
            return False
        
        print("\n📋 To complete deployment, SSH to production and run:")
        print("\n  ssh root@164.90.129.146")
        print("  cd /root/arti-marketing-ops")
        print('  psql postgresql://postgres:postgres@127.0.0.1:54322/postgres -f IMPORT-SCRAPED-DATA.sql')
        print("\nVerify:")
        print('  psql postgresql://postgres:postgres@127.0.0.1:54322/postgres -c "SELECT COUNT(*) FROM campaign_playlists;"')
        
        return True
    
    def print_manual_deploy_instructions(self):
        """Print manual deployment steps"""
        print("\n" + "="*80)
        print("📋 MANUAL DEPLOYMENT INSTRUCTIONS")
        print("="*80)
        print("\n1. Upload SQL file:")
        print("   scp IMPORT-SCRAPED-DATA.sql root@164.90.129.146:/root/arti-marketing-ops/")
        print("\n2. SSH to production:")
        print("   ssh root@164.90.129.146")
        print("   cd /root/arti-marketing-ops")
        print("\n3. Run import:")
        print("   psql postgresql://postgres:postgres@127.0.0.1:54322/postgres -f IMPORT-SCRAPED-DATA.sql")
        print("\n4. Verify:")
        print('   psql postgresql://postgres:postgres@127.0.0.1:54322/postgres -c "SELECT COUNT(*) FROM campaign_playlists;"')
        print("\n" + "="*80)
    
    def print_summary(self):
        """Print workflow summary"""
        print("\n" + "="*80)
        print("📊 WORKFLOW SUMMARY")
        print("="*80)
        
        print(f"\n✅ Completed Stages: {len(self.stages_completed)}")
        for stage in self.stages_completed:
            print(f"   ✓ {stage}")
        
        print("\n" + "="*80)
        print("🎉 WORKFLOW COMPLETE!")
        print("="*80)
        print(f"⏰ Finished at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    def run(self):
        """Run the complete workflow"""
        self.print_header("COMPLETE SPOTIFY CAMPAIGN WORKFLOW")
        print(f"📅 Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"📂 Base Directory: {self.base_dir}")
        
        if self.auto_deploy:
            print("🚀 Auto-deploy to production: ENABLED")
        if self.skip_urls:
            print("⏭️  Skipping URL collection")
        if self.skip_scrape:
            print("⏭️  Skipping stream scraping")
        
        try:
            # Stage 1: Database Sync
            if not self.stage_1_database_sync():
                print("\n❌ Workflow aborted at Stage 1")
                return False
            
            # Stage 2: Collect URLs
            if not self.stage_2_collect_urls():
                print("\n❌ Workflow aborted at Stage 2")
                return False
            
            # Stage 3: Save URLs
            if not self.stage_3_save_urls():
                print("\n❌ Workflow aborted at Stage 3")
                return False
            
            # Stage 4: Scrape Data
            if not self.stage_4_scrape_data():
                print("\n❌ Workflow aborted at Stage 4")
                return False
            
            # Stage 5: Import Local
            if not self.stage_5_import_local():
                print("\n❌ Workflow aborted at Stage 5")
                return False
            
            # Stage 6: Verify Local
            if not self.stage_6_verify_local():
                print("\n❌ Workflow aborted at Stage 6")
                return False
            
            # Stage 7: Generate SQL
            if not self.stage_7_generate_sql():
                print("\n❌ Workflow aborted at Stage 7")
                return False
            
            # Stage 8: Deploy Production
            if not self.stage_8_deploy_production():
                print("\n❌ Workflow aborted at Stage 8")
                return False
            
            # Success!
            self.print_summary()
            return True
            
        except KeyboardInterrupt:
            print("\n\n⚠️  Workflow interrupted by user")
            self.print_summary()
            return False
        except Exception as e:
            print(f"\n\n❌ Unexpected error: {e}")
            self.print_summary()
            return False

def main():
    parser = argparse.ArgumentParser(
        description="Complete end-to-end workflow for Spotify campaign data"
    )
    parser.add_argument(
        "--auto-deploy",
        action="store_true",
        help="Automatically deploy to production without confirmation"
    )
    parser.add_argument(
        "--skip-urls",
        action="store_true",
        help="Skip URL collection (use existing roster results)"
    )
    parser.add_argument(
        "--skip-scrape",
        action="store_true",
        help="Skip stream data scraping (use existing song files)"
    )
    
    args = parser.parse_args()
    
    # Get base directory (parent of scripts/)
    base_dir = Path(__file__).parent.parent
    
    # Run workflow
    runner = WorkflowRunner(
        base_dir=base_dir,
        auto_deploy=args.auto_deploy,
        skip_urls=args.skip_urls,
        skip_scrape=args.skip_scrape
    )
    
    success = runner.run()
    
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()

