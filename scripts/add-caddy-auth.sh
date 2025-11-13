#!/bin/bash
# Script to add HTTP Basic Authentication to Supabase Studio

echo "Adding HTTP Basic Authentication to db.artistinfluence.com..."

# Backup the current file
cp /root/arti-marketing-ops/caddy/Caddyfile.production /root/arti-marketing-ops/caddy/Caddyfile.production.pre-auth

# Use awk to insert the basicauth block
awk '/^db.artistinfluence.com \{$/{
    print $0
    print "    # HTTP Basic Authentication (Username: admin, Password: ArtistInfluence2025!)"
    print "    basicauth {"
    print "        admin $2a$14$lkjyVobdbpE0i9HS8Ug9zO/HeR.BEi.OpxG5HVzHB.jQ0MjIEjNMK"
    print "    }"
    print ""
    next
}
{print}' /root/arti-marketing-ops/caddy/Caddyfile.production.pre-auth > /root/arti-marketing-ops/caddy/Caddyfile.production

# Validate the Caddyfile
docker exec supabase_caddy_arti-marketing-ops caddy validate --config /etc/caddy/Caddyfile

if [ $? -eq 0 ]; then
    echo "✅ Caddyfile validation successful!"
    echo "Restarting Caddy..."
    docker restart supabase_caddy_arti-marketing-ops
    echo "✅ Authentication added! Login credentials:"
    echo "   Username: admin"
    echo "   Password: ArtistInfluence2025!"
else
    echo "❌ Caddyfile validation failed! Restoring backup..."
    cp /root/arti-marketing-ops/caddy/Caddyfile.production.pre-auth /root/arti-marketing-ops/caddy/Caddyfile.production
    docker restart supabase_caddy_arti-marketing-ops
fi

