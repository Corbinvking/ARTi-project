#!/usr/bin/env python3
"""
Patch script to add API endpoints and CORS to Flask main.py
Run this on the droplet: python3 flask-api-endpoints-patch.py
"""

import sys
import os

def patch_main_py(file_path):
    """Add CORS and API endpoints to main.py"""
    
    with open(file_path, 'r') as f:
        content = f.read()
    
    # Check if already patched
    if 'from flask_cors import CORS' in content and '/api/create_campaign' in content:
        print("✅ main.py already has API endpoints - skipping patch")
        return True
    
    lines = content.split('\n')
    new_lines = []
    i = 0
    
    # Step 1: Add CORS import
    cors_import_added = False
    while i < len(lines):
        line = lines[i]
        new_lines.append(line)
        
        # Add CORS import after flask imports
        if 'from flask import' in line and not cors_import_added:
            new_lines.append('from flask_cors import CORS')
            cors_import_added = True
            print("✅ Added CORS import")
        
        i += 1
    
    # Rebuild content
    content = '\n'.join(new_lines)
    
    # Step 2: Add CORS initialization after app = Flask
    if 'CORS(app' not in content:
        content = content.replace(
            'app = Flask(__name__, template_folder="templates")',
            'app = Flask(__name__, template_folder="templates")\nCORS(app, resources={r"/api/*": {"origins": "*"}})'
        )
        print("✅ Added CORS initialization")
    
    # Step 3: Add API endpoints before "if __name__ == '__main__':"
    api_endpoints = '''

# ============================================================================
# API Endpoints for Ratio Fixer Bridge Integration
# ============================================================================

def verify_api_key():
    """Verify API key from request headers"""
    api_key = request.headers.get('X-API-Key')
    expected_key = os.getenv('RATIO_FIXER_API_KEY')
    if expected_key and api_key != expected_key:
        return jsonify({"error": "Unauthorized"}), 401
    return None

@app.route("/api/create_campaign", methods=["POST"])
def api_create_campaign():
    """API endpoint for creating campaigns via bridge"""
    try:
        # Verify API key
        auth_error = verify_api_key()
        if auth_error:
            return auth_error
        
        data = request.json
        if not data:
            return jsonify({"error": "No JSON data provided"}), 400
        
        video_id = data.get('video_id')
        if not video_id:
            return jsonify({"error": "video_id is required"}), 400
        
        youtube_url = data.get('youtube_url', f'https://www.youtube.com/watch?v={video_id}')
        genre = data.get('genre', 'General')
        comments_sheet = data.get('comments_sheet', '')
        wait_time = data.get('wait_time', 36)
        minimum_engagement = data.get('minimum_engagement', 500)
        comment_server = data.get('comment_server', 439)
        like_server = data.get('like_server', 2324)
        sheet_tier = data.get('sheet_tier', '1847390823')
        
        # Clean the comments sheet URL
        if comments_sheet:
            comments_sheet = comments_sheet.replace(" ", "")
            parts = comments_sheet.split("/")
            comments_sheet = "/".join(parts[:6])
            comments_sheet = comments_sheet.rstrip("/")
        
        # Create campaign
        rc = YoutubeRatioCalc(API_KEY, video_id)
        likes, comments, views = rc.get_views_likes_cmnts()
        title = rc.get_video_title() or f"Video {video_id}"
        
        campaign_data = CampaignModel(
            campaign_id=str(uuid.uuid4()),
            video_title=title,
            video_link=youtube_url,
            video_id=video_id,
            genre=genre,
            comments_sheet_url=comments_sheet,
            wait_time=wait_time,
            status="Running",
            likes=likes,
            comments=comments,
            views=views,
            like_server_id=like_server,
            comment_server_id=comment_server,
            ordered_likes=None,
            ordered_comments=None,
            sheet_tier=sheet_tier,
            minimum_engagement=minimum_engagement,
        )
        
        db.session.add(campaign_data)
        save_db_changes()
        
        campaign = Campaign(
            campaign_data.to_dict(),
            rc,
            comments_sheet,
            wait_time,
            minimum_engagement
        )
        
        campaign_thread = threading.Thread(target=campaign.run, args=(views,))
        campaign_thread.start()
        campaign_threads[campaign_data.campaign_id] = (campaign, campaign_thread)
        
        logger.info(f"API: Created campaign {campaign_data.campaign_id} for video {video_id}")
        
        return jsonify({
            "success": True,
            "campaign_id": campaign_data.campaign_id,
            "message": "Campaign started successfully"
        }), 200
        
    except Exception as e:
        logger.error(f"API create campaign error: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/campaign_status/<campaign_id>", methods=["GET"])
def api_campaign_status(campaign_id):
    """API endpoint for getting campaign status"""
    try:
        # Verify API key
        auth_error = verify_api_key()
        if auth_error:
            return auth_error
        
        campaign, _ = campaign_threads.get(campaign_id, (None, None))
        
        if campaign:
            data = {
                "views": campaign.ratio_calculator.views or 0,
                "likes": campaign.ratio_calculator.likes or 0,
                "comments": campaign.ratio_calculator.comments or 0,
                "status": campaign.data.get("Status", "Unknown"),
                "desired_comments": math.floor(campaign.desired_comments) if campaign.desired_comments else 0,
                "desired_likes": math.floor(campaign.desired_likes) if campaign.desired_likes else 0,
                "ordered_likes": campaign.ordered_likes or 0,
                "ordered_comments": campaign.ordered_comments or 0,
            }
            return jsonify(data), 200
        else:
            return jsonify({"error": "Campaign not found"}), 404
            
    except Exception as e:
        logger.error(f"API status error: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/stop_campaign/<campaign_id>", methods=["POST"])
def api_stop_campaign(campaign_id):
    """API endpoint for stopping a campaign"""
    try:
        # Verify API key
        auth_error = verify_api_key()
        if auth_error:
            return auth_error
        
        logger.info(f"API: Stopping campaign {campaign_id}")
        campaign_data = CampaignModel.query.get(campaign_id)
        
        if not campaign_data:
            return jsonify({"error": "Campaign not found"}), 404
        
        campaign_data.status = "Completed"
        save_db_changes()
        
        campaign, campaign_thread = campaign_threads.get(campaign_id, (None, None))
        if campaign:
            logger.info(f"API: Stopping campaign {campaign_id} thread")
            campaign.stop()
            thread = threading.Thread(target=stop_campaign_thread, args=(campaign_id,))
            thread.start()
        
        campaign_threads.pop(campaign_id, None)
        
        logger.info(f"API: Stopped campaign {campaign_id}")
        return jsonify({
            "success": True,
            "message": "Campaign stopped successfully"
        }), 200
            
    except Exception as e:
        logger.error(f"API stop campaign error: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/healthz", methods=["GET"])
def health_check():
    """Health check endpoint"""
    return jsonify({"status": "healthy"}), 200

'''
    
    # Insert before "if __name__ == '__main__':"
    if '/api/create_campaign' not in content:
        content = content.replace(
            'if __name__ == "__main__":',
            api_endpoints + '\nif __name__ == "__main__":'
        )
        print("✅ Added API endpoints")
    
    # Write back
    with open(file_path, 'w') as f:
        f.write(content)
    
    print(f"✅ Successfully patched {file_path}")
    return True

if __name__ == '__main__':
    if len(sys.argv) > 1:
        file_path = sys.argv[1]
    else:
        file_path = 'main.py'
    
    if not os.path.exists(file_path):
        print(f"❌ Error: {file_path} not found")
        sys.exit(1)
    
    success = patch_main_py(file_path)
    if success:
        print("\n✅ Patch complete! Next steps:")
        print("1. Install flask-cors: pip install flask-cors")
        print("2. Test: python main.py")
        print("3. Test endpoint: curl http://localhost:5000/healthz")
    else:
        print("\n❌ Patch failed")
        sys.exit(1)

