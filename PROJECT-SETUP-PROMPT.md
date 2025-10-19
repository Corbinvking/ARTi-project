# ARTi Platform Project Setup - Complete Agent Prompt

## Project Overview

You are setting up the **ARTi Marketing Operations Platform** - a comprehensive music industry platform that manages campaigns across multiple streaming platforms (Spotify, YouTube, SoundCloud, Instagram) with integrated AI-powered analytics and a stream strategist application.

## Architecture Overview

### Core Components
- **Frontend**: Next.js application (`apps/frontend/`) - User interface and dashboards
- **Backend API**: Node.js/Express API (`apps/api/`) - Business logic and external integrations
- **Main Database**: Supabase instance (`supabase/`) - Core platform data (clients, campaigns, users)
- **Stream-Strategist Database**: Separate Supabase instance (`stream-strategist/supabase/`) - Playlist vendor management
- **Spotify Scraper**: Python-based Spotify data collection (`spotify_scraper/`)

### Database Architecture
- **Client-Centric Design**: `clients` table as primary entity, campaigns linked via `client_id`
- **Multi-Platform Support**: Separate tables for Spotify, YouTube, SoundCloud, Instagram campaigns
- **RBAC System**: Role-based access control with `user_permissions` and `memberships`
- **AI Integration**: Vector embeddings and ML processing capabilities

## Prerequisites & Environment Setup

### System Requirements
- **Operating System**: Windows 10/11, macOS, or Linux
- **Docker & Docker Compose**: For Supabase and other containerized services
- **Node.js**: Version 18+ with npm
- **Git**: For repository management
- **PostgreSQL Client Tools**: For database operations

### Repository Setup
```bash
# Clone the repository
git clone <repository-url>
cd ARTi-project

# Verify project structure
ls -la
# Expected: apps/, supabase/, stream-strategist/, scripts/, docs/, etc.
```

## Phase 1: Database Setup (CRITICAL - Use Cloning Method)

### Database Cloning Process
**IMPORTANT**: The project uses a **database cloning system** rather than manual setup. Your current machine (ARTI0) has a working Supabase instance that must be cloned exactly.

### Step 1.1: Export Database (Source Machine - ARTI0)

**Execute on the current working machine:**

```bash
# Navigate to project root
cd C:\Users\Admin\Desktop\ARTi-project

# Export the current Supabase database
node scripts/export-supabase-database.js
```

**Expected Results:**
- Creates `supabase-export/` directory
- Generates `supabase-export-YYYY-MM-DD-HH-MM-SS.sql` (complete database dump)
- Creates `import-database.sh` script for target machine
- File size should be significant (likely 50MB+ with all campaign data)

**Verification:**
```bash
ls -la supabase-export/
# Should contain: .sql file, import-database.sh, export-metadata.json, README.md
```

### Step 1.2: Transfer Export Files

**Transfer the entire `supabase-export/` directory to target machine:**

**Option A: Network Transfer**
```bash
# On source machine
tar -czf supabase-export.tar.gz supabase-export/

# Copy to target machine (adjust path as needed)
scp supabase-export.tar.gz target-machine:~/ARTi-project/

# On target machine
tar -xzf supabase-export.tar.gz
```

**Option B: USB Drive**
- Copy entire `supabase-export/` folder to USB drive
- Transfer to target machine
- Place in project root directory

### Step 1.3: Import Database (Target Machine)

**Execute on the target machine:**

```bash
# Ensure you're in project root
cd ARTi-project

# Import the database
node scripts/import-supabase-database.js
```

**Expected Process:**
1. Validates export files exist and are complete
2. Checks/starts Supabase instance automatically
3. Imports complete database schema and data
4. Verifies data integrity with count queries
5. Provides post-import checklist

**Expected Output:**
```
🚀 STARTING SUPABASE DATABASE IMPORT
==================================================

📋 Import source: ARTI0-local-supabase
📅 Export date: [current date/time]

✅ DATABASE IMPORT COMPLETED SUCCESSFULLY!

🔍 VERIFYING DATA INTEGRITY...
   SELECT COUNT(*) as client_count FROM clients; → [number]
   SELECT COUNT(*) as campaign_count FROM spotify_campaigns; → [number]
   SELECT COUNT(*) as org_count FROM orgs; → [number]
   SELECT COUNT(*) as user_count FROM auth.users; → [number]
```

## Phase 2: Environment Configuration

### 2.1: Supabase Configuration
**Files to verify:**
- `supabase/config.toml` - Main database configuration
- `stream-strategist/supabase/config.toml` - Stream-strategist configuration

**Default ports (verify no conflicts):**
- Main Supabase: 54321 (API), 54322 (DB), 54323 (Studio)
- Stream-Strategist: 54331 (API), 54332 (DB), 54333 (Studio)

### 2.2: Application Environment Variables

#### Frontend Configuration (`apps/frontend/.env.local`)
```bash
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001
```

#### Backend Configuration (`apps/api/.env`)
```bash
PORT=3001
NODE_ENV=development
SUPABASE_URL=http://localhost:54321
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

**Critical**: Update Supabase service role keys from your Supabase dashboard.

## Phase 3: Application Startup & Verification

### 3.1: Start Backend API
```bash
cd apps/api
npm install
npm run dev
```

**Expected:**
- Server starts on http://localhost:3001
- Health endpoint: `curl http://localhost:3001/api/health`

