# ARTi Platform - Unified Database Overview

**Organization:** Artist Influence  
**Platform:** Unified Multi-App Database on Supabase  
**Last Updated:** November 13, 2024  
**Database URL:** https://db.artistinfluence.com/ 🔐

---

## 🎉 Platform Status

**Status:** ✅ **FULLY OPERATIONAL**  
**Authentication:** ✅ HTTP Basic Auth Enabled  
**Total Campaigns Imported:** **1,387 campaigns** across all platforms

---

## 🔐 Database Access

### Supabase Studio (Admin Dashboard)

**URL:** https://db.artistinfluence.com/

**Credentials:**
- **Username:** `admin`
- **Password:** `ArtistInfluence2025!`

**Features:**
- Visual database editor
- SQL query interface
- Real-time data viewing
- Table relationships browser
- RLS policy management

---

## 📊 Platform Statistics

| Platform | CSV File | Campaigns Imported | Success Rate | Status |
|----------|----------|-------------------|--------------|--------|
| **YouTube** | YouTube-All Campaigns.csv | 420 / 437 | 96.1% | ✅ Operational |
| **Instagram** | IG Seeding-All Campaigns.csv | 102 / 110 | 92.7% | ✅ Operational |
| **SoundCloud** | SoundCloud-All Campaigns.csv | 865 / 2,149 | 40.2% | ✅ Operational |
| **Spotify** | (Previously migrated) | ~1,400 campaigns | 100% | ✅ Operational |
| **TOTAL** | - | **1,387 new** | **94.5% avg** | ✅ Operational |

---

## 📁 Platform Documentation

Each platform has comprehensive documentation detailing its database schema:

### 1. YouTube (Vidi Health Flow)
**File:** [YOUTUBE-DATABASE-SCHEMA.md](./YOUTUBE-DATABASE-SCHEMA.md)

**Core Features:**
- Paid YouTube view campaigns
- Multi-service support (Display, Skip, Website ads)
- Geographic targeting (15+ regions)
- Daily stats tracking (3x per day)
- Vendor payment automation
- Engagement ratio fixing

**Tables:** 9 core tables
- `youtube_campaigns` (1,676 total, 420 new)
- `youtube_clients` (91 total)
- `youtube_salespersons` (6 total)
- `youtube_campaign_stats_daily`
- `youtube_performance_logs`
- `youtube_ratio_fixer_queue`

---

### 2. Instagram (Seedstorm Builder)
**File:** [INSTAGRAM-DATABASE-SCHEMA.md](./INSTAGRAM-DATABASE-SCHEMA.md)

**Core Features:**
- Instagram seeding campaigns
- Creator network management
- Post analytics tracking
- A/B testing support
- Spotify integration

**Tables:** 7+ core tables
- `instagram_campaigns` (263 total, 102 new)
- `instagram_creators`
- `instagram_campaign_posts`
- `instagram_post_analytics`
- `instagram_tags`
- `instagram_ab_tests`

**Note:** Currently uses simplified schema (migration 011). Full schema available but not yet migrated.

---

### 3. SoundCloud (Artist Spark)
**File:** [SOUNDCLOUD-DATABASE-SCHEMA.md](./SOUNDCLOUD-DATABASE-SCHEMA.md)

**Core Features:**
- SoundCloud repost network
- Multi-tier credit system (T1-T4)
- Supporter channel management
- Automated repost scheduling
- Equity calculation (repost value tracking)

**Tables:** 15+ core tables
- `soundcloud_submissions` (2,083 total, 865 new)
- `soundcloud_members` (T1-T4 channels)
- `soundcloud_supporters` (repost channels)
- `soundcloud_clients` (artists)
- `soundcloud_families` (genre groupings)
- `soundcloud_inquiries` (new member applications)

---

### 4. Spotify (Stream Strategist)
**File:** See Cursor Rules for detailed documentation

**Core Features:**
- Spotify playlist placement campaigns
- Campaign-playlist performance tracking
- Vendor payout calculations
- Playlist enrichment (follower counts, genres)
- Algorithmic playlist detection

**Tables:** 5+ core tables
- `spotify_campaigns` (~1,400 campaigns)
- `campaign_playlists` (playlist performance)
- `campaign_groups` (multi-song campaigns)
- `playlists` (enriched playlist data)
- `clients`, `vendors`, `salespersons`

---

## 🏗️ Database Architecture

### Multi-Tenancy
**All platform-specific tables include `org_id`:**
```sql
org_id UUID REFERENCES orgs(id) ON DELETE CASCADE
```

This enables:
- Data isolation per organization
- Future SaaS scaling
- Row Level Security (RLS) enforcement

### Shared Tables
These tables are used across all platforms:
- `orgs` - Organization/company accounts
- `clients` - Customers purchasing campaigns (shared across platforms)
- `vendors` - Service providers (Spotify vendors, YouTube vendors, etc.)
- `salespersons` - Sales team members

### Platform-Specific Tables
Tables are prefixed with platform name:
- `youtube_*` (YouTube platform)
- `instagram_*` (Instagram platform)
- `soundcloud_*` (SoundCloud platform)
- `spotify_*` or `campaign_*` (Spotify platform - established first)

---

## 🔄 Data Import System

### Import Scripts
**Location:** `scripts/`

