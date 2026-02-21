-- One-off: set correct metrics for the DSC58rvDUIy reel (27 likes, 1.7k views)
-- Run against production DB if the Apify scraper doesn't return view_count for this reel.
UPDATE campaign_posts
SET tracked_views = 1700,
    tracked_likes = 27,
    tracked_comments = 0,
    updated_at = now()
WHERE post_url ILIKE '%DSC58rvDUIy%';
