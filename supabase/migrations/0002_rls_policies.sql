-- Enable Row Level Security on all tables
ALTER TABLE orgs ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE connected_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE staging_airtable_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE staging_airtable_campaigns ENABLE ROW LEVEL SECURITY;

-- Helper function to get org_id from JWT
CREATE OR REPLACE FUNCTION get_user_org_id()
RETURNS UUID AS $$
BEGIN
    RETURN (auth.jwt() ->> 'org_id')::UUID;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to get user role from JWT
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
BEGIN
    RETURN auth.jwt() ->> 'role';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Orgs policies
CREATE POLICY "Users can read own org" ON orgs
    FOR SELECT USING (id = get_user_org_id());

CREATE POLICY "Admins can update own org" ON orgs
    FOR UPDATE USING (
        id = get_user_org_id() 
        AND get_user_role() = 'admin'
    );

-- Users policies
CREATE POLICY "Users can read their own record" ON users
    FOR SELECT USING (id = auth.uid());

CREATE POLICY "Users can update their own record" ON users
    FOR UPDATE USING (id = auth.uid());

-- Memberships policies  
CREATE POLICY "Users can read org memberships" ON memberships
    FOR SELECT USING (org_id = get_user_org_id());

CREATE POLICY "Admins can manage memberships" ON memberships
    FOR ALL USING (
        org_id = get_user_org_id() 
        AND get_user_role() = 'admin'
    );

CREATE POLICY "Users can read own membership" ON memberships
    FOR SELECT USING (
        user_id = auth.uid() 
        OR org_id = get_user_org_id()
    );

-- Connected accounts policies
CREATE POLICY "Org members can read connected accounts" ON connected_accounts
    FOR SELECT USING (org_id = get_user_org_id());

CREATE POLICY "Managers and admins can manage connected accounts" ON connected_accounts
    FOR ALL USING (
        org_id = get_user_org_id() 
        AND get_user_role() IN ('admin', 'manager')
    );

-- Assets policies
CREATE POLICY "Org members can read assets" ON assets
    FOR SELECT USING (org_id = get_user_org_id());

CREATE POLICY "Managers and admins can manage assets" ON assets
    FOR ALL USING (
        org_id = get_user_org_id() 
        AND get_user_role() IN ('admin', 'manager')
    );

-- Metrics policies
CREATE POLICY "Org members can read metrics" ON metrics
    FOR SELECT USING (org_id = get_user_org_id());

CREATE POLICY "System can write metrics" ON metrics
    FOR INSERT WITH CHECK (org_id = get_user_org_id());

CREATE POLICY "Managers and admins can manage metrics" ON metrics
    FOR ALL USING (
        org_id = get_user_org_id() 
        AND get_user_role() IN ('admin', 'manager')
    );

-- Documents policies  
CREATE POLICY "Org members can read documents" ON documents
    FOR SELECT USING (org_id = get_user_org_id());

CREATE POLICY "Admins can manage documents" ON documents
    FOR ALL USING (
        org_id = get_user_org_id() 
        AND get_user_role() = 'admin'
    );

-- Chunks policies
CREATE POLICY "Org members can read chunks" ON chunks
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM documents d 
            WHERE d.id = chunks.document_id 
            AND d.org_id = get_user_org_id()
        )
    );

CREATE POLICY "System can manage chunks" ON chunks
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM documents d 
            WHERE d.id = chunks.document_id 
            AND d.org_id = get_user_org_id()
        )
    );

-- Embeddings policies
CREATE POLICY "Org members can read embeddings" ON embeddings
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM chunks c
            JOIN documents d ON d.id = c.document_id
            WHERE c.id = embeddings.chunk_id 
            AND d.org_id = get_user_org_id()
        )
    );

CREATE POLICY "System can manage embeddings" ON embeddings
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM chunks c
            JOIN documents d ON d.id = c.document_id
            WHERE c.id = embeddings.chunk_id 
            AND d.org_id = get_user_org_id()
        )
    );

-- Insights policies
CREATE POLICY "Org members can read insights" ON insights
    FOR SELECT USING (org_id = get_user_org_id());

CREATE POLICY "System can create insights" ON insights
    FOR INSERT WITH CHECK (org_id = get_user_org_id());

CREATE POLICY "Admins can manage insights" ON insights
    FOR ALL USING (
        org_id = get_user_org_id() 
        AND get_user_role() = 'admin'
    );

-- Jobs policies
CREATE POLICY "Org members can read jobs" ON jobs
    FOR SELECT USING (org_id = get_user_org_id());

CREATE POLICY "Managers and admins can create jobs" ON jobs
    FOR INSERT WITH CHECK (
        org_id = get_user_org_id() 
        AND get_user_role() IN ('admin', 'manager')
    );

CREATE POLICY "System can manage jobs" ON jobs
    FOR ALL USING (org_id = get_user_org_id());

-- Webhook events policies
CREATE POLICY "Admins can read webhook events" ON webhook_events
    FOR SELECT USING (
        org_id = get_user_org_id() 
        AND get_user_role() = 'admin'
    );

CREATE POLICY "System can create webhook events" ON webhook_events
    FOR INSERT WITH CHECK (org_id = get_user_org_id());

-- Staging table policies
CREATE POLICY "Admins can read staging data" ON staging_airtable_contacts
    FOR SELECT USING (
        org_id = get_user_org_id() 
        AND get_user_role() = 'admin'
    );

CREATE POLICY "System can manage staging data" ON staging_airtable_contacts
    FOR ALL USING (org_id = get_user_org_id());

CREATE POLICY "Admins can read staging campaigns" ON staging_airtable_campaigns
    FOR SELECT USING (
        org_id = get_user_org_id() 
        AND get_user_role() = 'admin'
    );

CREATE POLICY "System can manage staging campaigns" ON staging_airtable_campaigns
    FOR ALL USING (org_id = get_user_org_id());
