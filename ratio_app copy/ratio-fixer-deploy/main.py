# Copyright (c) 2024, Artist Influence Development Team
# All rights reserved.

import logging as log
import os
import threading
import uuid

import numpy as np
import pandas as pd
from dotenv import load_dotenv
from flask import (Flask, flash, jsonify, redirect, render_template, request,
                   send_file, send_from_directory, session, url_for)
from flask_bcrypt import Bcrypt
from flask_login import (LoginManager, UserMixin, current_user, login_required,
                         login_user, logout_user)
from flask_sqlalchemy import SQLAlchemy
from google.cloud import storage
from sqlalchemy import create_engine

from campaign import Campaign, YoutubeRatioCalc
from jingle_smm import JingleSMM
from logger import logger
from flask_migrate import Migrate 
import math 

load_dotenv()
API_KEY = os.getenv("YOUTUBE_API_KEY")

# Initialize GCP storage client
storage_client = storage.Client()
bucket_name = "rich-phenomenon-428302-q5.appspot.com"
bucket = storage_client.bucket(bucket_name)

# Update SQLite database path
db_blob_name = "campaigns.db"
# db_file_path =  f"/tmp/{db_blob_name}"
db_file_path = db_blob_name


# Initialize Flask app and SQLAlchemy
app = Flask(__name__, template_folder="templates")
app.config["SQLALCHEMY_DATABASE_URI"] = f"sqlite:///{db_file_path}"
app.config["SQLALCHEMY_ECHO"] = True  # Log SQL queries to the console
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
app.secret_key = (
  "your_secret_key"  # You should use a secure and random secret key for production
)

db = SQLAlchemy(app)
migrate  = Migrate(app , db)
bcrypt = Bcrypt(app)


login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = "login"

bcrypt = Bcrypt(app)


class CampaignModel(db.Model):
    id = db.Column(db.Integer)
    campaign_id = db.Column(
        db.String(36), unique=True, nullable=False, primary_key=True
    )
    video_title = db.Column(db.String(100), nullable=False)
    video_link = db.Column(db.String(255), nullable=False)
    video_id = db.Column(db.String(50), nullable=False)
    genre = db.Column(db.String(50), nullable=False)
    comments_sheet_url = db.Column(db.String(255), nullable=False)
    wait_time = db.Column(db.Integer, nullable=False)
    minimum_engagement = db.Column(db.Integer, nullable=True)
    status = db.Column(db.String(50), nullable=False)
    likes = db.Column(db.Integer, nullable=True)
    comments = db.Column(db.Integer, nullable=True)
    views = db.Column(db.Integer, nullable=True)
    desired_comments = db.Column(db.Integer, nullable=True)
    desired_likes = db.Column(db.Integer, nullable=True)
    comment_server_id = db.Column(db.Integer , nullable=True)  #New Column 
    like_server_id = db.Column(db.Integer , nullable=True) #New Column 
    ordered_likes = db.Column(db.Integer , nullable=True)  #New Column 
    ordered_comments = db.Column(db.Integer , nullable=True) #New Column 
    sheet_tier = db.Column(db.String(50) , nullable=True) #New Column

    def to_dict(self):
        return {
            "Campaign ID": self.campaign_id,
            "Video Title": self.video_title,
            "Video Link": self.video_link,
            "Video ID": self.video_id,
            "Genre": self.genre,
            "Comments Sheet URL": self.comments_sheet_url,
            "Wait Time": self.wait_time,
            "Minimum Engagement": self.minimum_engagement,
            "Status": self.status,
            "Likes": self.likes,
            "Comments": self.comments,
            "Views": self.views,
            "Desired Comments": self.desired_comments,
            "Desired Likes": self.desired_likes,
            "Comment Server ID" : self.comment_server_id , 
            "Like Server ID" : self.like_server_id,
            "Sheet Tier" : self.sheet_tier,
        }


# # Mock database
users = {}


class User(UserMixin):
    def __init__(self, id, username, password):
        self.id = id
        self.username = username
        self.password = password


def download_db():
    blob = bucket.blob(db_blob_name)
    blob.download_to_filename(db_file_path)
    if not os.path.exists(db_file_path):
        open(db_file_path, "w").close()


def upload_db():
    blob = bucket.blob(db_blob_name)
    blob.upload_from_filename(db_file_path)
    print(f"File {db_blob_name} uploaded to {bucket_name}.")


def save_db_changes():
    db.session.commit()
    upload_db()


