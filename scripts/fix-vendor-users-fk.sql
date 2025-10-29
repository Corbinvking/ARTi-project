-- Check vendor_users table structure and constraints
\d+ vendor_users

-- Check what foreign key constraints exist
SELECT
    tc.constraint_name, 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_name='vendor_users';

-- Try to manually insert a vendor_users record
-- Using vendor1's actual UUID from auth.users
INSERT INTO vendor_users (user_id, vendor_id)
VALUES (
    '0f9e68b7-ad07-4eca-991c-23ba224578e3',
    'b3479cce-fed8-40e4-b778-1a9958463576'
)
ON CONFLICT (user_id, vendor_id) DO NOTHING
RETURNING *;

-- Check if the insert worked
SELECT * FROM vendor_users;

