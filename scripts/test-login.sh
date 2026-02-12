#!/bin/bash
# Test login directly against GoTrue auth endpoint
curl -s -X POST 'http://supabase_kong_arti-marketing-ops:8000/auth/v1/token?grant_type=password' \
  -H 'Content-Type: application/json' \
  -H 'apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
  -d '{"email":"luke@nolimitgroup.co","password":"tyYAktvtnLdg"}' 2>&1

echo ""
echo "---"

# Also test with a known working user
curl -s -X POST 'http://supabase_kong_arti-marketing-ops:8000/auth/v1/token?grant_type=password' \
  -H 'Content-Type: application/json' \
  -H 'apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
  -d '{"email":"admin@arti-demo.com","password":"admin123"}' 2>&1 | head -c 200
