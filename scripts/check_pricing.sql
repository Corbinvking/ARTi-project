-- Check if youtube_pricing_tiers table exists and show all pricing
SELECT service_type, tier_min_views, tier_max_views, cost_per_1k_views, notes
FROM youtube_pricing_tiers
ORDER BY service_type, tier_min_views;

