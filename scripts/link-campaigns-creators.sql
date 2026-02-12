-- Clear existing linkages (fresh start)
DELETE FROM instagram_campaign_creators;

-- Insert campaign-creator linkages
-- Each campaign is linked to its client (imported as a creator)
INSERT INTO instagram_campaign_creators 
  (campaign_id, instagram_handle, rate, budget_allocation, posts_count, post_type, payment_status, post_status, approval_status, page_status, is_auto_selected, do_not_use, sort_order)
VALUES
  ('792', 'jackjones',      700,  700,  1, 'reel', 'unpaid', 'not_posted', 'pending', 'proposed', true, false, 1),
  ('793', 'tonal',          490,  490,  1, 'reel', 'unpaid', 'not_posted', 'pending', 'proposed', true, false, 2),
  ('794', 'eazley',         135,  135,  1, 'reel', 'unpaid', 'not_posted', 'pending', 'proposed', true, false, 3),
  ('795', 'neonpony',      3325, 3325,  1, 'reel', 'unpaid', 'not_posted', 'pending', 'proposed', true, false, 4),
  ('796', 'letsvibepteltd', 1500, 1500, 1, 'reel', 'unpaid', 'not_posted', 'pending', 'proposed', true, false, 5),
  ('797', 'devault',        680,  680,  1, 'reel', 'unpaid', 'not_posted', 'pending', 'proposed', true, false, 6);

-- Verify the results
SELECT icc.campaign_id, icc.instagram_handle, icc.rate, icc.budget_allocation, icc.payment_status, icc.post_status, icc.page_status
FROM instagram_campaign_creators icc
ORDER BY icc.sort_order;
