# Stream Strategist Schema Deployment Guide

This guide explains how to deploy the complete Stream Strategist database schema to your production Supabase instance while maintaining the local-to-production mirror workflow.

## Overview

The Stream Strategist integration adds 33 new tables to support:
- **Campaign Management**: Advanced campaign creation, tracking, and optimization
- **ML Analytics**: Machine learning features for performance prediction and optimization
- **Compliance & Fraud Detection**: Automated compliance checking and fraud detection
- **Reporting**: Advanced reporting and analytics capabilities
- **Workflow Automation**: Automated workflow rules and execution
- **Vendor Management**: Comprehensive vendor tracking and performance monitoring

## Schema Components

### Core Tables
- `creators` - Instagram creator profiles and metrics
- `campaign_ab_tests` - A/B testing for campaigns
- `analytics_notes` - Campaign analytics and insights
- `ml_model_versions` - Machine learning model tracking
- `algorithm_learning_log` - Algorithm decision logging

### Compliance & Security
- `fraud_detection_alerts` - Fraud detection and alerts
- `content_verification_logs` - Content verification tracking
- `vendor_compliance_scores` - Vendor compliance scoring
- `campaign_compliance_checkpoints` - Campaign compliance tracking

### Performance & Analytics
- `creator_ml_features` - ML features for creators
- `post_performance_tracking` - Detailed post performance tracking
- `playlist_performance_history` - Playlist performance over time
- `performance_alerts` - Performance monitoring alerts

### Workflow & Automation
- `workflow_rules` - Automated workflow rules
- `workflow_executions` - Workflow execution logs
- `smart_deadlines` - AI-calculated deadlines

### Reporting & Business Intelligence
- `report_exports` - Report generation and exports
- `report_schedules` - Scheduled reporting
- `sales_goals` - Sales goal tracking
- `team_goals` - Team performance goals

## Deployment Methods

### Method 1: PowerShell Script (Recommended)

```powershell
# Run the deployment script
.\deploy-stream-strategist-schema.ps1
```

This script:
- ✅ Loads environment variables from `production.env`
- ✅ Validates required credentials
- ✅ Executes the migration in chunks to avoid timeouts
- ✅ Handles non-critical errors gracefully
- ✅ Verifies key tables were created
- ✅ Provides detailed progress reporting

### Method 2: Node.js Script

```bash
# Run with production flag
NODE_ENV=production node scripts/deploy-stream-strategist-schema-simple.js

# Or with command line flag
node scripts/deploy-stream-strategist-schema-simple.js --production
```

### Method 3: Direct SQL Execution

```bash
# If you have direct database access
psql -h your-db-host -U postgres -d postgres < supabase/migrations/017_stream_strategist_complete_schema.sql
```

## Prerequisites

1. **Environment Variables**: Ensure `production.env` contains:
   ```
   SUPABASE_URL=your-supabase-url
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```

2. **Permissions**: The service role key must have:
   - Database modification permissions
   - Schema creation permissions
   - RLS policy creation permissions

3. **Existing Schema**: The migration assumes existing tables from previous migrations:
   - `orgs` - Organization management
   - `memberships` - User-organization relationships
   - `users` - User authentication

## Multi-Tenant Isolation

All Stream Strategist tables include:
- ✅ **org_id foreign keys** - Links all data to organizations
- ✅ **RLS policies** - Ensures data isolation between organizations
- ✅ **Indexes** - Optimized queries with org_id filtering

### Example RLS Policy
```sql
CREATE POLICY "creators_org_isolation" ON public.creators
  FOR ALL USING (org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid()));
```

## Verification

After deployment, verify the schema by checking:

### 1. Key Tables Exist
```sql
SELECT tablename FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN (
  'creators', 'campaign_ab_tests', 'ml_model_versions', 
  'analytics_notes', 'workflow_rules'
);
```

### 2. RLS Policies Active
```sql
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename LIKE '%stream_strategist%' OR tablename IN ('creators', 'analytics_notes');
```

### 3. Sample Data Access
```sql
-- Test org isolation (should only return data for user's org)
SELECT * FROM public.creators LIMIT 5;
```

## Troubleshooting

### Common Issues

1. **Permission Denied**
   - Ensure service role key has sufficient permissions
   - Check that the key is correctly set in `production.env`

2. **Timeout Errors**
   - The migration is large; use the PowerShell script which chunks the execution
   - Consider running during low-traffic periods

3. **Duplicate Object Errors**
   - These are non-critical if tables already exist
   - The script handles these gracefully and continues

4. **RLS Policy Conflicts**
   - Check for existing policies with the same names
   - Drop conflicting policies before re-running

### Rollback

If you need to rollback:

```sql
-- Drop all Stream Strategist tables (CAREFUL!)
DROP TABLE IF EXISTS public.workflow_executions CASCADE;
DROP TABLE IF EXISTS public.workflow_rules CASCADE;
-- ... (repeat for all tables in reverse dependency order)
```

## Post-Deployment

After successful deployment:

1. **Test Frontend Integration**
   - Verify Stream Strategist pages load correctly
   - Test navigation between pages
   - Confirm data displays properly

2. **Test Data Isolation**
   - Create test data in different organizations
   - Verify users only see their org's data
   - Test RLS policies work correctly

3. **Performance Testing**
   - Run queries on large datasets
   - Verify indexes are being used
   - Monitor query performance

4. **Feature Testing**
   - Test ML analytics features
   - Verify workflow automation
   - Test reporting functionality

## Support

If you encounter issues:
1. Check the deployment logs for specific error messages
2. Verify environment variables are correctly set
3. Ensure your Supabase instance has sufficient resources
4. Review the migration file for any syntax issues

The Stream Strategist schema is now ready to support advanced campaign management, ML analytics, and workflow automation features in your production environment! 🎉