### 3.2: Start Frontend Application
```bash
cd apps/frontend
npm install
npm run dev
```

**Expected:**
- Application available at http://localhost:3000
- Successful compilation without errors

### 3.3: Verify Database Connections

#### Test Database Connectivity
```bash
# Test main database connection
node scripts/test-connection.js

# Expected: Successful connection to all tables
```

#### Verify Key Data Tables
```sql
-- Run these queries in Supabase Studio (http://localhost:54323)
SELECT COUNT(*) as clients FROM clients;
SELECT COUNT(*) as spotify_campaigns FROM spotify_campaigns;
SELECT COUNT(*) as users FROM auth.users;
SELECT COUNT(*) as orgs FROM orgs;
```

**Expected Results:**
- `clients`: 100+ (artists/labels)
- `spotify_campaigns`: 1000+ (active campaigns)
- `auth.users`: 10+ (registered users)
- `orgs`: 2-5 (organizations)

## Phase 4: Feature Verification

### 4.1: Authentication System
1. Navigate to http://localhost:3000
2. Test user login/logout functionality
3. Verify role-based access (admin vs regular user)

### 4.2: Platform Dashboards
- **Spotify Dashboard**: `/spotify` - Campaign management
- **YouTube Dashboard**: `/youtube` - Video campaign tracking
- **SoundCloud Dashboard**: `/soundcloud` - Audio campaign management
- **Instagram Dashboard**: `/instagram` - Social media campaigns

### 4.3: Admin Panel
- Navigate to `/admin`
- Verify user management functionality
- Check platform integration settings

### 4.4: Stream-Strategist Application
- Access stream-strategist interface
- Verify vendor and playlist management
- Test campaign creation and tracking

## Phase 5: Data Validation & Troubleshooting

### 5.1: Common Issues & Solutions

#### Database Connection Issues
```bash
# Check Supabase status
supabase status

# Restart if needed
supabase stop && supabase start

# Check port conflicts
netstat -ano | findstr :54321
netstat -ano | findstr :54322
```

#### Application Startup Errors
```bash
# Clear node modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Check for missing environment variables
cat apps/api/.env
cat apps/frontend/.env.local
```

#### Data Import Issues
```bash
# Re-run import with verbose logging
DEBUG=* node scripts/import-supabase-database.js

# Check export file integrity
ls -la supabase-export/
cat supabase-export/export-metadata.json
```

### 5.2: Key Files Reference

#### Database Files
- `supabase/config.toml` - Main database configuration
- `supabase/migrations/` - Database schema migrations
- `supabase-export/` - Database export (created during cloning)

#### Application Files
- `apps/api/src/routes/` - API endpoint definitions
- `apps/frontend/app/(dashboard)/` - Frontend page structure
- `scripts/` - Database management and utility scripts

#### Configuration Files
- `apps/api/.env` - Backend environment variables
- `apps/frontend/.env.local` - Frontend environment variables
- `supabase/config.toml` - Database configuration

## Phase 6: Final Verification Checklist

### ✅ Database Setup
- [ ] Supabase instances running on correct ports
- [ ] Database contains expected data volume
- [ ] All tables accessible and populated
- [ ] RLS policies functioning correctly

### ✅ Application Startup
- [ ] Backend API responding on port 3001
- [ ] Frontend accessible on port 3000
- [ ] No compilation errors in either application

### ✅ Core Functionality
- [ ] User authentication working
- [ ] Dashboard navigation functional
- [ ] Campaign data displaying correctly
- [ ] Admin panel accessible

### ✅ Data Integrity
- [ ] Client-campaign relationships intact
- [ ] Platform-specific data accessible
- [ ] User permissions functioning
- [ ] Stream-strategist integration working

## Success Metrics

### Database Metrics
- **Clients**: 100+ records
- **Spotify Campaigns**: 1000+ records
- **Auth Users**: 10+ users
- **Organizations**: 2-5 orgs

### Application Metrics
- **Response Time**: < 2 seconds for API calls
- **Error Rate**: < 1% for critical operations
- **Uptime**: Both applications running without crashes

## Support & Documentation

### Available Documentation
- `SUPABASE-LOCAL-SETUP-GUIDE.md` - Database setup guide (this document)
- `docs/deployment-plan.md` - Production deployment guide
- `docs/` - Additional project documentation

### Troubleshooting Resources
- `scripts/` - Database management scripts
- `supabase/logs/` - Database logs (if enabled)
- Project Wiki/Issues (if available)

## Critical Notes

### Security Considerations
- **Service Role Keys**: Never commit to version control
- **Environment Variables**: Verify all sensitive data is configured
- **CORS Settings**: Ensure proper cross-origin configuration

### Performance Considerations
- **Database Indexes**: Verify all foreign key indexes exist
- **Connection Pooling**: Monitor database connection usage
- **Cache Configuration**: Check Redis setup if applicable

### Backup Strategy
- **Database Backups**: Set up regular automated backups
- **Export Retention**: Keep recent database exports for rollback
- **Configuration Backups**: Backup environment files securely

---

**Setup Complete**: Once all phases are verified, the ARTi platform should be fully functional with all campaign data, user management, and platform integrations working correctly.

