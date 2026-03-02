-- Enable RLS on user_permissions table
ALTER TABLE user_permissions ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists, then recreate
DROP POLICY IF EXISTS "Users can read their own permissions" ON user_permissions;

-- Create policy to allow users to read their own permissions
CREATE POLICY "Users can read their own permissions" 
ON user_permissions 
FOR SELECT 
USING (auth.uid() = user_id);

-- Grant necessary permissions to authenticated users
GRANT SELECT ON user_permissions TO authenticated;
