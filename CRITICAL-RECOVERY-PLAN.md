# 🚨 CRITICAL RECOVERY PLAN - Bottom-Up Validation

## **OVERVIEW**
Systematic recovery to restore full platform functionality with clear validation at each layer.

---

## **STAGE 1: DATABASE FOUNDATION** 
*Validate: Supabase DB + pgvector + Data Loading*

### **1.1 Database Connection Test**
```bash
# Test basic Supabase connectivity
npx supabase status
npx supabase db reset --debug
```

**✅ Success Criteria:**
- Supabase services running (db, auth, rest, kong, studio)
- All migrations applied successfully
- pgvector extension enabled

### **1.2 CSV Data Validation**
```bash
# Load and verify all CSV data
node scripts/validate-csv-data.js
```

**✅ Success Criteria:**
- All 4 CSV files processed (Spotify, SoundCloud, YouTube, Instagram)
- Campaigns table populated with actual data (not just samples)
- Data integrity verified (proper parsing, no truncation)

### **1.3 Auth Users Creation**
```bash
# Create production-ready auth users
node scripts/create-production-users.js
```

**✅ Success Criteria:**
- 4 test users created in Supabase Auth
- Users visible in Supabase Studio Auth panel
- Each user has proper metadata (name, role)

---

## **STAGE 2: BACKEND API LAYER**
*Validate: Docker Services + API Endpoints + CORS*

### **2.1 Docker Services Health Check**
```bash
# Verify all services are healthy
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
```

**✅ Success Criteria:**
- All containers running and healthy
- API service responding on port 3001
- Caddy proxy responding on port 8080
- Redis and Worker services operational

### **2.2 API Endpoint Validation**
```bash
# Test critical API endpoints
curl -X GET http://localhost:8080/api/health
curl -X GET http://localhost:8080/api/admin/users
```

**✅ Success Criteria:**
- Health endpoint returns 200
- Admin users endpoint returns user list
- CORS headers properly configured
- No authentication errors in API logs

### **2.3 Database Connectivity from API**
```bash
# Test API -> Supabase connection
node scripts/test-api-db-connection.js
```

**✅ Success Criteria:**
- API can connect to Supabase
- Service role authentication working
- Can read/write to campaigns table
- RLS policies functioning

---

## **STAGE 3: FRONTEND-BACKEND INTEGRATION**
*Validate: Authentication Flow + API Communication*

### **3.1 Authentication System Test**
```bash
# Start frontend and test auth flow
cd apps/frontend && npm run dev
```

**Manual Test Steps:**
1. Navigate to http://localhost:3000
2. Login with: `admin@arti-demo.com` / `Password123!`
3. Verify successful authentication
4. Check user role assignment

**✅ Success Criteria:**
- Login successful without "invalid credentials" error
- User dashboard loads with proper role permissions
- Auth context properly populated
- No infinite loading states

### **3.2 Frontend-API Communication**
**Manual Test Steps:**
1. Navigate to Admin panel
2. View user list (should show 4 users)
3. Create new test user
4. Delete test user
5. Verify changes reflect in Supabase Studio

**✅ Success Criteria:**
- User management fully functional
- API calls successful (no CORS errors)
- Real-time sync with Supabase Auth
- Error handling works properly

### **3.3 Data Display Validation**
**Manual Test Steps:**
1. Navigate to dashboard sections
2. Verify campaign data displays
3. Check platform-specific views
4. Test filtering/search functionality

**✅ Success Criteria:**
- All CSV campaign data visible in UI
- Proper data formatting and display
- No empty tables or missing data
- Platform breakdowns accurate

---

## **STAGE 4: PRODUCTION READINESS**
*Validate: Caddy Routing + Error Handling + Performance*

### **4.1 Caddy Reverse Proxy Validation**
```bash
# Test all Caddy routes
curl -H "Accept: application/json" http://localhost:8080/api/health
curl -H "Accept: application/json" http://localhost:8080/supabase/health
```

**✅ Success Criteria:**
- All routes properly forwarded
- TLS termination working (if configured)
- No proxy errors in logs
- Proper upstream health checks

### **4.2 Error Handling & Logging**
**Manual Test Steps:**
1. Test invalid login credentials
2. Test API with invalid data
3. Test network disconnection scenarios
4. Review error messages and logs

**✅ Success Criteria:**
- Graceful error handling throughout
- User-friendly error messages
- Proper logging in all services
- No silent failures

---

## **RECOVERY SCRIPTS TO CREATE**

### **📁 scripts/validate-csv-data.js**
- Parse all 4 CSV files completely
- Create proper table schemas matching CSV columns
- Load ALL data (not just samples)
- Verify data integrity and completeness

### **📁 scripts/create-production-users.js**
- Create auth users with proper metadata
- Link users to database profiles
- Set up organization memberships
- Verify RBAC permissions

### **📁 scripts/test-api-db-connection.js**
- Test Supabase client connection from API
- Validate service role permissions
- Test RLS policy enforcement
- Verify CRUD operations

### **📁 scripts/validate-frontend-auth.js**
- Automated auth flow testing
- API communication validation
- Error scenario testing
- Performance benchmarking

---

## **VALIDATION CHECKPOINTS**

### **🔍 Stage 1 Checkpoint**
- [ ] Supabase running with all services healthy
- [ ] All migrations applied successfully  
- [ ] pgvector extension working
- [ ] CSV data completely loaded
- [ ] Auth users created and visible in Studio

### **🔍 Stage 2 Checkpoint**
- [ ] All Docker containers healthy
- [ ] API endpoints responding correctly
- [ ] CORS properly configured
- [ ] Database connectivity from API verified

### **🔍 Stage 3 Checkpoint**
- [ ] Frontend authentication working
- [ ] User management fully functional
- [ ] All campaign data visible in UI
- [ ] No CORS or connectivity errors

### **🔍 Stage 4 Checkpoint**
- [ ] Caddy routing fully operational
- [ ] Error handling robust
- [ ] Performance acceptable
- [ ] Production-ready configuration

---

## **EXECUTION COMMANDS**

```bash
# Stage 1: Database Foundation
npx supabase db reset
node scripts/validate-csv-data.js
node scripts/create-production-users.js

# Stage 2: Backend API Layer  
docker ps --filter "name=supabase" --format "table {{.Names}}\t{{.Status}}"
node scripts/test-api-db-connection.js

# Stage 3: Frontend Integration
cd apps/frontend && npm run dev
# Manual testing of auth and user management

# Stage 4: Production Validation
curl http://localhost:8080/api/health
# Manual testing of all routes and error scenarios
```

---

## **SUCCESS DEFINITION**

✅ **COMPLETE RECOVERY ACHIEVED WHEN:**
1. All CSV data loaded and visible in Supabase Studio
2. Authentication works without "invalid credentials"
3. User management creates/deletes users in Supabase Auth
4. All API endpoints respond correctly via Caddy
5. Frontend displays all data properly
6. No CORS, connectivity, or authentication errors

This plan ensures every layer is solid before building on top of it.
