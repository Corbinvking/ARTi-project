# Final Debug - Check Build Contents

## 🔍 **Let's see what's actually being copied and compiled:**

```bash
# 1. Check what's in the source after COPY but before build
docker build --progress=plain --no-cache --target builder -t debug-builder apps/api/
docker run --rm -it debug-builder ls -la /app/src/routes/

# 2. Check if spotify.ts gets copied but fails compilation
docker run --rm -it debug-builder ls -la /app/src/routes/spotify.ts

# 3. Check what happens during TypeScript compilation
docker run --rm -it debug-builder bash -c "cd /app && npm run build 2>&1"

# 4. Check what's created in dist after build
docker run --rm -it debug-builder ls -la /app/dist/routes/

# 5. Check if there are any TypeScript errors specifically for spotify.ts
docker run --rm -it debug-builder bash -c "cd /app && npx tsc --noEmit src/routes/spotify.ts"
```

## 🎯 **This will show us:**
- Does `spotify.ts` get copied into the build container?
- Does TypeScript compilation fail silently for this file?
- What's actually created in the dist directory?

**Run these commands to see exactly what happens during build!** 🔍
