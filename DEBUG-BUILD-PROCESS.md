# Debug Build Process

## 🔍 **Debug commands to run on droplet:**

```bash
# 1. Check if spotify.ts exists in the container source during build
docker exec supabase_api_arti-marketing-ops ls -la /app/src/routes/spotify.ts

# 2. Check the build logs for any TypeScript errors
docker logs supabase_api_arti-marketing-ops --tail 50

# 3. Try manually running TypeScript compilation in the container
docker exec supabase_api_arti-marketing-ops bash -c "cd /app && npm run build"

# 4. Check what TypeScript sees
docker exec supabase_api_arti-marketing-ops find /app/src -name "*.ts" | grep spotify

# 5. Check TypeScript config in container
docker exec supabase_api_arti-marketing-ops cat /app/tsconfig.json

# 6. Try manual compilation of just spotify.ts
docker exec supabase_api_arti-marketing-ops bash -c "cd /app && npx tsc src/routes/spotify.ts --outDir dist/routes"
```

**The issue: Even with fresh build, spotify.js isn't being created.** 

This suggests either:
- TypeScript compilation is failing silently
- The file has syntax errors preventing compilation
- Import/export issues are causing it to be excluded

**Run these debug commands!** 🔍
