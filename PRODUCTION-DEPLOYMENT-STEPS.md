# Production Deployment - Vendor Portal

## PART 1: Push Changes to Git (Local Machine)

```powershell
# 1. Check what files changed
git status

# 2. Add all changes
git add .

# 3. Commit with descriptive message
git commit -m "feat: Add vendor portal with RLS fixes and associations

- Fix vendor_users RLS policies to allow vendors to view their own mapping
- Add scripts for vendor user creation and association
- Add sample vendor data import
- Add console logging to useMyPlaylists hook
- Create migration 999_fix_vendor_users_rls.sql
"

# 4. Push to GitHub (this will auto-deploy frontend to Vercel)
git push origin main
```

## PART 2: Apply Database Migrations (Production Server - SSH)

```bash
# 1. Navigate to project directory
cd /root/ARTi-project

# 2. Pull latest changes from Git
git pull origin main

# 3. Check if the new migration file exists
ls -la supabase/migrations/999_fix_vendor_users_rls.sql

# 4. Connect to production Supabase and apply migration
# Get your production database URL from .env or Supabase dashboard
# Format: postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres

# Apply the migration directly
psql "postgresql://postgres.rtdjjqbxhnjxmsjltblg:[YOUR_PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres" -f supabase/migrations/999_fix_vendor_users_rls.sql
```

## PART 3: Create Vendor Users & Associations (Production Server)

```bash
# 1. Make sure you're in the project root
cd /root/ARTi-project

# 2. Install/update dependencies if needed
npm install

# 3. Create vendor users (this will create vendor1, vendor2, vendor3)
node scripts/fix-vendor-passwords.js

# 4. Sync auth users to public.users table
node scripts/sync-auth-to-users.js

# 5. Create vendor associations (links users to vendors)
node scripts/create-vendor-associations.js

# 6. Check the associations were created
node scripts/check-vendor-data.js
```

## PART 4: Verify Frontend Deployment

```bash
# 1. Check Vercel deployment status
# Go to: https://vercel.com/your-account/your-project

# 2. Wait for deployment to complete (usually 2-3 minutes)

# 3. Test the production site
# Login at: https://your-production-url.com
# Email: vendor1@arti-demo.com
# Password: password123
```

## PART 5: Production Database Connection String

You'll need your Supabase production database URL. Get it from:
1. Go to Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Go to Settings → Database
4. Copy the "Connection string" under "Connection pooling"
5. Replace `[YOUR-PASSWORD]` with your database password

Example format:
```
postgresql://postgres.rtdjjqbxhnjxmsjltblg:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres
```

## Troubleshooting

If vendor login fails in production:
1. Check that RLS policy was applied: Run the migration again
2. Check vendor_users table has entries: Run check-vendor-data.js
3. Check browser console for errors
4. Verify .env variables are correct in production
