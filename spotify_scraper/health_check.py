#!/usr/bin/env python3
"""
Quick health check for Spotify scraper (runs in ~10 seconds)
Tests all dependencies without actually scraping
"""
import os
import sys
import json
from datetime import datetime
from pathlib import Path

def health_check():
    results = {
        "timestamp": datetime.now().isoformat(),
        "checks": {},
        "overall_status": "healthy",
        "errors": []
    }
    
    # Check 1: Python dependencies
    try:
        from playwright.async_api import async_playwright
        import supabase
        results["checks"]["python_deps"] = "✓ OK"
    except ImportError as e:
        results["checks"]["python_deps"] = f"✗ FAIL: {e}"
        results["errors"].append(f"Missing Python dependency: {e}")
        results["overall_status"] = "unhealthy"
    
    # Check 2: Environment variables
    required_vars = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"]
    missing_vars = [var for var in required_vars if not os.getenv(var)]
    if missing_vars:
        results["checks"]["env_vars"] = f"✗ FAIL: Missing {', '.join(missing_vars)}"
        results["errors"].append(f"Missing environment variables: {missing_vars}")
        results["overall_status"] = "unhealthy"
    else:
        results["checks"]["env_vars"] = "✓ OK"
    
    # Check 3: Browser context exists
    context_path = Path("./browser_context")
    if context_path.exists():
        results["checks"]["browser_context"] = "✓ OK"
    else:
        results["checks"]["browser_context"] = "⚠ WARNING: No saved context (need to re-login)"
        results["errors"].append("Browser context missing - scraper will fail")
    
    # Check 4: Xvfb available
    import subprocess
    try:
        subprocess.run(["which", "xvfb-run"], check=True, capture_output=True)
        results["checks"]["xvfb"] = "✓ OK"
    except:
        results["checks"]["xvfb"] = "✗ FAIL: xvfb-run not found"
        results["errors"].append("Xvfb not installed")
        results["overall_status"] = "unhealthy"
    
    # Check 5: Display available
    display = os.getenv("DISPLAY")
    if display:
        results["checks"]["display"] = f"✓ OK (DISPLAY={display})"
    else:
        results["checks"]["display"] = "⚠ WARNING: No DISPLAY set (cron will use xvfb-run)"
    
    # Check 6: Supabase API reachable
    try:
        from supabase import create_client
        supabase_url = os.getenv("SUPABASE_URL")
        supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        client = create_client(supabase_url, supabase_key)
        # Quick test query
        response = client.table("spotify_campaigns").select("id").limit(1).execute()
        results["checks"]["supabase_api"] = "✓ OK"
    except Exception as e:
        results["checks"]["supabase_api"] = f"✗ FAIL: {str(e)[:100]}"
        results["errors"].append(f"Cannot reach Supabase: {e}")
        results["overall_status"] = "unhealthy"
    
    # Check 7: Playwright browsers installed
    try:
        import subprocess
        result = subprocess.run(
            ["python3", "-m", "playwright", "install", "--dry-run", "chromium"],
            capture_output=True,
            text=True
        )
        if "is already installed" in result.stdout or result.returncode == 0:
            results["checks"]["playwright_browser"] = "✓ OK"
        else:
            results["checks"]["playwright_browser"] = "⚠ WARNING: Browser may need install"
    except Exception as e:
        results["checks"]["playwright_browser"] = f"✗ FAIL: {e}"
    
    # Check 8: Last successful run
    try:
        status_file = Path("status.jsonl")
        if status_file.exists():
            with open(status_file) as f:
                lines = f.readlines()
                if lines:
                    last_run = json.loads(lines[-1])
                    last_time = last_run.get("timestamp")
                    last_status = last_run.get("status")
                    results["checks"]["last_run"] = f"✓ {last_time} ({last_status})"
                    
                    # Check if stale (>36 hours)
                    from datetime import datetime, timedelta, timezone
                    last_dt = datetime.fromisoformat(last_time.replace('Z', '+00:00'))
                    if datetime.now(timezone.utc) - last_dt > timedelta(hours=36):
                        results["errors"].append(f"Scraper hasn't run successfully in >36 hours")
                        results["overall_status"] = "degraded"
        else:
            results["checks"]["last_run"] = "⚠ No status file found"
    except Exception as e:
        results["checks"]["last_run"] = f"⚠ Error reading status: {e}"
    
    return results

if __name__ == "__main__":
    print("🔍 Running Spotify Scraper Health Check...")
    results = health_check()
    
    # Pretty print results
    print(f"\n{'='*60}")
    print(f"Status: {results['overall_status'].upper()}")
    print(f"Time: {results['timestamp']}")
    print(f"{'='*60}\n")
    
    print("Checks:")
    for check, status in results["checks"].items():
        print(f"  {check.ljust(25)}: {status}")
    
    if results["errors"]:
        print(f"\n❌ Errors ({len(results['errors'])}):")
        for error in results["errors"]:
            print(f"  - {error}")
    
    # Save results for API to read
    with open("health_status.json", "w") as f:
        json.dump(results, f, indent=2)
    
    print(f"\n✅ Health check saved to health_status.json")
    
    # Exit with error code if unhealthy
    sys.exit(0 if results["overall_status"] == "healthy" else 1)

