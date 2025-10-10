const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Initialize clients
const supabaseUrl = process.env.SUPABASE_URL || 'http://localhost:54321';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseKey) {
    console.error('❌ Missing SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

console.log(`🔗 Connecting to Supabase at: ${supabaseUrl}`);
const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function testConnection() {
    try {
        console.log('🧪 Testing basic connection...');

        // Test basic query
        const { data: count, error: countError } = await supabase
            .from('campaigns')
            .select('count', { count: 'exact', head: true });

        if (countError) {
            console.error('❌ Error with count query:', countError);
            return;
        }

        console.log(`✅ Found ${count} campaigns`);

        // Test specific campaign
        const testId = '9ac53ba8-b482-4348-95f4-08ac76bfc048';
        const { data: campaign, error: campaignError } = await supabase
            .from('campaigns')
            .select('*')
            .eq('id', testId);

        if (campaignError) {
            console.error('❌ Error fetching specific campaign:', campaignError);
            return;
        }

        if (!campaign || campaign.length === 0) {
            console.error('❌ Campaign not found:', testId);
            return;
        }

        console.log(`✅ Successfully fetched campaign: ${campaign[0].name}`);
        console.log(`📊 Content for embedding: "${campaign[0].name} ${campaign[0].client || ''} ${campaign[0].track_name || ''}"`);

    } catch (error) {
        console.error('❌ Connection test failed:', error);
    }
}

testConnection();
