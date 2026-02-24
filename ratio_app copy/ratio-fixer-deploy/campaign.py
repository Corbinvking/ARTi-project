# Copyright (c) 2024, Artist Influence Development Team
# All rights reserved.

import logging as log
import os
import threading
import time

import numpy as np
import pandas as pd
from dotenv import load_dotenv
from google.oauth2.service_account import Credentials
from googleapiclient.discovery import build
from jingle_smm import JingleSMM
from logger import logger 
import re 
from sklearn.linear_model import LinearRegression
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import r2_score
import warnings
warnings.filterwarnings('ignore')

# import certifi

# os.environ['SSL_CERT_FILE'] = certifi.where()
# Load environment variables
load_dotenv()

# Set up Google Sheets API
SCOPES = [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/drive",
]
SERVICE_ACCOUNT_FILE = (
    f"{os.path.dirname(__file__)}/rich-phenomenon-428302-q5-dba5f2f381c1.json"
)

creds = Credentials.from_service_account_file(SERVICE_ACCOUNT_FILE, scopes=SCOPES)

sheet_service = build("sheets", "v4", credentials=creds)


def load_data(file_path: str, dtype: dict = None):
    try:
        df = pd.read_csv(
            file_path,
            dtype=dtype,
        )
    except Exception as e:
        logger.error(f"Failed to load data from {file_path}: {e}")
        logger.info(f"Loaded data dtype {dtype}")
        raise e
    logger.info(f"Loaded data from {file_path}")
    return df


