-- Create test organizations
INSERT INTO orgs (id, name, slug, settings) VALUES 
('00000000-0000-0000-0000-000000000001', 'Acme Music Label', 'acme-music', '{"timezone": "UTC", "currency": "USD"}'),
('00000000-0000-0000-0000-000000000002', 'Indie Records', 'indie-records', '{"timezone": "PST", "currency": "USD"}');

-- Create test users
INSERT INTO users (id, email, full_name) VALUES 
('11111111-1111-1111-1111-111111111111', 'admin@acme.com', 'John Admin'),
('22222222-2222-2222-2222-222222222222', 'manager@acme.com', 'Jane Manager'),
('33333333-3333-3333-3333-333333333333', 'analyst@acme.com', 'Bob Analyst'),
('44444444-4444-4444-4444-444444444444', 'creator@acme.com', 'Alice Creator'),
('55555555-5555-5555-5555-555555555555', 'admin@indie.com', 'Mike Admin');

-- Create memberships
INSERT INTO memberships (user_id, org_id, role) VALUES 
('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000001', 'admin'),
('22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000001', 'manager'),
('33333333-3333-3333-3333-333333333333', '00000000-0000-0000-0000-000000000001', 'analyst'),
('44444444-4444-4444-4444-444444444444', '00000000-0000-0000-0000-000000000001', 'creator'),
('55555555-5555-5555-5555-555555555555', '00000000-0000-0000-0000-000000000002', 'admin');

-- Create sample assets
INSERT INTO assets (id, org_id, platform, external_id, type, title, url, meta) VALUES 
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '00000000-0000-0000-0000-000000000001', 'spotify', '4iV5W9uYEdYUVa79Axb7Rh', 'track', 'Watermelon Sugar', 'https://open.spotify.com/track/4iV5W9uYEdYUVa79Axb7Rh', '{"artist": "Harry Styles", "album": "Fine Line"}'),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '00000000-0000-0000-0000-000000000001', 'spotify', '6KuQTIu1KoTTkLXKrwlLPV', 'artist', 'Harry Styles', 'https://open.spotify.com/artist/6KuQTIu1KoTTkLXKrwlLPV', '{"followers": 47000000, "genres": ["pop"]}');

-- Create sample metrics
INSERT INTO metrics (org_id, asset_id, platform, kpi, value, source, ts) VALUES 
('00000000-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'spotify', 'track.popularity', 85, 'api', NOW() - INTERVAL '1 day'),
('00000000-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'spotify', 'track.streams.daily', 125000, 'charts', NOW() - INTERVAL '1 day'),
('00000000-0000-0000-0000-000000000001', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'spotify', 'artist.followers', 47123456, 'api', NOW() - INTERVAL '1 day'),
('00000000-0000-0000-0000-000000000001', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'spotify', 'artist.monthly_listeners', 78900000, 'api', NOW() - INTERVAL '1 day');

-- Create sample documents for RAG
INSERT INTO documents (id, org_id, source, title, content, meta) VALUES 
('dddddddd-dddd-dddd-dddd-dddddddddddd', '00000000-0000-0000-0000-000000000001', 'manual', 'Acme Music Strategy 2024', 
'Our music label focuses on discovering and promoting emerging artists in the pop and indie genres. We prioritize digital-first marketing strategies, leveraging social media platforms and streaming services to build audience engagement. Key performance indicators include monthly listeners, follower growth, and playlist placements.', 
'{"type": "strategy", "year": 2024}'),
('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '00000000-0000-0000-0000-000000000001', 'manual', 'Artist Development Guidelines', 
'Artist development involves multiple phases: discovery, signing, recording, promotion, and tour support. We track artist progress through streaming metrics, social media engagement, and concert attendance. Success metrics include reaching 1M monthly listeners within 12 months and achieving playlist placements on major platforms.', 
'{"type": "guidelines", "department": "A&R"}');

-- Create sample chunks
INSERT INTO chunks (id, document_id, idx, content) VALUES 
('cccccccc-cccc-cccc-cccc-cccccccccccc', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 1, 'Our music label focuses on discovering and promoting emerging artists in the pop and indie genres.'),
('ffffffff-ffff-ffff-ffff-ffffffffffff', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 2, 'We prioritize digital-first marketing strategies, leveraging social media platforms and streaming services to build audience engagement.'),
('77777777-7777-7777-7777-777777777777', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 1, 'Artist development involves multiple phases: discovery, signing, recording, promotion, and tour support.');

-- Create a sample insight
INSERT INTO insights (id, org_id, period, ts, topic, summary, details_json, source_refs) VALUES 
('88888888-8888-8888-8888-888888888888', '00000000-0000-0000-0000-000000000001', 'daily', NOW() - INTERVAL '1 day', 
'Spotify Performance', 
'Harry Styles tracks showing strong performance with Watermelon Sugar maintaining 85 popularity score and 125K daily streams. Artist followers grew by 0.5% in the last 24 hours.',
'{"metrics_analyzed": 4, "trend": "positive", "recommendations": ["Continue playlist push", "Increase social media activity"]}',
'["aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"]');

-- Create sample staging data for Airtable
INSERT INTO staging_airtable_contacts (external_id, payload, org_id) VALUES 
('recABCDEF123', '{"Name": "John Smith", "Email": "john@example.com", "Company": "Test Corp", "Status": "Lead"}', '00000000-0000-0000-0000-000000000001'),
('recXYZ789', '{"Name": "Sarah Jones", "Email": "sarah@example.com", "Company": "Music Co", "Status": "Client"}', '00000000-0000-0000-0000-000000000001');

INSERT INTO staging_airtable_campaigns (external_id, payload, org_id) VALUES 
('recCAMP001', '{"Name": "Summer 2024 Release", "Status": "Active", "Budget": 50000, "Start Date": "2024-06-01"}', '00000000-0000-0000-0000-000000000001'),
('recCAMP002', '{"Name": "Artist Spotlight", "Status": "Planning", "Budget": 25000, "Start Date": "2024-08-15"}', '00000000-0000-0000-0000-000000000001');
