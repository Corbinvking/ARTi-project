-- Add element_data JSONB column to platform_development_reports
-- Stores metadata about a UI element captured via the Element Picker
-- (selector, tagName, classes, textContent, pageUrl, boundingRect, etc.)

ALTER TABLE platform_development_reports
ADD COLUMN IF NOT EXISTS element_data jsonb;