class ImprovedYoutubeRatioCalc:
    """Improved version with better regression handling and bounds checking"""
    
    def __init__(
        self,
        api_key,
        video_id,  
        music_gsheet="https://docs.google.com/spreadsheets/d/16-uqSMv4Zyisg-stZbCTFwLu32OZke6MLtMcDeOEcqI",
    ):
        self.api_key = api_key
        self.video_id = video_id
        self.video_details = None
        self.music_gsheet = music_gsheet
        self.likes, self.comments, self.views = self.get_views_likes_cmnts()
        
        # Ratio bounds for validation
        self.MAX_LIKES_RATIO = 0.15  # Max 15% likes:views ratio
        self.MIN_LIKES_RATIO = 0.001  # Min 0.1% likes:views ratio
        self.MAX_COMMENTS_RATIO = 0.05  # Max 5% comments:views ratio
        self.MIN_COMMENTS_RATIO = 0.0001  # Min 0.01% comments:views ratio

    def get_video_title(self):
        youtube = build("youtube", "v3", developerKey=self.api_key)
        request = youtube.videos().list(part="snippet", id=self.video_id)
        response = request.execute()

        if response["items"]:
            title = response["items"][0]["snippet"]["title"]
            return title
        else:
            return None

    def get_views_likes_cmnts(self):
        """Get the views, likes, and comments for a video."""
        try:
            youtube = build("youtube", "v3", developerKey=self.api_key)
            request = youtube.videos().list(part="statistics", id=self.video_id)
            response = request.execute()

            if response["items"]:
                statistics = response["items"][0]["statistics"]
                likes = int(statistics.get("likeCount", "0"))
                comments = int(statistics.get("commentCount", "0"))
                views = int(statistics.get("viewCount", "0"))

                self.video_details = {
                    "likes": likes,
                    "comments": comments,
                    "views": views,
                }
                self.likes, self.comments, self.views = likes, comments, views
                logger.info(f"Video details(get_views_likes_cmnts): {self.video_details}")
                return likes, comments, views
            else:
                logger.warning(f"No video details found for video ID: {self.video_id}")
                return None, None, None
        except Exception as e:
            logger.error(f"Error retrieving video details: {e}")
            return None, None, None

    def robust_regression(self, x_data, y_data, metric_name):
        """
        Improved regression with better error handling and validation
        """
        try:
            # Ensure we have enough data points
            if len(x_data) < 5:
                logger.warning(f"Insufficient data for {metric_name} regression: {len(x_data)} points")
                return None, 0.0
            
            # Remove any invalid data points
            valid_mask = (x_data > 0) & (y_data > 0) & np.isfinite(x_data) & np.isfinite(y_data)
            x_clean = x_data[valid_mask]
            y_clean = y_data[valid_mask]
            
            if len(x_clean) < 3:
                logger.warning(f"Insufficient valid data for {metric_name} regression after cleaning")
                return None, 0.0
            
            # Log transform
            log_x = np.log(x_clean)
            log_y = np.log(y_clean)
            
            # Check for infinite or NaN values after log transform
            if not (np.isfinite(log_x).all() and np.isfinite(log_y).all()):
                logger.warning(f"Invalid values after log transform for {metric_name}")
                return None, 0.0
            
            # Try linear regression first
            coeffs = np.polyfit(log_x, log_y, 1)
            predictions = np.polyval(coeffs, log_x)
            r2 = r2_score(log_y, predictions)
            
            logger.info(f"{metric_name} linear regression R²: {r2:.4f}")
            
            # If linear fit is poor, try quadratic (not cubic to avoid extreme extrapolation)
            if r2 < 0.70:  # Lowered threshold to be more conservative
                try:
                    coeffs = np.polyfit(log_x, log_y, 2)
                    predictions = np.polyval(coeffs, log_x)
                    r2_quad = r2_score(log_y, predictions)
                    
                    # Only use quadratic if it's significantly better
                    if r2_quad > r2 + 0.1:
                        logger.info(f"{metric_name} quadratic regression R²: {r2_quad:.4f}")
                        r2 = r2_quad
                    else:
                        # Revert to linear
                        coeffs = np.polyfit(log_x, log_y, 1)
                        logger.info(f"Reverting to linear regression for {metric_name}")
                except:
                    # If quadratic fails, stick with linear
                    coeffs = np.polyfit(log_x, log_y, 1)
                    logger.info(f"Quadratic regression failed for {metric_name}, using linear")
            
            return coeffs, r2
            
        except Exception as e:
            logger.error(f"Error in robust regression for {metric_name}: {e}")
            return None, 0.0

    def validate_and_bound_prediction(self, prediction, total_views, metric_name):
        """
        Validate and bound predictions to reasonable ranges
        """
        if not np.isfinite(prediction) or prediction <= 0:
            logger.warning(f"Invalid {metric_name} prediction: {prediction}")
            # Return a conservative estimate based on current ratios
            if metric_name == "likes":
                return max(total_views * self.MIN_LIKES_RATIO, 10)
            else:  # comments
                return max(total_views * self.MIN_COMMENTS_RATIO, 1)
        
        # Apply bounds based on metric type
        if metric_name == "likes":
            max_allowed = total_views * self.MAX_LIKES_RATIO
            min_allowed = total_views * self.MIN_LIKES_RATIO
        else:  # comments
            max_allowed = total_views * self.MAX_COMMENTS_RATIO
            min_allowed = total_views * self.MIN_COMMENTS_RATIO
        
        # Bound the prediction
        bounded_prediction = np.clip(prediction, min_allowed, max_allowed)
        
        if bounded_prediction != prediction:
            logger.warning(f"{metric_name} prediction {prediction:.0f} bounded to {bounded_prediction:.0f}")
        
        return bounded_prediction

    def calculate_ratio(self, metric, views_arr, df):
        """
        Improved ratio calculation with better error handling
        """
        try:
            metric_data = df[metric].values
            return self.robust_regression(views_arr, metric_data, metric)
        except Exception as e:
            logger.error(f"Error calculating ratio for {metric}: {e}")
            return None, 0.0

    def desired_views_likes(self, genre, desired_views=None, tier_grid="0"):
        """
        Improved prediction with validation and fallback mechanisms
        """
        try:
            df = load_data(
                f"{self.music_gsheet}/export?gid={tier_grid}&format=csv",
                {
                    "#views": "int",
                    "#likes": "int",
                    "#comments": "int",
                    "views": "int",
                    "likes": "int",
                    "comments": "int",
                    "genre": "str",
                    "like:view": "float",
                    "comment:view": "float",
                },
            )
            
            # Filter by genre
            genre_splice = df[df["genre"] == genre]
            
            if len(genre_splice) == 0:
                logger.warning(f"No data found for genre: {genre}")
                # Fallback to overall data
                genre_splice = df
                logger.info(f"Using all data as fallback ({len(genre_splice)} samples)")
            
            if len(genre_splice) < 3:
                logger.error(f"Insufficient data for predictions: {len(genre_splice)} samples")
                # Return conservative estimates
                total_views = self.video_details["views"] + (desired_views or 0)
                return (
                    total_views * 0.02,  # 2% likes ratio
                    total_views * 0.001  # 0.1% comments ratio
                )
            
            # Calculate regression models
            comments_eq, comments_r2 = self.calculate_ratio(
                "#comments", genre_splice["#views"], genre_splice
            )
            likes_eq, likes_r2 = self.calculate_ratio(
                "#likes", genre_splice["#views"], genre_splice
            )
            
            if comments_eq is None or likes_eq is None:
                logger.error("Failed to create regression models")
                # Return conservative estimates
                total_views = self.video_details["views"] + (desired_views or 0)
                return (
                    total_views * 0.02,  # 2% likes ratio
                    total_views * 0.001  # 0.1% comments ratio
                )
            
            # Calculate target views
            total_views = self.video_details["views"] + (desired_views or 0)
            
            # Make predictions
            try:
                desired_comments_raw = np.exp(np.polyval(comments_eq, np.log(total_views)))
                desired_likes_raw = np.exp(np.polyval(likes_eq, np.log(total_views)))
            except:
                logger.error("Error in prediction calculation")
                return (
                    total_views * 0.02,  # 2% likes ratio
                    total_views * 0.001  # 0.1% comments ratio
                )
            
            # Validate and bound predictions
            desired_comments = self.validate_and_bound_prediction(
                desired_comments_raw, total_views, "comments"
            )
            desired_likes = self.validate_and_bound_prediction(
                desired_likes_raw, total_views, "likes"
            )
            
            logger.info(f"(desired_views_likes) Genre: {genre}")
            logger.info(f"Desired views: {desired_views}, Video views: {self.video_details['views']}")
            logger.info(f"Total target views: {total_views}")
            logger.info(f"Raw predictions - Likes: {desired_likes_raw:.0f}, Comments: {desired_comments_raw:.0f}")
            logger.info(f"Final predictions - Likes: {desired_likes:.0f}, Comments: {desired_comments:.0f}")
            logger.info(f"Model quality - Likes R²: {likes_r2:.3f}, Comments R²: {comments_r2:.3f}")
            
            return desired_comments, desired_likes
            
        except Exception as e:
            logger.error(f"Error in desired_views_likes: {e}")
            # Return conservative fallback
            total_views = self.video_details["views"] + (desired_views or 0)
            return (
                total_views * 0.02,  # 2% likes ratio
                total_views * 0.001  # 0.1% comments ratio
            )


