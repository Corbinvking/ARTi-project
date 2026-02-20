-- Create niches table for persistent niche management
CREATE TABLE IF NOT EXISTS niches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  org_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(name, org_id)
);

ALTER TABLE niches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "niches_org_access" ON niches
  FOR ALL USING (org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid()));

-- Seed with default niches (previously called genres)
INSERT INTO niches (name) VALUES
  ('EDM'), ('House'), ('Tech House'), ('Techno'), ('Dubstep'), ('Trance'),
  ('Progressive House'), ('Future Bass'), ('Trap'), ('DnB'), ('Afro'),
  ('Deep House'), ('Minimal'), ('Garage'), ('Breakbeat'), ('Hip Hop'),
  ('R&B'), ('Pop'), ('Rock'), ('Indie'), ('Alternative'), ('Country'),
  ('Jazz'), ('Classical'), ('Reggae'), ('Folk'), ('Metal'), ('Punk'),
  ('Funk'), ('Soul'), ('Blues'),
  ('Afrobeats'), ('Amapiano'), ('Afro House'), ('Afro Pop'), ('Afro Drill'),
  ('Reggaeton'), ('Bachata'), ('Salsa'), ('Regional Mexican'), ('Latin Pop'), ('Merengue'),
  ('Drill'), ('Old School'), ('UK Drill'), ('Latin Trap'),
  ('Mainstream Pop'), ('Indie Pop'), ('Electropop'), ('K-Pop'), ('Dance Pop'),
  ('Indie Rock'), ('Hard Rock'), ('Classic Rock'),
  ('Contemporary R&B'), ('Neo Soul'), ('Alternative R&B'),
  ('Modern Country'), ('Country Pop'), ('Americana'),
  ('Dancehall'), ('Reggae Fusion'), ('Roots Reggae'),
  ('Grunge'), ('Post-Rock'), ('Shoegaze'), ('Emo'),
  ('Electro House'), ('DnB')
ON CONFLICT (name, org_id) DO NOTHING;
