# Instagram Integration - Quick Reference

> **For detailed tracking, see**: `INSTAGRAM-INTEGRATION-TRACKER.md` (gitignored - local only)

## 📁 What's Where

### Documentation Files
- **INSTAGRAM-INTEGRATION-TRACKER.md** 🔒 **(Local - Not in Git)** - Living development tracker
- **INSTAGRAM-INTEGRATION-SUMMARY.md** - Technical overview & architecture
- **INSTAGRAM-QUICK-START.md** - Getting started guide
- **INSTAGRAM-BUILD-FIXES-FINAL.md** - Complete list of all fixes applied
- **INSTAGRAM-README.md** - This file (quick reference)

### Code Locations
- **Frontend**: `apps/frontend/app/(dashboard)/instagram/`
- **Migration**: `supabase/migrations/035_instagram_integration.sql`
- **Source Repo**: `seedstorm-builder/` (can be removed after integration)

## 🚀 Quick Start

### 1. Install Dependencies (Already Done)
```bash
cd apps/frontend
npm install react-dropzone uuid @types/uuid
```

### 2. Apply Database Migration
```bash
cd supabase
supabase db push
# Or apply 035_instagram_integration.sql manually
```

### 3. Start Development
```bash
cd apps/frontend
npm run dev
```

### 4. Visit Instagram App
```
http://localhost:3000/instagram
```

## 📊 Current Status

✅ **Setup Complete**
- Dependencies installed
- All files migrated
- All imports fixed
- Build errors resolved

⏳ **Next Steps**
- Test Instagram dashboard
- Apply database migration
- Import sample data
- Test full functionality

## 🎯 Key Routes

- `/instagram` - Main dashboard
- `/instagram/creators` - Creator database
- `/instagram/campaign-builder` - Campaign builder
- `/instagram/campaigns` - Campaign history
- `/instagram/qa` - Quality assurance
- `/instagram/workflow` - Workflow automation

## 📝 Development Workflow

1. **Track Progress**: Update `INSTAGRAM-INTEGRATION-TRACKER.md` after each session
2. **Test Changes**: Verify functionality as you develop
3. **Document Issues**: Add to tracker's "Known Issues" section
4. **Stay Local**: Don't push tracker to git (it's gitignored)
5. **Before Git Push**: Review tracker's "Git Push Checklist"

## 🔧 Common Commands

```bash
# Development
npm run dev                    # Start dev server
npm run build                  # Build for production

# Database
supabase db push               # Apply migrations
supabase db reset              # Reset database
supabase status                # Check status

# Code Quality
npm run lint                   # Run linter
```

## 📚 Important Files

**Main Entry**: `apps/frontend/app/(dashboard)/instagram/page.tsx`  
**Layout**: `apps/frontend/app/(dashboard)/instagram/layout.tsx`  
**Types**: `apps/frontend/app/(dashboard)/instagram/lib/types.ts`  
**Migration**: `supabase/migrations/035_instagram_integration.sql`

## 🐛 If Something Breaks

1. Check console for errors
2. Verify Supabase connection
3. Check import paths (relative vs absolute)
4. Review `INSTAGRAM-BUILD-FIXES-FINAL.md`
5. Update tracker with new issues

## 💡 Remember

- Instagram tables prefixed with `instagram_`
- `creators` table shared with Spotify
- All imports from Instagram files use relative paths (`../`)
- Main app imports use `@/` paths
- Tracker file is local only (gitignored)

---

**Happy Developing!** 🎉

Update `INSTAGRAM-INTEGRATION-TRACKER.md` as you progress.

