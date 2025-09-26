# Fixed Debug Commands

## 🔍 **Corrected commands (Alpine doesn't have bash by default):**

```bash
# 3. Check what happens during TypeScript compilation
docker run --rm debug-builder sh -c "cd /app && npm run build 2>&1"

# 4. Check what's created in dist after build
docker run --rm debug-builder ls -la /app/dist/routes/

# 5. Check if there are TypeScript errors specifically for spotify.ts
docker run --rm debug-builder sh -c "cd /app && npx tsc --noEmit src/routes/spotify.ts"

# 6. Try compiling just spotify.ts manually
docker run --rm debug-builder sh -c "cd /app && npx tsc src/routes/spotify.ts --outDir /tmp/test && ls -la /tmp/test/"

# 7. If the above don't work, let's check what files actually get compiled
docker run --rm debug-builder find /app/dist -name "*.js" | head -10
```

## 🎯 **Use `sh` instead of `bash` for Alpine containers!**

**Run these corrected commands!** 🔍
