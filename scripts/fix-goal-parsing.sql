-- Fix campaign_groups.total_goal by properly parsing K/M suffixes from spotify_campaigns.goal
-- The previous import incorrectly converted "10K" to 10 instead of 10000

-- First, let's see the current state
SELECT 
  cg.name,
  cg.total_goal as current_total_goal,
  sc.goal as raw_goal_string
FROM campaign_groups cg
JOIN spotify_campaigns sc ON sc.campaign_group_id = cg.id
LIMIT 10;

-- Now update campaign_groups.total_goal with properly parsed values
WITH parsed_goals AS (
  SELECT 
    campaign_group_id,
    SUM(
      CASE 
        WHEN goal ~ '^[0-9.]+[Kk]$' THEN 
          (REGEXP_REPLACE(goal, '[Kk]$', '')::NUMERIC * 1000)::INTEGER
        WHEN goal ~ '^[0-9.]+[Mm]$' THEN 
          (REGEXP_REPLACE(goal, '[Mm]$', '')::NUMERIC * 1000000)::INTEGER
        ELSE 
          COALESCE(NULLIF(REGEXP_REPLACE(goal, '[^0-9.]', '', 'g'), '')::INTEGER, 0)
      END
    ) as total_parsed_goal
  FROM spotify_campaigns 
  WHERE campaign_group_id IS NOT NULL
  GROUP BY campaign_group_id
)
UPDATE campaign_groups 
SET total_goal = parsed_goals.total_parsed_goal
FROM parsed_goals
WHERE campaign_groups.id = parsed_goals.campaign_group_id;

-- Verify the fix
SELECT 
  cg.name,
  cg.total_goal as fixed_total_goal,
  sc.goal as raw_goal_string
FROM campaign_groups cg
JOIN spotify_campaigns sc ON sc.campaign_group_id = cg.id
LIMIT 10;

-- Show summary
SELECT 
  COUNT(*) as total_campaign_groups,
  SUM(total_goal) as total_goals_sum,
  AVG(total_goal)::INTEGER as avg_goal
FROM campaign_groups;