@app.before_request
def create_tables():
    app.before_request_funcs[None].remove(create_tables)
    download_db()
    db.create_all()
    for campaign in CampaignModel.query.all():
        logger.info(
            f"Checking campaign {campaign.campaign_id} status, {campaign.status}"
        )
        if campaign.status == "Running":
            logger.info(
                f"Restarting campaign {campaign.video_id} due to server restart"
            )
            start_campaign_thread(campaign.campaign_id)


# # User loader function for Flask-Login
@login_manager.user_loader
def load_user(user_id):
    return users.get(user_id)


# # Global dictionary to store campaign threads
campaign_threads = {}


def load_csv(file_path):
    return pd.read_csv(file_path)


def process_campaign(comments, video_id, service=440):
    api = JingleSMM()
    # Add order
    order = api.order(
        {
            "service": service,
            "link": f"https://www.youtube.com/watch?v={video_id}",
            "comments": comments,
        }
    )
    print(order, "order")
    if "error" in order:
        print("Error: " + order["error"])
    else:
        print(order)
    # Check order status
    status = api.status(order["order"])
    return status, order["order"]


def stop_campaign_thread(campaign_id):
    try:
        campaign, campaign_thread = campaign_threads.get(campaign_id, (None, None))
        if campaign and campaign_thread.is_alive():
            logger.info(f"Stopping campaign {campaign_id} thread")
            campaign.stop()
            logger.info(f"Waiting for campaign {campaign_id} thread to stop")
            campaign_thread.join()
            logger.info(f"Campaign {campaign_id} thread stopped")
        else:
            logger.info(f"Campaign {campaign_id} thread not found")
    except Exception as e:
        logger.error(f"Error stopping campaign {campaign_id} thread: {e}")
        return False
    return True


def stop_and_clear_all_campaigns(campaign_threads, db, CampaignModel):
    """
    Stops all active campaigns, clears campaign threads, and deletes all campaign records from the database.

    Args:
        campaign_threads (dict): Dictionary storing all active campaign threads.
        db (SQLAlchemy): SQLAlchemy instance to interact with the database.
        CampaignModel (db.Model): The Campaign model representing the campaigns table in the database.
    """
    logger.info("Stopping and clearing all campaigns.")

    # Iterate over all active campaigns and stop them
    for campaign_id, (campaign, campaign_thread) in campaign_threads.items():
        if campaign_thread.is_alive():  # Check if the thread is still running
            campaign.stop()  # Signal the campaign to stop
            logger.info(f"Waiting for campaign {campaign_id} thread to stop.")
            # Stop the campaign asynchronously
            thread = threading.Thread(target=stop_campaign_thread, args=(campaign_id,))
            thread.start()
            logger.info(f"Campaign {campaign_id} has been stopped.")

    # Clear the campaign_threads dictionary
    campaign_threads.clear()

    # Delete all campaigns from the database
    try:
        num_deleted = db.session.query(CampaignModel).delete()
        save_db_changes()
        logger.info(f"Deleted {num_deleted} campaigns from the database.")
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error clearing campaigns from the database: {e}")

    logger.info(
        "All campaigns have been stopped, cleared, and removed from the database."
    )


def start_all_campaigns(campaign_threads, CampaignModel):
    """
    Starts all campaigns in the database.

    Args:
        campaign_threads (dict): Dictionary storing all active campaign threads.
        db (SQLAlchemy): SQLAlchemy instance to interact with the database.
        CampaignModel (db.Model): The Campaign model representing the campaigns table in the database.
    """
    logger.info("Starting all campaigns.")
    try:
        # Retrieve all campaigns from the database
        all_campaigns = CampaignModel.query.all()

        # Iterate over all campaigns and start them
        for campaign_data in all_campaigns:
            try:
                rc = YoutubeRatioCalc(API_KEY, campaign_data.video_id)
                rc.get_views_likes_cmnts()
                rc.get_video_title()
                campaign = Campaign(
                    campaign_data.to_dict(),
                    rc,
                    campaign_data.comments_sheet_url,
                    campaign_data.wait_time,
                )
                campaign.data["Status"] = "Running"
                campaign_thread = threading.Thread(
                    target=campaign.run, args=(campaign.data["Views"],)
                )
                campaign_thread.start()
                campaign_threads[campaign_data.campaign_id] = (
                    campaign,
                    campaign_thread,
                )
                campaign_data.status = "Running"
                save_db_changes()
                logger.info(f"Started campaign {campaign_data.campaign_id}")
            except Exception as e:
                logger.error(
                    f"Error starting campaign {campaign_data.campaign_id}: {e}"
                )

        logger.info("All campaigns have been started.")
        return True
    except Exception as e:
        logger.error(f"Error starting all campaigns: {e}")
        return False


