# Debug Docker File Copy Issue

## 🔍 **Commands to debug why spotify.ts isn't being copied:**

```bash
# 1. Check what files are actually in the build context on the host
ls -la apps/api/src/routes/spotify.ts

# 2. Check the Dockerfile COPY commands
cat apps/api/Dockerfile | grep -A5 -B5 "COPY src"

# 3. Check if there's a .dockerignore excluding the file
cat apps/api/.dockerignore | grep -i spotify || echo "No spotify entries in .dockerignore"

# 4. Check what's actually being copied during build
docker build --progress=plain --no-cache -t arti-marketing-ops-api apps/api/ 2>&1 | grep -A10 -B10 "COPY src"

# 5. Verify file permissions and ownership
ls -la apps/api/src/routes/

# 6. Try building with explicit context
docker build --progress=plain --no-cache -f apps/api/Dockerfile -t arti-marketing-ops-api apps/api/
```

## 🎯 **The issue:** 
Even after fresh build with `--no-cache`, `spotify.ts` isn't in the container. This suggests:
- File isn't in build context
- Docker COPY command isn't including it
- .dockerignore is excluding it
- File permissions issue

**Run these commands to find why Docker isn't copying the file!** 🔍
