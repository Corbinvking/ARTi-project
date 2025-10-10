-- Add vector embeddings support for AI-powered search
-- Since 'campaigns' is a view, we need to add embeddings to the underlying table

-- Add embedding column to the underlying stream_strategist_campaigns table
ALTER TABLE public.stream_strategist_campaigns ADD COLUMN IF NOT EXISTS embedding vector(1536);

-- Update the campaigns view to include the embedding column
DROP VIEW IF EXISTS public.campaigns CASCADE;

CREATE VIEW public.campaigns AS
SELECT * FROM public.stream_strategist_campaigns;

-- Create a dedicated embeddings table for more flexible content search
CREATE TABLE IF NOT EXISTS public.content_embeddings (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    content_type text NOT NULL CHECK (content_type IN ('campaign', 'playlist', 'vendor', 'client', 'submission')),
    content_id uuid NOT NULL,
    content text NOT NULL, -- The text content being embedded
    embedding vector(1536), -- OpenAI text-embedding-ada-002 uses 1536 dimensions
    metadata jsonb DEFAULT '{}', -- Additional context like title, description, etc.
    model text DEFAULT 'text-embedding-ada-002', -- AI model used for embedding
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT content_embeddings_pkey PRIMARY KEY (id),
    CONSTRAINT content_embeddings_content_id_fkey FOREIGN KEY (content_id) REFERENCES public.stream_strategist_campaigns(id) ON DELETE CASCADE
);

-- Create indexes for efficient vector similarity search
CREATE INDEX IF NOT EXISTS idx_content_embeddings_embedding ON public.content_embeddings USING ivfflat (embedding vector_cosine_ops)
WHERE embedding IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_content_embeddings_content_type ON public.content_embeddings(content_type);
CREATE INDEX IF NOT EXISTS idx_content_embeddings_content_id ON public.content_embeddings(content_id);

-- Create a function to search similar content using vector similarity
CREATE OR REPLACE FUNCTION search_similar_content(
    query_embedding vector(1536),
    content_type_filter text DEFAULT NULL,
    similarity_threshold float8 DEFAULT 0.7,
    max_results integer DEFAULT 10
)
RETURNS TABLE(
    id uuid,
    content_type text,
    content_id uuid,
    content text,
    similarity float8,
    metadata jsonb
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        ce.id,
        ce.content_type,
        ce.content_id,
        ce.content,
        (1 - (ce.embedding <=> query_embedding))::float8 as similarity,
        ce.metadata
    FROM public.content_embeddings ce
    WHERE (content_type_filter IS NULL OR ce.content_type = content_type_filter)
    AND ce.embedding IS NOT NULL
    AND (1 - (ce.embedding <=> query_embedding)) >= similarity_threshold
    ORDER BY ce.embedding <=> query_embedding
    LIMIT max_results;
END;
$$ LANGUAGE plpgsql;

-- Create a function to generate and store embeddings for content
CREATE OR REPLACE FUNCTION generate_and_store_embedding(
    p_content_type text,
    p_content_id uuid,
    p_content text,
    p_metadata jsonb DEFAULT '{}'
)
RETURNS uuid AS $$
DECLARE
    embedding_result uuid;
BEGIN
    -- Insert the content and metadata (embedding will be updated separately)
    INSERT INTO public.content_embeddings (content_type, content_id, content, metadata)
    VALUES (p_content_type, p_content_id, p_content, p_metadata)
    ON CONFLICT (content_type, content_id)
    DO UPDATE SET
        content = EXCLUDED.content,
        metadata = EXCLUDED.metadata,
        updated_at = now()
    RETURNING id INTO embedding_result;

    RETURN embedding_result;
END;
$$ LANGUAGE plpgsql;

-- Create a function to update embedding for existing content
CREATE OR REPLACE FUNCTION update_embedding(
    embedding_id uuid,
    new_embedding vector(1536)
)
RETURNS void AS $$
BEGIN
    UPDATE public.content_embeddings
    SET embedding = new_embedding, updated_at = now()
    WHERE id = embedding_id;
END;
$$ LANGUAGE plpgsql;

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON public.content_embeddings TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION search_similar_content(vector, text, float8, integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION generate_and_store_embedding(text, uuid, text, jsonb) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION update_embedding(uuid, vector) TO authenticated, service_role;

-- Enable RLS on content_embeddings
ALTER TABLE public.content_embeddings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (users can only access embeddings for content they have access to)
CREATE POLICY "Users can view content embeddings for accessible content" ON public.content_embeddings
    FOR SELECT USING (
        content_type = 'campaign' AND EXISTS (
            SELECT 1 FROM public.stream_strategist_campaigns c WHERE c.id = content_id AND c.org_id = auth.jwt() ->> 'org_id'
        )
    );

CREATE POLICY "Service role can manage all content embeddings" ON public.content_embeddings
    FOR ALL USING (auth.role() = 'service_role');