@app.route("/favicon.ico")
def favicon():
    return send_from_directory(
        os.path.join(app.root_path, "./static/AI_Logo_2024--r.png"),
        "favicon.ico",
        mimetype="image/vnd.microsoft.icon",
    )


@app.route("/register", methods=["GET", "POST"])
def register():
    if request.method == "POST":
        username = request.form["username"]
        password = request.form["password"]
        hashed_password = bcrypt.generate_password_hash(password).decode("utf-8")
        user_id = str(len(users) + 1)
        users[user_id] = User(user_id, username, hashed_password)
        flash("Registration successful. Please log in.", "success")
        return redirect(url_for("login"))
    return render_template("register.html")


@app.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        username = request.form["username"]
        password = request.form["password"]
        user = next((u for u in users.values() if u.username == username), None)
        if user and bcrypt.check_password_hash(user.password, password):
            login_user(user)
            flash("Login successful.", "success")
            return redirect(url_for("index"))
        else:
            flash("Invalid username or password.", "danger")
    return render_template("login.html")


@app.route("/logout")
@login_required
def logout():
    logout_user()
    flash("You have been logged out.", "success")
    return redirect(url_for("login"))

comment_servers = [
    {
        "title" : "Youtube Custom Comments [Non Drop] [Speed 10K/Day] [Super Instant] [English Names]",
        "service_id" : 439
    },
    {
        "title" : "Youtube Custom Comments [Instant Start]",
        "service_id" : 2557
    },
    {
        "title" : "YouTube comments [Custom] [USA]",
        "service_id" : 4458
    },
    {
        "title" : "Youtube Comments [CUSTOM] [100] [HISPANIC]",
        "service_id" : 1579
    },
    {
        "title" : "Youtube Custom Comments [High Quality] [English Names] [Start Time: Instant] Non Drop",
        "service_id" : 1378
    }
]

like_servers = [
    {
        "title" : "Youtube Likes (Non drop) [ 30 DAYS REFILL ] INSTANT",
        "service_id" : 113
    },
    {
        "title" : "Youtube Likes [Non Drop] [MAX 100K] - SUPER FAST [Refill 30 Days]",
        "service_id" : 2324
    },
    {
        "title" : "Youtube Video Likes [Refill 30 days] [No Drop] [MAX - 5k]",
        "service_id" : 438
    },
    {
        "title" : "YouTube comments [Custom] [USA]",
        "service_id" : 4458
    },
]
sheet_tiers = [
    {
        "name" : "Tier One",
        "value" : "0"
    },
    {
        "name" : "Tier Two",
        "value" : "1606211645"
    },
        {
        "name" : "Tier Three",
        "value" : "793138276"
    },
]
@app.route("/", methods=["GET", "POST"])
@login_required
def index():
    all_campaigns = CampaignModel.query.all()
    campaigns = [campaign.to_dict() for campaign in all_campaigns]
    return render_template(
        "index.html", 
        user=current_user, 
        campaigns=campaigns , 
        comment_servers=comment_servers,
        like_servers=like_servers,
        sheet_tiers=sheet_tiers
    )


