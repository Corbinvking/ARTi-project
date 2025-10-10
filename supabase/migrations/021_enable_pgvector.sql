-- Enable pgvector extension for vector similarity search
-- This allows us to store and query vector embeddings for AI-powered search

-- Enable the pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create a function to calculate cosine similarity between vectors
-- This will be used for semantic search functionality
CREATE OR REPLACE FUNCTION cosine_similarity(a vector, b vector)
RETURNS float8 AS $$
BEGIN
    RETURN 1 - (a <=> b);
END;
$$ LANGUAGE plpgsql;

-- Create a function to calculate euclidean distance between vectors
CREATE OR REPLACE FUNCTION euclidean_distance(a vector, b vector)
RETURNS float8 AS $$
BEGIN
    RETURN a <-> b;
END;
$$ LANGUAGE plpgsql;

-- Create an index type for efficient vector similarity search
-- This will significantly speed up similarity searches
CREATE INDEX IF NOT EXISTS idx_vector_search ON public.campaigns USING ivfflat (embedding vector_cosine_ops)
WHERE embedding IS NOT NULL;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION cosine_similarity(vector, vector) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION euclidean_distance(vector, vector) TO anon, authenticated, service_role;
