-- Add github_issue_url column to platform_development_reports
-- Links in-app bug reports to their corresponding GitHub issue

ALTER TABLE platform_development_reports
  ADD COLUMN IF NOT EXISTS github_issue_url text;

CREATE INDEX IF NOT EXISTS idx_platform_dev_reports_github_issue
  ON platform_development_reports(github_issue_url)
  WHERE github_issue_url IS NOT NULL;