@app.route("/create_campaign", methods=["GET", "POST"])
@login_required
def create_campaign():
    if request.method == "POST":
        video_link = request.form["youtube_url"]
        video_id = video_link.split("v=")[1]
        if not video_id:
            flash(
                "Please enter a YouTube video link and upload comments first.", "danger"
            )
            return redirect(url_for("index"))
        genre = request.form["genre"]
        comments_sheet = request.form["comments_sheet"]
        # Clean the comments sheet URL
        comments_sheet = comments_sheet.replace(" ", "")
        # Strip everything after the sheet id
        parts = comments_sheet.split("/")
        comments_sheet = "/".join(parts[:6])
        comments_sheet = comments_sheet.rstrip("/")
        wait_time = int(request.form["wait_time"])
        minimum_engagement = int(request.form["minimum_engagement"])
        rc = YoutubeRatioCalc(API_KEY, video_id) 
        likes, comments, views = rc.get_views_likes_cmnts()
        title =  rc.get_video_title()
        comment_server=request.form.get("comment_server") 
        like_server = request.form.get("like_server")
        comment_server_id = int(comment_server) if comment_server is not None else 439 
        like_server_id = int(like_server) if like_server is not None else 2324 
        form_tier = request.form.get("sheet_tier")
        if form_tier is not None:
            sheet_tier = form_tier
        else:
            sheet_tier = next((tier["value"] for tier in sheet_tiers if tier["name"] == "Tier One"), "1847390823")
        try:
            logger.info(f"Selected sheet_tier: {sheet_tier}")
            campaign_data = CampaignModel(
                campaign_id=str(uuid.uuid4()),  # Generate a unique campaign ID
                video_title=title,
                video_link=video_link,
                video_id=video_id,
                genre=genre,
                comments_sheet_url=comments_sheet,
                wait_time=wait_time,
                status="Running",
                likes=likes,
                comments=comments,
                views=views,
                like_server_id = like_server_id ,
                comment_server_id = comment_server_id ,
                ordered_likes = None ,
                ordered_comments = None ,
                sheet_tier = sheet_tier,
                minimum_engagement = minimum_engagement,
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
            # Start the campaign in a new thread
            flash("Campaign created and running!", "success")
            campaign_thread = threading.Thread(target=campaign.run, args=(views,))
            campaign_thread.start()
            campaign_threads[campaign_data.campaign_id] = (campaign, campaign_thread)

            return redirect(url_for("index"))
        except Exception as e:
            flash(f"An error occurred: {str(e)}", "danger")
            return redirect(url_for("index"))
    flash("Please enter a YouTube video link and upload comments first.", "danger")
    return redirect(url_for("index"))


@app.route("/campaign_status/<campaign_id>", methods=["GET"])
@login_required
def campaign_status(campaign_id):
    campaign, _ = campaign_threads.get(campaign_id, (None, None))
    logger.debug(f"Starting campaign status long polling for {campaign_id}")
    try:
        if campaign:
            data = {
                "views": campaign.ratio_calculator.views,
                "likes": campaign.ratio_calculator.likes,
                "comments": campaign.ratio_calculator.comments,
                "status": campaign.data["Status"],
                "desired_comments": (
                    math.floor(campaign.desired_comments)
                    if campaign.desired_comments
                    else 0
                ),
                "desired_likes": (
                    math.floor(campaign.desired_likes) if campaign.desired_likes else 0
                ),
            }
            logger.debug(f"Video ID: {campaign.data['Video ID']}," f"Data: {data}")
            logger.debug(f"Data: {data}")
            return jsonify(data)
        else:
            return jsonify({"error": "Campaign not found"}), 404
    except Exception as e:
        logger.error(f"An error occurred: {str(e)}")
        return jsonify({"error": str(e)}), 500
    finally:
        logger.debug(f"Ending campaign status long polling for {campaign_id}")


def start_campaign_thread(campaign_id):
    campaign_data = CampaignModel.query.get(campaign_id)
    rc = YoutubeRatioCalc(API_KEY, campaign_data.video_id)
    rc.get_views_likes_cmnts()
    rc.get_video_title()
    campaign = Campaign(
        campaign_data.to_dict(),
        rc,
        campaign_data.comments_sheet_url,
        campaign_data.wait_time,
        campaign_data.minimum_engagement,
    )
    campaign.data["Status"] = "Running"
    # logger.info(f"Campaign {campaign_id} - Views: {campaign.data['Views']}, Desired Views: {campaign.data['Desired Views']}, Data Views: {campaign.data["Views"]}")
    logger.info(f"(start_campaign_thread)Campaign {campaign_id} - Views: {campaign.data['Views']}, Data: {campaign.data}")
    campaign_thread = threading.Thread(
        target=campaign.run, args=(campaign.data["Views"],)
    )
    campaign_thread.start()
    campaign_threads[campaign_id] = (campaign, campaign_thread)
    campaign_data.status = "Running"
    save_db_changes()

@app.route("/run_likes_only/<campaign_id>", methods=["POST"])
@login_required
def run_likes_only(campaign_id):
    try: 
        # Get the campaign data
        campaign_data = CampaignModel.query.get(campaign_id)
        if campaign_data:
            # Pass "likes only" as the service to process_campaign
            status, order_id = process_campaign(campaign_data.desired_likes, campaign_data.video_id, service=440)
    except Exception as e:
        logger.error(f"An error occurred: {str(e)}")
        return redirect(url_for("index"))

@app.route("/start_campaign/<campaign_id>", methods=["POST"])
@login_required
def start_campaign(campaign_id):
    try:
        logger.info(f"Starting campaign {campaign_id}")
        campaign_data = CampaignModel.query.get(campaign_id)
        if campaign_data and campaign_data.status == "Completed":
            # Stop the campaign if it is already running
            stop_campaign_thread(campaign_id)
            logger.info(f"Restarting campaign {campaign_id}")
            start_campaign_thread(campaign_id)
        return redirect(url_for("index"))
    except Exception as e:
        logger.error(f"An error occurred: {str(e)}")
        return redirect(url_for("index"))


@app.route("/stop_campaign/<campaign_id>", methods=["POST"])
@login_required
def stop_campaign(campaign_id):
    logger.info(f"Stopping campaign {campaign_id}")
    campaign = CampaignModel.query.get(campaign_id)
    campaign.status = "Completed"
    save_db_changes()
    campaign, campaign_thread = campaign_threads.get(campaign_id, (None, None))
    # Stop the campaign
    if campaign:
        logger.info(f"Stopping campaign {campaign_id} thread")
        campaign.stop()
        # Stop the campaign asynchronously
        thread = threading.Thread(target=stop_campaign_thread, args=(campaign_id,))
        thread.start()
    # Remove the campaign from the campaign_threads dictionary
    campaign_threads.pop(campaign_id, None)
    return redirect(url_for("index"))

@app.route("/export_campaigns", methods=["GET"])
@login_required
def export():
    all_campaigns = CampaignModel.query.all()
    campaigns = [campaign.to_dict() for campaign in all_campaigns]
    campaigns_df = pd.DataFrame(campaigns)
    file_path = "campaigns_report.csv"
    campaigns_df.to_csv(file_path, index=False)
    return send_file(file_path, as_attachment=True)


@app.route("/delete_campaign/<campaign_id>", methods=["POST"])
@login_required
def delete_campaign(campaign_id):
    campaign = CampaignModel.query.get(campaign_id)
    if campaign:
        db.session.delete(campaign)
        if campaign_id in campaign_threads:
            campaign, campaign_thread = campaign_threads.get(campaign_id, (None, None))
            if campaign_thread.is_alive():
                campaign.stop()
                thread = threading.Thread(
                    target=stop_campaign_thread, args=(campaign_id,)
                )
                thread.start()
            campaign_threads.pop(campaign_id, None)
        save_db_changes()
        return redirect(url_for("index"))
    return redirect(url_for("index"))


@app.route("/stop", methods=["POST"])
@login_required
def stop():
    for campaign_id, (campaign, campaign_thread) in campaign_threads.items():
        if campaign_thread.is_alive():  # Check if the thread is still running
            campaign.stop()  # Signal the campaign to stop
            # Stop the campaign asynchronously
            logger.info(f"Stopping campaign {campaign_id} thread")
            thread = threading.Thread(target=stop_campaign_thread, args=(campaign_id,))
            thread.start()
    # Clear the campaign_threads dictionary
    campaign_threads.clear()
    # Clear the campaigns in the session
    db.session.query(CampaignModel).update({CampaignModel.status: "Completed"})
    save_db_changes()
    logger.info("All campaigns stopped!")
    # Update the status of all campaigns in the session
    flash("All campaigns stopped!", "success")
    return redirect(url_for("index"))


@app.route("/start_all_campaigns", methods=["POST"])
@login_required
def start_all():
    start_all_campaigns(campaign_threads, CampaignModel)
    logger.info("All campaigns have been started!")
    flash("All campaigns have been started!", "success")
    return redirect(url_for("index"))


@app.route("/clear_all_campaigns", methods=["POST"])
@login_required
def stop_all_campaigns():
    stop_and_clear_all_campaigns(campaign_threads, db, CampaignModel)
    logger.info(
        "All campaigns have been stopped, cleared, and removed from the database!"
    )
    flash(
        "All campaigns have been stopped, cleared, and removed from the database!",
        "success",
    )
    return redirect(url_for("index"))

#Get a Campagin by its UUID 
@app.route("/campaigns/<campaign_id>", methods=["GET"])
@login_required
def get_campaign(campaign_id):
    try:
        logger.info(f'Retrieving Info about Campaing {campaign_id}')
        campaign = CampaignModel.query.filter_by(campaign_id=campaign_id).first() 
        if campaign :
            data = campaign.to_dict() 
            return jsonify(data)
        return jsonify({})
       
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    

if __name__ == "__main__":
    app.run(debug=True)