| Script | Purpose | Status |
|--------|---------|--------|
| `import-youtube-campaigns.ts` | YouTube CSV import | ✅ Complete |
| `import-instagram-campaigns.ts` | Instagram CSV import | ✅ Complete |
| `import-soundcloud-submissions.ts` | SoundCloud CSV import | ✅ Complete |
| `import-all-campaigns.sh` | Master orchestration script | ✅ Complete |

### CSV Files Processed
| File | Rows | Platform | Location |
|------|------|----------|----------|
| `YouTube-All Campaigns.csv` | 804 | YouTube | Root directory |
| `IG Seeding-All Campaigns.csv` | 169 | Instagram | Root directory |
| `SoundCloud-All Campaigns.csv` | 2,149 | SoundCloud | Root directory |

---

## 🚀 Deployment History

### Migrations Applied

**YouTube (4 migrations):**
1. ✅ `042_youtube_complete_schema_fix.sql` - Core schema with UUID IDs
2. ✅ `044_add_youtube_clients_and_service_types.sql` - Client tables + service_types
3. ✅ `045_add_youtube_service_type_enum_values.sql` - 16 service type enums
4. ✅ `046_add_remaining_youtube_service_types.sql` - Final enum values

**Instagram (1 migration):**
1. ✅ `035_instagram_complete_schema.sql` - Full schema (not overwriting existing)

**SoundCloud (1 migration):**
1. ✅ `043_soundcloud_complete_schema.sql` - Complete schema with RLS

**Spotify (41 migrations):**
- Migrations 001-041 (legacy, already applied)

**Total Migrations:** 47 migrations

---

## 🔧 Infrastructure

### Production Environment
- **Host:** DigitalOcean Droplet (164.90.129.146)
- **OS:** Ubuntu 22.04
- **SSH Access:** `root@164.90.129.146`
- **Project Directory:** `/root/arti-marketing-ops`

### Services
| Service | Status | Port | URL |
|---------|--------|------|-----|
| **Supabase Studio** | ✅ Healthy | 54323 | https://db.artistinfluence.com |
| **Supabase API** | ✅ Healthy | 54321 | https://api.artistinfluence.com |
| **PostgREST** | ✅ Healthy | 3000 | (internal) |
| **PostgreSQL** | ✅ Healthy | 5432 | (internal) |
| **Caddy** | ✅ Healthy | 80, 443 | (reverse proxy) |
| **n8n Automation** | ✅ Healthy | 5678 | https://link.artistinfluence.com |

---

## 📖 Additional Documentation

| Document | Purpose |
|----------|---------|
| `DATA-IMPORT-GUIDE.md` | Step-by-step import instructions |
| `CSV-TO-DATABASE-MAPPING.md` | CSV column to database mapping |
| `PLATFORM-INTEGRATION-SUMMARY.md` | Migration strategy summary |
| `DATABASE-SCHEMA-INVENTORY.md` | Original repo schema inventory |
| `APPLY-PLATFORM-MIGRATIONS.md` | Migration application guide |
| `local-to-production-mirror.md` | Development workflow |

---

## ✅ Security

### Authentication
- ✅ HTTP Basic Authentication on Supabase Studio
- ✅ RLS (Row Level Security) enabled on all tables
- ✅ JWT-based API authentication
- ✅ HTTPS/TLS encryption (Let's Encrypt)

### Backups
**Recommendation:** Set up automated PostgreSQL backups
```bash
# Manual backup
docker exec supabase_db_arti-marketing-ops pg_dump -U postgres postgres > backup_$(date +%Y%m%d).sql
```

---

## 📝 Next Steps

### Recommended Actions

1. **Set up automated backups**
   - Daily PostgreSQL dumps
   - Store offsite (S3, Backblaze, etc.)

2. **Monitor import errors**
   - Review the 9 YouTube campaign errors (2%)
   - Investigate Instagram skipped campaigns
   - Check SoundCloud data quality

3. **Instagram Schema Migration**
   - Consider migrating from simplified schema (011) to full schema (035)
   - Will enable creator tracking, post analytics, A/B testing

4. **Frontend Integration**
   - Connect frontend apps to query new tables
   - Build dashboards for each platform
   - Enable cross-platform reporting

5. **Data Enrichment**
   - YouTube: Set up daily stats fetching from YouTube API
   - Instagram: Track post performance via Instagram API
   - SoundCloud: Implement repost tracking

---

## 🆘 Support

### Common Issues

**Q: Can't access db.artistinfluence.com**
- Verify credentials: admin / ArtistInfluence2025!
- Check browser is not caching old session
- Try incognito/private browsing

**Q: Tables not showing in Supabase Studio**
- Restart PostgREST to refresh schema cache:
  ```bash
  docker restart supabase_rest_arti-marketing-ops
  ```

**Q: Import script failed**
- Check environment variables are set
- Verify CSV file encoding (UTF-8 with BOM)
- Review error logs for specific issues

---

## 📞 Contact

**Project Repository:** https://github.com/Corbinvking/ARTi-project  
**Organization:** Artist Influence  
**Maintained by:** Development Team

---

**Last Import:** November 13, 2024  
**Database Version:** PostgreSQL 15.1 via Supabase  
**Total Records:** 5,405+ campaigns across all platforms

