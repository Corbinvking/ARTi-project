-- Platform Development Reports table
-- Used by operators to report bugs and request features
-- Admins can manage and mark reports as complete

CREATE TABLE IF NOT EXISTS platform_development_reports (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  type text NOT NULL CHECK (type IN ('bug', 'feature_request')),
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'complete')),
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  submitted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  submitted_by_name text NOT NULL DEFAULT 'Unknown',
  completed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Index for common queries
CREATE INDEX idx_platform_dev_reports_status ON platform_development_reports(status);
CREATE INDEX idx_platform_dev_reports_type ON platform_development_reports(type);
CREATE INDEX idx_platform_dev_reports_submitted_by ON platform_development_reports(submitted_by);
CREATE INDEX idx_platform_dev_reports_created_at ON platform_development_reports(created_at DESC);

-- Enable RLS
ALTER TABLE platform_development_reports ENABLE ROW LEVEL SECURITY;

-- Policy: authenticated users can read all reports
CREATE POLICY "Authenticated users can view all reports"
  ON platform_development_reports
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: authenticated users can insert reports
CREATE POLICY "Authenticated users can create reports"
  ON platform_development_reports
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = submitted_by);

-- Policy: admins can update any report (to mark complete, change status)
CREATE POLICY "Admins can update reports"
  ON platform_development_reports
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND (
        auth.users.raw_user_meta_data->>'role' = 'admin'
        OR auth.uid() = submitted_by
      )
    )
  );

-- Auto-update updated_at on changes
CREATE OR REPLACE FUNCTION update_platform_dev_reports_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_platform_dev_reports_updated_at
  BEFORE UPDATE ON platform_development_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_platform_dev_reports_updated_at();
