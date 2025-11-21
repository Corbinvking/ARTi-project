#!/bin/bash
# Complete script to add API endpoints and CORS to Flask main.py
# Run this on the droplet: bash add-flask-api-endpoints-complete.sh

cd /opt/ratio-fixer

echo "Adding CORS and API endpoints to main.py..."

# Backup original
cp main.py main.py.backup

# Check if flask_cors is already imported
if ! grep -q "from flask_cors import CORS" main.py; then
    # Add CORS import after other flask imports
    sed -i '/^from flask import/a from flask_cors import CORS' main.py
    echo "✅ Added CORS import"
else
    echo "✅ CORS import already exists"
fi

# Check if CORS is initialized
if ! grep -q "CORS(app" main.py; then
    # Add CORS initialization after app = Flask line
    sed -i '/^app = Flask/a CORS(app, resources={r"/api/*": {"origins": "*"}})' main.py
    echo "✅ Added CORS initialization"
else
    echo "✅ CORS already initialized"
fi

# Add API endpoints before "if __name__ == '__main__':"
if ! grep -q "@app.route(\"/api/create_campaign\"" main.py; then
    # Find the line with "if __name__ == '__main__':"
    # Insert API endpoints before it
    cat >> /tmp/api_endpoints.txt << 'ENDOFFILE'

# ============================================================================
# API Endpoints for Ratio Fixer Bridge Integration
# ============================================================================

@app.route("/api/create_campaign", methods=["POST"])
def api_create_campaign():
    """API endpoint for creating campaigns via bridge"""
    try:
        # Validate API key if configured
        api_key = request.headers.get('X-API-Key')
        if os.getenv('RATIO_FIXER_API_KEY') and api_key != os.getenv('RATIO_FIXER_API_KEY'):
            return jsonify({"error": "Unauthorized"}), 401
        
        data = request.json
        if not data:
            return jsonify({"error": "No JSON data provided"}), 400
        
        video_id = data.get('video_id')
        if not video_id:
            return jsonify({"error": "video_id is required"}), 400
        
        genre = data.get('genre', 'General')
        comments_sheet = data.get('comments_sheet', '')
        wait_time = data.get('wait_time', 36)
        minimum_engagement = data.get('minimum_engagement', 500)
        comment_server = data.get('comment_server', 439)
        like_server = data.get('like_server', 2324)
        sheet_tier = data.get('sheet_tier', '1847390823')
        youtube_url = data.get('youtube_url', f'https://www.youtube.com/watch?v={video_id}')
        
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
        api_key = request.headers.get('X-API-Key')
        if os.getenv('RATIO_FIXER_API_KEY') and api_key != os.getenv('RATIO_FIXER_API_KEY'):
            return jsonify({"error": "Unauthorized"}), 401
        
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
        api_key = request.headers.get('X-API-Key')
        if os.getenv('RATIO_FIXER_API_KEY') and api_key != os.getenv('RATIO_FIXER_API_KEY'):
            return jsonify({"error": "Unauthorized"}), 401
        
        success = stop_campaign(campaign_id, campaign_threads, CampaignModel)
        
        if success:
            logger.info(f"API: Stopped campaign {campaign_id}")
            return jsonify({"success": True, "message": "Campaign stopped successfully"}), 200
        else:
            return jsonify({"error": "Failed to stop campaign"}), 500
            
    except Exception as e:
        logger.error(f"API stop campaign error: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/healthz", methods=["GET"])
def health_check():
    """Health check endpoint"""
    return jsonify({"status": "healthy"}), 200

ENDOFFILE

    # Insert before "if __name__ == '__main__':"
    python3 << 'PYTHON_SCRIPT'
import sys

with open('main.py', 'r') as f:
    lines = f.readlines()

# Find the line with "if __name__ == '__main__':"
insert_index = None
for i, line in enumerate(lines):
    if 'if __name__' in line and '__main__' in line:
        insert_index = i
        break

if insert_index is None:
    print("ERROR: Could not find 'if __name__ == __main__' line")
    sys.exit(1)

# Read API endpoints
with open('/tmp/api_endpoints.txt', 'r') as f:
    api_code = f.read()

# Insert API endpoints
lines.insert(insert_index, api_code)

# Write back
with open('main.py', 'w') as f:
    f.writelines(lines)

print("✅ API endpoints added successfully")
PYTHON_SCRIPT

    rm /tmp/api_endpoints.txt
    echo "✅ Added API endpoints"
else
    echo "✅ API endpoints already exist"
fi

echo ""
echo "✅ Setup complete! Testing syntax..."
python3 -m py_compile main.py && echo "✅ Syntax check passed" || echo "❌ Syntax error - check main.py"

echo ""
echo "Next steps:"
echo "1. Install flask-cors: pip install flask-cors"
echo "2. Test: python main.py"
echo "3. Test endpoint: curl http://localhost:5000/healthz"

