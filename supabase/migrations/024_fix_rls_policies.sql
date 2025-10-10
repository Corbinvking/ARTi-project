-- Fix RLS policies for content embeddings
-- The auth.jwt() returns JSON, not text, so we need to cast it properly

-- Drop the problematic policy
DROP POLICY IF EXISTS "Users can view content embeddings for accessible content" ON public.content_embeddings;

-- Create corrected RLS policy with proper type casting
CREATE POLICY "Users can view content embeddings for accessible content" ON public.content_embeddings
    FOR SELECT USING (
        content_type = 'campaign' AND EXISTS (
            SELECT 1 FROM public.stream_strategist_campaigns c WHERE c.id = content_id AND c.org_id::text = (auth.jwt() ->> 'org_id')
        )
    );

-- Also add policy for service role (already exists but let's make sure)
DROP POLICY IF EXISTS "Service role can manage all content embeddings" ON public.content_embeddings;
CREATE POLICY "Service role can manage all content embeddings" ON public.content_embeddings
    FOR ALL USING (auth.role() = 'service_role');
