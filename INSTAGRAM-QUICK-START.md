# Instagram Integration - Quick Start Guide

## 🚀 Getting Started

### 1. Apply Database Migration

Run the Instagram schema migration to create all necessary tables:

```bash
# If using Supabase CLI
cd supabase
supabase db push

# Or apply via your existing migration process
# The migration file is: supabase/migrations/035_instagram_integration.sql
```

### 2. Verify Tables Created

Check that these tables exist in your database:
- `instagram_campaigns`
- `instagram_campaign_creators`
- `instagram_campaign_posts`
- `instagram_post_analytics`
- `instagram_tags`
- `instagram_algorithm_learning_log`
- `instagram_ab_tests`

### 3. Navigate to Instagram App

Once the migration is applied, navigate to:
```
http://localhost:3000/instagram
```

You should see the Instagram dashboard with:
- Campaign statistics
- Quick action buttons
- Feature overview cards

## 📁 Directory Structure

```
apps/frontend/app/(dashboard)/instagram/
├── components/          # 107 Instagram-specific components
├── hooks/               # 16 custom hooks
├── lib/                 # Business logic & utilities
├── contexts/            # Auth & state management
├── layout.tsx           # Instagram navigation layout
├── page.tsx             # Main dashboard
├── creators/            # Creator database
├── campaign-builder/    # Campaign creation
├── campaigns/           # Campaign history
├── qa/                  # Quality assurance
└── workflow/            # Automation rules
```

## 🔧 Configuration Needed

### Update Supabase Client Import

Some components may need import path updates. Replace:
```typescript
// Old (from seedstorm-builder)
import { supabase } from "@/integrations/supabase/client";

// New (for unified dashboard)
import { supabase } from "@/lib/auth";
```

### Environment Variables

Ensure your `.env.local` has:
```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## 🎯 Key Features Available

### 1. Creator Management (`/instagram/creators`)
- View all Instagram creators
- Search and filter creators
- Import/export creator data
- Track engagement metrics

### 2. Campaign Builder (`/instagram/campaign-builder`)
- 3-step campaign creation wizard
- AI-powered creator matching
- Budget optimization
- Genre and territory targeting

### 3. Campaign Dashboard (`/instagram/campaigns`)
- View all campaigns
- Track campaign status
- Monitor performance
- Export campaign reports

### 4. Quality Assurance (`/instagram/qa`)
- Data integrity monitoring
- Incomplete profile detection
- Analytics coverage tracking

### 5. Workflow Automation (`/instagram/workflow`)
- Automated payment triggers
- Post scheduling rules
- Approval workflows
- Escalation management

## 🔗 Navigation

The Instagram app has its own navigation bar with tabs:
- **Dashboard** - Overview and stats
- **Creators** - Creator database
- **Campaign Builder** - Create new campaigns
- **Campaigns** - Campaign history
- **Quality Assurance** - Data quality
- **Workflow** - Automation rules

## 📊 Sample Data

To test with sample data, you can:

1. **Add Creators Manually** via `/instagram/creators`
2. **Import CSV** using the bulk import feature
3. **Create Test Campaign** via `/instagram/campaign-builder`

### Sample Creator CSV Format:
```csv
instagram_handle,email,followers,engagement_rate,base_country,music_genres,content_types
musiclover123,test@example.com,50000,0.045,United States,"Pop,Rock","Music Reviews,Live Performances"
```

## 🐛 Troubleshooting

### Tables Not Found
- Ensure migration was applied: `supabase db push`
- Check Supabase dashboard for table creation

### Navigation Not Showing
- Clear browser cache
- Restart Next.js dev server: `npm run dev`

### Import Errors
- Check that all components use correct import paths
- Verify `@/` alias points to correct directory

### RLS Policy Errors
- Ensure user is authenticated
- Check org_id is set correctly in user metadata
- Verify RLS policies in Supabase dashboard

## 🎨 Customization

### Update Branding
Edit `apps/frontend/app/(dashboard)/instagram/page.tsx`:
```typescript
<h1 className="text-6xl font-bold text-gradient mb-6">
  YOUR BRAND NAME
</h1>
```

### Modify Navigation
Edit `apps/frontend/app/(dashboard)/instagram/layout.tsx`:
```typescript
const instagramNavItems = [
  // Add or remove navigation items
];
```

### Customize Colors
Instagram app uses Tailwind CSS classes. Update in component files or global CSS.

## 📈 Next Steps

1. **Enhance Pages**: Replace simplified pages with full implementations from `components/`
2. **Add Validation**: Implement form validation in campaign builder
3. **Real-time Updates**: Add Supabase real-time subscriptions
4. **Analytics**: Connect to Instagram API for live data
5. **Notifications**: Set up email/SMS notifications for workflows

## 🔐 Security

- All tables have RLS policies enabled
- Org-based data isolation
- Public access controlled via tokens
- Admin/manager role checks implemented

## 📚 Resources

- **Full Component Library**: `apps/frontend/app/(dashboard)/instagram/components/`
- **Database Schema**: `supabase/migrations/035_instagram_integration.sql`
- **Integration Summary**: `INSTAGRAM-INTEGRATION-SUMMARY.md`
- **Original Repo**: `seedstorm-builder/` (reference only)

## ✅ Verification Checklist

- [ ] Migration applied successfully
- [ ] Can navigate to `/instagram`
- [ ] Dashboard loads without errors
- [ ] Can view creators page
- [ ] Campaign builder form displays
- [ ] Navigation tabs work correctly
- [ ] Database queries return data (or empty arrays)

---

**Need Help?** Check `INSTAGRAM-INTEGRATION-SUMMARY.md` for detailed technical information.

**Ready to Deploy?** Ensure all environment variables are set in production and migration is applied to production database.

