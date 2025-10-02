-- New RBAC System Migration
-- Creates user permissions table and updates existing users

-- Create user_permissions table for granular platform access
CREATE TABLE IF NOT EXISTS public.user_permissions (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id uuid NOT NULL,
    platform TEXT NOT NULL CHECK (platform IN ('dashboard', 'instagram', 'spotify', 'soundcloud', 'youtube')),
    can_read BOOLEAN DEFAULT true,
    can_write BOOLEAN DEFAULT false,
    can_delete BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure one permission record per user per platform
    UNIQUE(user_id, platform),
    
    -- Foreign key constraint (references auth.users which is in auth schema)
    CONSTRAINT fk_user_permissions_user_id 
        FOREIGN KEY (user_id) 
        REFERENCES auth.users(id) 
        ON DELETE CASCADE
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_permissions_user_id ON public.user_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_permissions_platform ON public.user_permissions(platform);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_permissions_updated_at 
    BEFORE UPDATE ON public.user_permissions 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Create user_roles enum type for consistency
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('admin', 'manager', 'sales', 'vendor');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create view for easy user permission queries
CREATE OR REPLACE VIEW public.user_permissions_view AS
SELECT 
    u.id as user_id,
    u.email,
    u.raw_user_meta_data->>'full_name' as full_name,
    u.raw_user_meta_data->>'role' as role,
    COALESCE(
        json_agg(
            json_build_object(
                'platform', p.platform,
                'can_read', p.can_read,
                'can_write', p.can_write,
                'can_delete', p.can_delete
            )
        ) FILTER (WHERE p.platform IS NOT NULL),
        '[]'::json
    ) as permissions
FROM auth.users u
LEFT JOIN public.user_permissions p ON u.id = p.user_id
GROUP BY u.id, u.email, u.raw_user_meta_data;

-- Insert default permissions for existing users
-- Admin users get full access to all platforms
INSERT INTO public.user_permissions (user_id, platform, can_read, can_write, can_delete)
SELECT 
    u.id,
    p.platform,
    true as can_read,
    true as can_write,
    CASE WHEN u.raw_user_meta_data->>'role' = 'admin' THEN true ELSE false END as can_delete
FROM auth.users u
CROSS JOIN (
    VALUES 
        ('dashboard'),
        ('instagram'), 
        ('spotify'),
        ('soundcloud'),
        ('youtube')
) p(platform)
WHERE u.raw_user_meta_data->>'role' IN ('admin', 'manager')
ON CONFLICT (user_id, platform) DO NOTHING;

-- Sales users get read/write access to specific platforms
INSERT INTO public.user_permissions (user_id, platform, can_read, can_write, can_delete)
SELECT 
    u.id,
    p.platform,
    true as can_read,
    true as can_write,
    false as can_delete
FROM auth.users u
CROSS JOIN (
    VALUES 
        ('dashboard'),
        ('instagram'),
        ('spotify')
) p(platform)
WHERE u.raw_user_meta_data->>'role' = 'sales'
ON CONFLICT (user_id, platform) DO NOTHING;

-- Vendor users get read access to assigned platforms
INSERT INTO public.user_permissions (user_id, platform, can_read, can_write, can_delete)
SELECT 
    u.id,
    p.platform,
    true as can_read,
    false as can_write,
    false as can_delete
FROM auth.users u
CROSS JOIN (
    VALUES 
        ('dashboard'),
        ('spotify'),
        ('soundcloud')
) p(platform)
WHERE u.raw_user_meta_data->>'role' = 'vendor'
ON CONFLICT (user_id, platform) DO NOTHING;

-- Creator users get basic access (legacy role, treat as vendor)
INSERT INTO public.user_permissions (user_id, platform, can_read, can_write, can_delete)
SELECT 
    u.id,
    p.platform,
    true as can_read,
    false as can_write,
    false as can_delete
FROM auth.users u
CROSS JOIN (
    VALUES 
        ('dashboard'),
        ('spotify')
) p(platform)
WHERE u.raw_user_meta_data->>'role' = 'creator'
ON CONFLICT (user_id, platform) DO NOTHING;

-- Create function to get user permissions
CREATE OR REPLACE FUNCTION get_user_permissions(user_uuid uuid)
RETURNS TABLE(platform text, can_read boolean, can_write boolean, can_delete boolean) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.platform,
        p.can_read,
        p.can_write,
        p.can_delete
    FROM public.user_permissions p
    WHERE p.user_id = user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to check if user has permission
CREATE OR REPLACE FUNCTION user_has_permission(
    user_uuid uuid, 
    platform_name text, 
    permission_type text DEFAULT 'read'
)
RETURNS boolean AS $$
DECLARE
    has_permission boolean := false;
BEGIN
    SELECT 
        CASE 
            WHEN permission_type = 'read' THEN p.can_read
            WHEN permission_type = 'write' THEN p.can_write
            WHEN permission_type = 'delete' THEN p.can_delete
            ELSE false
        END INTO has_permission
    FROM public.user_permissions p
    WHERE p.user_id = user_uuid AND p.platform = platform_name;
    
    RETURN COALESCE(has_permission, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable RLS on user_permissions table
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can see their own permissions
CREATE POLICY "Users can view own permissions" ON public.user_permissions
    FOR SELECT USING (auth.uid() = user_id);

-- Admins can see all permissions
CREATE POLICY "Admins can view all permissions" ON public.user_permissions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE id = auth.uid() 
            AND raw_user_meta_data->>'role' = 'admin'
        )
    );

-- Admins can insert permissions
CREATE POLICY "Admins can insert permissions" ON public.user_permissions
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE id = auth.uid() 
            AND raw_user_meta_data->>'role' = 'admin'
        )
    );

-- Admins can update permissions
CREATE POLICY "Admins can update permissions" ON public.user_permissions
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE id = auth.uid() 
            AND raw_user_meta_data->>'role' = 'admin'
        )
    );

-- Admins can delete permissions
CREATE POLICY "Admins can delete permissions" ON public.user_permissions
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE id = auth.uid() 
            AND raw_user_meta_data->>'role' = 'admin'
        )
    );

COMMENT ON TABLE public.user_permissions IS 'Granular permissions for users on different platforms';
COMMENT ON COLUMN public.user_permissions.platform IS 'Platform name: dashboard, instagram, spotify, soundcloud, youtube';
COMMENT ON COLUMN public.user_permissions.can_read IS 'Can view platform data';
COMMENT ON COLUMN public.user_permissions.can_write IS 'Can create/modify platform data'; 
COMMENT ON COLUMN public.user_permissions.can_delete IS 'Can delete platform data';
