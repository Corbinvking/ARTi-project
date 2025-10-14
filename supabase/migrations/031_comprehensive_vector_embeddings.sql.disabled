-- Comprehensive vector embeddings for AI-powered analytics
-- This enables RAG-based question answering across all data entities

-- Ensure pgvector extension is enabled (should already be from migration 021)
CREATE EXTENSION IF NOT EXISTS vector;

-- Drop old content_embeddings if it exists (we'll recreate with better structure)
DROP TABLE IF EXISTS public.content_embeddings CASCADE;

-- Create unified embeddings table for all entity types
CREATE TABLE IF NOT EXISTS public.entity_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES orgs(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
  
  -- Entity identification
  entity_type TEXT NOT NULL, -- 'campaign_group', 'vendor', 'client', 'playlist', 'song'
  entity_id TEXT NOT NULL,   -- UUID or ID of the entity
  
  -- Searchable content
  content TEXT NOT NULL,     -- The text that was embedded
  metadata JSONB DEFAULT '{}', -- Additional searchable metadata
  
  -- Vector embedding
  embedding vector(1536),    -- OpenAI ada-002 creates 1536-dim vectors
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Unique constraint to prevent duplicates
  UNIQUE(entity_type, entity_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_entity_embeddings_entity_type ON public.entity_embeddings(entity_type);
CREATE INDEX IF NOT EXISTS idx_entity_embeddings_org_id ON public.entity_embeddings(org_id);

-- Create vector similarity search index (IVFFlat for fast approximate search)
CREATE INDEX IF NOT EXISTS idx_entity_embeddings_vector 
  ON public.entity_embeddings 
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- Enable RLS
ALTER TABLE public.entity_embeddings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Enable read access for all users" ON public.entity_embeddings
  FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users only" ON public.entity_embeddings
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for authenticated users only" ON public.entity_embeddings
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Enable delete for authenticated users only" ON public.entity_embeddings
  FOR DELETE USING (auth.role() = 'authenticated');

-- Create function for semantic search across all entities
CREATE OR REPLACE FUNCTION public.search_entities_semantic(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 10,
  filter_entity_type text DEFAULT NULL
)
RETURNS TABLE (
  entity_type text,
  entity_id text,
  content text,
  metadata jsonb,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ee.entity_type,
    ee.entity_id,
    ee.content,
    ee.metadata,
    1 - (ee.embedding <=> query_embedding) as similarity
  FROM public.entity_embeddings ee
  WHERE 
    (filter_entity_type IS NULL OR ee.entity_type = filter_entity_type)
    AND (1 - (ee.embedding <=> query_embedding)) > match_threshold
  ORDER BY ee.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Create function for hybrid search (combining vector + keyword)
CREATE OR REPLACE FUNCTION public.search_entities_hybrid(
  query_embedding vector(1536),
  query_text text,
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 20
)
RETURNS TABLE (
  entity_type text,
  entity_id text,
  content text,
  metadata jsonb,
  similarity float,
  keyword_rank float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH vector_search AS (
    SELECT
      ee.entity_type,
      ee.entity_id,
      ee.content,
      ee.metadata,
      1 - (ee.embedding <=> query_embedding) as similarity
    FROM public.entity_embeddings ee
    WHERE (1 - (ee.embedding <=> query_embedding)) > match_threshold
    ORDER BY ee.embedding <=> query_embedding
    LIMIT match_count
  ),
  keyword_search AS (
    SELECT
      ee.entity_type,
      ee.entity_id,
      ee.content,
      ee.metadata,
      ts_rank(to_tsvector('english', ee.content), plainto_tsquery('english', query_text)) as rank
    FROM public.entity_embeddings ee
    WHERE to_tsvector('english', ee.content) @@ plainto_tsquery('english', query_text)
    ORDER BY rank DESC
    LIMIT match_count
  )
  SELECT DISTINCT
    COALESCE(vs.entity_type, ks.entity_type) as entity_type,
    COALESCE(vs.entity_id, ks.entity_id) as entity_id,
    COALESCE(vs.content, ks.content) as content,
    COALESCE(vs.metadata, ks.metadata) as metadata,
    COALESCE(vs.similarity, 0.0) as similarity,
    COALESCE(ks.rank, 0.0) as keyword_rank
  FROM vector_search vs
  FULL OUTER JOIN keyword_search ks 
    ON vs.entity_id = ks.entity_id AND vs.entity_type = ks.entity_type
  ORDER BY (COALESCE(vs.similarity, 0) * 0.7 + COALESCE(ks.rank, 0) * 0.3) DESC
  LIMIT match_count;
END;
$$;

-- Create aggregation view for analytics queries
CREATE OR REPLACE VIEW public.campaign_analytics AS
SELECT
  cg.id as campaign_id,
  cg.name as campaign_name,
  cg.artist_name,
  c.name as client_name,
  cg.status,
  cg.total_goal,
  cg.total_budget,
  cg.start_date,
  cg.salesperson,
  -- Calculated metrics from songs
  (SELECT COUNT(*) FROM spotify_campaigns WHERE campaign_group_id = cg.id) as song_count,
  (SELECT COUNT(DISTINCT vendor_id) FROM spotify_campaigns WHERE campaign_group_id = cg.id AND vendor_id IS NOT NULL) as vendor_count,
  (SELECT SUM(CAST(remaining AS INTEGER)) FROM spotify_campaigns WHERE campaign_group_id = cg.id) as total_remaining,
  (SELECT SUM(CAST(daily AS INTEGER)) FROM spotify_campaigns WHERE campaign_group_id = cg.id) as total_daily,
  (SELECT SUM(CAST(weekly AS INTEGER)) FROM spotify_campaigns WHERE campaign_group_id = cg.id) as total_weekly,
  (SELECT ARRAY_AGG(DISTINCT v.name) FROM spotify_campaigns sc JOIN vendors v ON sc.vendor_id = v.id WHERE sc.campaign_group_id = cg.id) as vendors,
  -- Progress
  CASE 
    WHEN cg.total_goal > 0 THEN 
      ROUND(((cg.total_goal - (SELECT COALESCE(SUM(CAST(remaining AS INTEGER)), 0) FROM spotify_campaigns WHERE campaign_group_id = cg.id)) * 100.0 / cg.total_goal)::numeric, 2)
    ELSE 0
  END as progress_percentage
FROM campaign_groups cg
LEFT JOIN clients c ON cg.client_id = c.id;

-- Grant access
GRANT SELECT ON public.campaign_analytics TO authenticated;
GRANT SELECT ON public.campaign_analytics TO anon;

-- Add comments
COMMENT ON TABLE public.entity_embeddings IS 'Unified vector embeddings for all entity types - enables semantic search and RAG';
COMMENT ON COLUMN public.entity_embeddings.entity_type IS 'Type of entity: campaign_group, vendor, client, playlist, or song';
COMMENT ON COLUMN public.entity_embeddings.embedding IS '1536-dimensional vector embedding from OpenAI ada-002';
COMMENT ON VIEW public.campaign_analytics IS 'Aggregated campaign metrics for analytics and reporting';