# Keep the original YoutubeRatioCalc for backward compatibility
class YoutubeRatioCalc(ImprovedYoutubeRatioCalc):
    """Backward compatible wrapper"""
    pass


class Campaign:
    def __init__(
            self, 
            data, 
            ratio_calculator, 
            comment_sheet, 
            wait_time=36,
            sheet_tier="0",
            minimum_engagement=500
        ):
        self.data = data
        self.api = JingleSMM()
        self.damper = 0.05
        self.video_id = data["Video ID"]
        self.genre = data["Genre"]
        self.comments_sheet = comment_sheet
        self.comments_sheet_id = comment_sheet.split("/")[-1]
        self.num_used_comments = 0
        self.ratio_calculator: ImprovedYoutubeRatioCalc = ratio_calculator
        self.comments_db = self.get_comments()
        self.used_comments = pd.DataFrame(columns=["comments", "used"])
        self.wait_time = wait_time
        self.minimum_engagement = minimum_engagement
        self.total_time = 0
        self.interval_seconds = 10
        self.stop_flag = threading.Event()  # Add a stop flag
        self.desired_comments = 0
        self.desired_likes = 0
        self.ordered_comments = 0
        self.ordered_likes = 0
        self.sheet_tier = sheet_tier 

    def get_comments(self):
        if self.comments_sheet:
            comments = load_data(
                self.comments_sheet + "/export?format=csv",
                {"Comments": "str", "Used": "str"},
            )
            # if the used column is not present, add it
            self.num_used_comments = comments[comments["Used"] == "Used"].shape[0]
            logger.info(f"Number of used comments: {self.num_used_comments}")
            # Remove comments that have already been used
            comments = comments[comments["Used"] != "Used"]
            comments = comments.drop_duplicates(subset=["Comments"], keep="first")
            logger.info(f"Loaded {comments.shape[0]} comments from the Google Sheet.")
            return comments
        else:
            return None

    def mark_comments_as_used(self, spreadsheet_id, comments):
        """
        Update the Google Sheet to mark the comments as used.

        Args:
            spreadsheet_id (str): The ID of the Google Sheet.
            comments (pd.DataFrame): The DataFrame containing the comments that were used.
        """
        try:
            # Assuming the comments are in the first column (A)
            used_comment_indices = len(comments.index.tolist()) + self.num_used_comments
            range_ = f"Sheet1!B2:B{used_comment_indices + 1}"
            # Prepare the data to be updated (e.g., mark with 'Used')
            update_values = [["Used"] for _ in range(used_comment_indices)]
            body = {"values": update_values}
            result = (
                sheet_service.spreadsheets()
                .values()
                .update(
                    spreadsheetId=spreadsheet_id,
                    range=range_,
                    valueInputOption="RAW",
                    body=body,
                )
                .execute()
            )

            logger.info(
                f"Updated {result.get('updatedCells')} cells in the Google Sheet for video ID: {self.video_id} spreadsheet ID: {spreadsheet_id}"
            )

        except Exception as e:
            logger.error(f"Error updating the Google Sheet: {e}")

    def _generate_multiples_of_10(self, low, high):
        return [i for i in range(low, high + 1) if i % 10 == 0]

    def order_comments(self, n=10, is_twelve_hour=False):
        comments = self.comments_db.head(n=n)
        response = ""
        # Split comments into chunks of 10
        comment_chunks = [
            "\r\n".join(comments[i : i + 10]["Comments"].values.flatten())
            for i in range(0, len(comments), 10)
        ]
        logger.info(
            f"(order_comments)Video ID: {self.video_id}, Ordering total of {comments.shape[0]} comments for {self.video_id}"
        )
        self.used_comments = pd.concat([self.used_comments, comments])
        # Drop the used comments from the comments database
        self.comments_db.drop(comments.index, inplace=True)
        logger.info(f"(order_comments)Video ID: {self.video_id}, Ordered comments: {response}")
        # Update the Google Sheet by marking the comments as used
        self.mark_comments_as_used(self.comments_sheet_id, self.used_comments)
        for comment_chunk in comment_chunks:
            # if comment_chunk is less than 5, skip
            if len(comment_chunk.splitlines()) < 10:
                # remove the comments from comments_db that are in this chunk
                chunk_comments = set(comment_chunk.splitlines())
                self.comments_db = self.comments_db[~self.comments_db["Comments"].isin(chunk_comments)]
                continue
            if self.stop_flag.is_set():
                break
            logger.info(
                f"(order_comments)Video ID: {self.video_id} Ordering {len(comment_chunk.splitlines())} comments"
            )
            # Sleep between sending batches of comments to simulate "drip" effect
            response = self.api.order(
                {
                    "service":  self.data["Comment Server ID"],
                    "link": f"https://www.youtube.com/watch?v={self.video_id}",
                    "comments": comment_chunk,
                }
            )
            logger.info(f"(order_comments)Video ID: {self.video_id} Ordered comments: {response}, is_twelve_hour: {is_twelve_hour}")
            if is_twelve_hour:
                self.interval_seconds = np.random.randint(10800, 18000)
                logger.info(f"Sleeping for {self.interval_seconds} seconds")
                # Adjust this interval as needed
                time.sleep(self.interval_seconds)
                logger.info(f"Video ID: {self.video_id} Woke up after sleeping for {self.interval_seconds} seconds")
                self.total_time += self.interval_seconds
        return response

    def order_comments_wrapper(self, last_views, min_views):
        response = None
        logger.info(f"(order_comments_wrapper)last_views: {last_views}, min_views: {min_views}, calculator views: {self.ratio_calculator.views}")
        logger.info(f"(order_comments_wrapper)Desired comments: {self.desired_comments}, Ordered comments: {self.ordered_comments}, Calculator comments: {self.ratio_calculator.comments}")
        
        # Improved logic with better bounds checking
        if (
            self.ratio_calculator.views - last_views >= min_views
            and self.ratio_calculator.comments < self.desired_comments
        ):
            logger.info(
                f"Ordering comments for video ID: {self.video_id} with max desired comments: {self.desired_comments}"
            )
            
            # Calculate needed comments more conservatively
            comments_needed = max(
                self.desired_comments - self.ratio_calculator.comments - self.ordered_comments,
                0
            )
            
            # Limit the order size to prevent over-ordering
            max_order_size = min(
                comments_needed,
                10,  # Maximum 10 comments per order
                # (self.ratio_calculator.views - last_views) // 100  # Scale with view growth
            )
            
            logger.info(f"(order_comments_wrapper)max_order_size: {max_order_size}, comments_needed: {comments_needed}")
            
            if max_order_size >= 10:
                # Round to nearest 10
                order_size = int(max_order_size // 10) * 10
                
                logger.info(f"(order_comments_wrapper) Ordering {order_size} comments")
                self.order_comments(order_size)
                self.ordered_comments += order_size
                logger.info(f"(order_comments_wrapper)Ordered {order_size} comments for video ID: {self.video_id}")
        
        # 12-hour interval logic (unchanged)
        elif (
            self.ratio_calculator.comments < self.desired_comments
            and self.total_time > 43200
        ):
            logger.info(
                f"Video ID: {self.video_id} Ordering comments for 12 hour interval"
            )
            response = self.order_comments(is_twelve_hour=True)
            logger.info(
                f"Video ID: {self.video_id} Ordered comments: {response} for 12 hour interval"
            )
            self.total_time = 0
        else:
            logger.info("No conditions met for ordering comments.")

    def order_likes(self, last_views, min_views):
        logger.info(f"(order_likes)last_views: {last_views}, min_views: {min_views}, calculator views: {self.ratio_calculator.views}")
        logger.info(f"(order_likes)Desired likes: {self.desired_likes}, Ordered likes: {self.ordered_likes}, Calculator likes: {self.ratio_calculator.likes}")
        
        # Improved logic with better bounds checking
        if (
            self.ratio_calculator.views - last_views >= min_views
            and self.ratio_calculator.likes < self.desired_likes
        ):
            # Calculate needed likes more conservatively
            likes_needed = max(
                self.desired_likes - self.ratio_calculator.likes - self.ordered_likes,
                0
            )
            
            # Limit the order size to prevent over-ordering
            max_order_size = min(
                likes_needed,
                10,  # Maximum 10 likes per order
                # (self.ratio_calculator.views - last_views) // 10  # Scale with view growth
            )

            logger.info(f"(order_likes)max_order_size: {max_order_size}, likes_needed: {likes_needed}")

            if max_order_size >= 10:
                likes = int(max_order_size)
                
                logger.info(f"(order_likes) Ordering {likes} likes for {self.video_id}")
                response = self.api.order(
                    {
                        "service": self.data["Like Server ID"],
                        "link": f"https://www.youtube.com/watch?v={self.video_id}",
                        "quantity": likes,
                    }
                )
                self.ordered_likes += likes
                logger.info(f"Video ID: {self.video_id} Ordered likes: {response}")
        
        # 12-hour interval logic (unchanged)
        elif (
            self.ratio_calculator.likes < self.desired_likes and self.total_time > 43200
        ):
            logger.info(
                f"ELSE Likes Video ID: {self.video_id} Ordering likes for 12 hour interval"
            )
            likes = np.random.randint(35, 65)
            response = self.api.order(
                {
                    "service":  self.data["Like Server ID"],
                    "link": f"https://www.youtube.com/watch?v={self.video_id}",
                    "quantity": likes,
                }
            )
            self.ordered_likes += likes
            logger.info(f"Ordered likes: {response}")
            self.total_time = 0
        else:
            logger.info("No conditions met for ordering likes.")

    def run(self, desired_views):
        """Run the campaign with improved error handling and bounds checking"""
        logger.info("Running campaign for video ID(run): %s", self.video_id)
        min_views = self.minimum_engagement
        
        # Update the views, likes, and comments
        self.ratio_calculator.get_views_likes_cmnts()
        last_views = None
        
        while not self.stop_flag.is_set():
            # Check the status of the campaign
            if self.data["Status"] != "Running":
                logger.info(
                    "Campaign completed or stopped for video ID: %s", self.video_id
                )
                break
            if self.comments_db is None:
                logger.error("No comments found")
                self.stop()
                break
            # If we ran out of comments to add, break the loop
            if self.comments_db.empty:
                logger.error("No comments left to add")
                self.data["Status"] = "Completed"
                self.status = "Completed"
                self.stop()
                break
            
            # Update the views, likes, and comments
            self.ratio_calculator.get_views_likes_cmnts()
            
            try:
                self.desired_comments, self.desired_likes = (
                    self.ratio_calculator.desired_views_likes(
                        self.genre, desired_views=desired_views, tier_grid=self.sheet_tier
                    )
                )
            except Exception as e:
                logger.error(f"Error calculating desired metrics: {e}")
                # Use conservative fallback values
                total_views = self.ratio_calculator.views + desired_views
                self.desired_likes = total_views * 0.02
                self.desired_comments = total_views * 0.001
            
            logger.info(
                f"Current comments for {self.video_id}: {self.ratio_calculator.comments}, Desired comments: {self.desired_comments}"
            )
            logger.info(
                f"Current likes for {self.video_id}: {self.ratio_calculator.likes}, Desired likes: {self.desired_likes}"
            )
            
            if not last_views:
                last_views = self.ratio_calculator.views
            
            logger.info(
                f"Video ID: {self.video_id} Current views: {self.ratio_calculator.views}, Last views: {last_views}"
            )
            
            # Order comments and likes with improved logic
            self.order_comments_wrapper(last_views, min_views)
            self.order_likes(last_views, min_views)
            
            self.ratio_calculator.get_views_likes_cmnts()
            last_views = int(self.ratio_calculator.views)
            time.sleep(self.wait_time)
            self.total_time += self.wait_time
            logger.info(
                f"Video ID: {self.video_id} Sleeping for {self.wait_time} seconds"
            )

    def run_likes_only(self, desired_views):
        """Run the campaign to order likes only with improved bounds checking"""
        try:
            logger.info("Running campaign for video ID(run_likes_only): %s", self.video_id)
            min_views = self.minimum_engagement
            
            # Update the views, likes, and comments
            self.ratio_calculator.get_views_likes_cmnts()
            last_views = None
            
            while not self.stop_flag.is_set():
                # Update the views, likes, and comments
                self.ratio_calculator.get_views_likes_cmnts()
                
                try:
                    self.desired_comments, self.desired_likes = (
                        self.ratio_calculator.desired_views_likes(
                            self.genre, desired_views=desired_views, tier_grid=self.sheet_tier
                        )
                    )
                except Exception as e:
                    logger.error(f"Error calculating desired metrics: {e}")
                    # Use conservative fallback values
                    total_views = self.ratio_calculator.views + desired_views
                    self.desired_likes = total_views * 0.02
                    self.desired_comments = total_views * 0.001
                
                # Check the status of the campaign
                if self.data["Status"] != "Running":
                    logger.info(
                        "Campaign completed or stopped for video ID: %s", self.video_id
                    )
                    break

                if self.desired_likes <= self.ratio_calculator.likes:
                    logger.info(
                        f"Video ID: {self.video_id} has reached desired likes: {self.desired_likes}"
                    )
                    self.stop()
                    self.data["Status"] = "Completed"
                    break
                    
                logger.info(
                    f"Video ID: {self.video_id}: {self.ratio_calculator.likes}, Desired likes: {self.desired_likes} Likes Only"
                )
                
                if not last_views:
                    last_views = self.ratio_calculator.views
                
                logger.info(
                    f"Video ID: {self.video_id} Current views: {self.ratio_calculator.views}, Last views: {last_views} Likes Only"
                )
                
                self.order_likes(last_views, min_views)
                self.ratio_calculator.get_views_likes_cmnts()
                last_views = int(self.ratio_calculator.views)
                time.sleep(self.wait_time)
                logger.info(
                    f"Video ID: {self.video_id} Sleeping for {self.wait_time} seconds")
        except Exception as e:
            logger.error(f"Error running likes only campaign: {e}")
            raise e

    def stop(self):
        logger.info("Stopping campaign for video ID: %s", self.video_id)
        self.stop_flag.set()  # Set the stop flag to stop the thread
        self.data["Status"] = "Completed"


class ArtiseUtils:
    def read_comment_sheet(self,google_sheet_url):
        '''
            Reads the content in a provided google sheet 
            and returns the data in a pre-targeted cell
        '''
        try:
            match = re.search(r"/spreadsheets/d/([a-zA-Z0-9-_]+)", google_sheet_url)
            google_sheet_id = match.group(1) if match else ''
            cell_range = "Sheet1!A2:A"
            result = (
                    sheet_service.spreadsheets()
                    .values()
                    .get(spreadsheetId=google_sheet_id, range=cell_range)
                    .execute()
                )
            return result.get("values" , [])
        except Exception as e :
            logger.info(str(e))
            return None 
         
    def is_sheet_empty(self,google_sheet_url):
        try:
            content = self.read_comment_sheet(google_sheet_url) 
            if not content or all(len(row) == 0 for row in content):
                return True 
            return False 
        except Exception as e:
            logger.info(str(e))
            return False 


if __name__ == "__main__":
    API_KEY = os.getenv("YOUTUBE_API_KEY")
    VIDEO_ID = "AfSjnsYiY_A"

    # Test the improved calculator
    try:
        calculator = ImprovedYoutubeRatioCalc(API_KEY, VIDEO_ID)
        likes, comments, views = calculator.get_views_likes_cmnts()
    except Exception as e:
        logger.error(f"Error initializing calculator: {e}")
        raise e
    
    try:
        if likes is not None and comments is not None:
            comments_desired, likes_desired = calculator.desired_views_likes(
                "Hip Hop", views
            )
            campaign_data = {
                "Video ID": VIDEO_ID,
                "Genre": "Hip Hop",
                "Comments Sheet URL": "https://docs.google.com/spreadsheets/d/14cQjj5fm0v0GixnY0APFF6jM02V8ovOfqyPHubkpyBY",
                "Wait Time": 16,
                "Status": "Running",
            }
            campaign = Campaign(
                campaign_data,
                calculator,
                campaign_data["Comments Sheet URL"],
            )
            logger.info("Running campaign with desired views: %s", views)
            campaign.run(views)
        else:
            logger.error("Failed to retrieve video details")
    except Exception as e:
        logger.error(f"Error running campaign: {e}")
        raise e

