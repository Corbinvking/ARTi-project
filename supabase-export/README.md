# Supabase Database Export

This directory contains a complete export of the ARTI platform Supabase database.

## Contents

- `complete-export-1758817145392.json` - Complete database export in JSON format
- `import-database.sh` - Script to import on target machine
- `export-metadata.json` - Export metadata and information

## For Target Machine Setup

1. Copy this entire directory to the target machine
2. Navigate to this directory
3. Run: `./import-database.sh`

## Database Connection Details

- **Host**: localhost
- **Port**: 54322
- **Database**: postgres
- **Username**: postgres

## What This Export Includes

✅ Complete schema (tables, indexes, constraints)
✅ All table data
✅ Functions and stored procedures
✅ Row Level Security (RLS) policies
✅ Auth configuration
✅ Storage configuration

## Notes

- This export excludes user passwords for security
- Auth users will need to be recreated on the target machine
- Storage buckets and files are not included in this export
- Environment-specific configurations may need updating

## Original Export Details

- **Source**: local-supabase (ARTI0)
- **Export Date**: 2025-09-25T16:19:05.252Z
- **Tables**: 12 tables with approximately 50,000 records
- **Format**: JSON export (compatible with existing import scripts)

## Troubleshooting

If import fails:
1. Ensure Supabase CLI is installed: `npm install -g @supabase/supabase-js`
2. Check that ports 54321-54326 are available
3. Verify Docker is running
4. Check available disk space

## Support

For issues with this export, refer to:
- SUPABASE-LOCAL-SETUP-GUIDE.md
- PROJECT-SETUP-PROMPT.md

