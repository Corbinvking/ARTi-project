# Fix Kong and API Configuration

## 🔧 **Issue 1: Kong can't find services (wrong service names)**
## 🔧 **Issue 2: API can't start due to startup dependencies**

```bash
# 1. Fix Kong configuration - update service names to match docker-compose
cat > supabase/kong.yml << 'EOF'
_format_version: "3.0"
_info:
  select_tags:
  - supabase_local_dev

###
### Consumers / Users
###
consumers:
- custom_id: anon
  username: anon
- custom_id: service_role
  username: service_role

###
### Access Control List
###
acls:
- consumer: anon
  group: anon
- consumer: service_role
  group: admin

###
### API Keys / JWT
###
key_auths:
- consumer: anon
  key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0
- consumer: service_role  
  key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU

###
### Services (FIXED: Use production container names)
###
services:
## Open API Routes
- name: auth-v1-open
  url: http://arti-auth-prod:9999/verify
  routes:
  - name: auth-v1-open
    strip_path: true
    paths:
    - /auth/v1/verify
  plugins:
  - name: cors

- name: auth-v1-open-callback
  url: http://arti-auth-prod:9999/callback
  routes:
  - name: auth-v1-open-callback
    strip_path: true
    paths:
    - /auth/v1/callback
  plugins:
  - name: cors

- name: auth-v1-open-authorize
  url: http://arti-auth-prod:9999/authorize
  routes:
  - name: auth-v1-open-authorize
    strip_path: true
    paths:
    - /auth/v1/authorize
  plugins:
  - name: cors

## Secure API Routes
- name: auth-v1
  _comment: "GoTrue: /auth/v1/* -> http://arti-auth-prod:9999/*"
  url: http://arti-auth-prod:9999/
  routes:
  - name: auth-v1-all
    strip_path: true
    paths:
    - /auth/v1/
  plugins:
  - name: cors
  - name: key-auth
    config:
      hide_credentials: false
  - name: acl
    config:
      hide_groups_header: true
      allow:
      - admin
      - anon

- name: rest-v1
  _comment: "PostgREST: /rest/v1/* -> http://arti-rest-prod:3000/*"
  url: http://arti-rest-prod:3000/
  routes:
  - name: rest-v1-all
    strip_path: true
    paths:
    - /rest/v1/
  plugins:
  - name: cors
  - name: key-auth
    config:
      hide_credentials: true
  - name: acl
    config:
      hide_groups_header: true
      allow:
      - admin
      - anon

- name: realtime-v1
  _comment: "Realtime: /realtime/v1/* -> ws://arti-realtime-prod:4000/socket/*"
  url: http://arti-realtime-prod:4000/socket/
  routes:
  - name: realtime-v1-all
    strip_path: true
    paths:
    - /realtime/v1/
  plugins:
  - name: cors
  - name: key-auth
    config:
      hide_credentials: false
  - name: acl
    config:
      hide_groups_header: true
      allow:
      - admin
      - anon

- name: storage-v1
  _comment: "Storage: /storage/v1/* -> http://arti-storage-prod:5000/*"
  url: http://arti-storage-prod:5000/
  routes:
  - name: storage-v1-all
    strip_path: true
    paths:
    - /storage/v1/
  plugins:
  - name: cors
  - name: key-auth
    config:
      hide_credentials: false
  - name: acl
    config:
      hide_groups_header: true
      allow:
      - admin
      - anon

- name: pg-meta
  _comment: "pg-meta: /pg/* -> http://arti-meta-prod:8080/*"
  url: http://arti-meta-prod:8080/
  routes:
  - name: pg-meta-all
    strip_path: true
    paths:
    - /pg/
  plugins:
  - name: key-auth
    config:
      hide_credentials: false
  - name: acl
    config:
      hide_groups_header: true
      allow:
      - admin

## Health check endpoint
- name: health
  url: http://arti-kong-prod:8001/status
  routes:
  - name: health
    paths:
    - /health
  plugins:
  - name: cors

###
### Global Plugins
###
plugins:
- name: cors
  config:
    origins:
    - "*"
    methods:
    - GET
    - HEAD
    - PUT
    - PATCH
    - POST
    - DELETE
    - OPTIONS
    headers:
    - Accept
    - Accept-Version
    - Content-Length
    - Content-MD5
    - Content-Type
    - Date
    - X-Auth-Token
    - Authorization
    - X-Requested-With
    exposed_headers:
    - X-Auth-Token
    credentials: true
    max_age: 3600
EOF

# 2. Update API .env file to not test Supabase connection on startup
cat >> apps/api/.env << 'EOF'

# Skip Supabase connection test on startup to avoid crashes
SKIP_SUPABASE_TEST=true
EOF

# 3. Restart services in correct order
docker compose -f docker-compose.production.yml down
docker compose -f docker-compose.production.yml up -d --build

# 4. Check status
docker ps

# 5. Test once everything is up
sleep 30
curl http://localhost:3001/healthz
curl http://localhost:3001/providers/spotify/health
```

## 🎯 **Key Fixes:**
1. ✅ **Kong service names** now match production container names
2. ✅ **API startup** won't crash if Supabase isn't ready yet

**Run these commands to fix both issues!** 🚀
