#!/usr/bin/env ts-node

/**
 * Add Sample Creators to Database
 * 
 * This script adds realistic sample Instagram creators to the database
 * for testing and demonstration purposes.
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'http://localhost:54321';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseKey) {
  console.error('❌ Error: SUPABASE_SERVICE_ROLE_KEY environment variable is required');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const sampleCreators = [
  {
    instagram_handle: '@musiclover_sarah',
    email: 'sarah@example.com',
    base_country: 'United States',
    followers: 125000,
    median_views_per_video: 45000,
    engagement_rate: 4.2,
    content_types: ['Music Reviews', 'Artist Interviews', 'Live Performances'],
    music_genres: ['Pop', 'R&B', 'Hip Hop'],
    audience_territories: ['United States', 'Canada', 'United Kingdom'],
    reel_rate: 800,
    carousel_rate: 600,
    story_rate: 300,
    avg_performance_score: 8.5,
    campaign_fit_score: 0
  },
  {
    instagram_handle: '@indie_rock_dan',
    email: 'dan@example.com',
    base_country: 'United Kingdom',
    followers: 89000,
    median_views_per_video: 32000,
    engagement_rate: 3.8,
    content_types: ['Music News', 'Behind the Scenes', 'Cover Songs'],
    music_genres: ['Rock', 'Indie', 'Alternative'],
    audience_territories: ['United Kingdom', 'United States', 'Germany'],
    reel_rate: 600,
    carousel_rate: 450,
    story_rate: 200,
    avg_performance_score: 7.8,
    campaign_fit_score: 0
  },
  {
    instagram_handle: '@edm_queen_lisa',
    email: 'lisa@example.com',
    base_country: 'Netherlands',
    followers: 250000,
    median_views_per_video: 95000,
    engagement_rate: 5.1,
    content_types: ['Live Performances', 'Music Production', 'Tutorials'],
    music_genres: ['Electronic', 'EDM', 'House'],
    audience_territories: ['Netherlands', 'Germany', 'United States'],
    reel_rate: 1500,
    carousel_rate: 1200,
    story_rate: 500,
    avg_performance_score: 9.2,
    campaign_fit_score: 0
  },
  {
    instagram_handle: '@hiphop_central_mike',
    email: 'mike@example.com',
    base_country: 'United States',
    followers: 175000,
    median_views_per_video: 68000,
    engagement_rate: 4.5,
    content_types: ['Artist Interviews', 'Music Reviews', 'Reaction Videos'],
    music_genres: ['Hip Hop', 'Rap', 'R&B'],
    audience_territories: ['United States', 'Canada', 'United Kingdom'],
    reel_rate: 1000,
    carousel_rate: 800,
    story_rate: 400,
    avg_performance_score: 8.7,
    campaign_fit_score: 0
  },
  {
    instagram_handle: '@acoustic_soul_emma',
    email: 'emma@example.com',
    base_country: 'Australia',
    followers: 62000,
    median_views_per_video: 22000,
    engagement_rate: 3.2,
    content_types: ['Cover Songs', 'Music Production', 'Tutorials'],
    music_genres: ['Folk', 'Acoustic', 'Indie'],
    audience_territories: ['Australia', 'United States', 'United Kingdom'],
    reel_rate: 450,
    carousel_rate: 350,
    story_rate: 150,
    avg_performance_score: 7.2,
    campaign_fit_score: 0
  },
  {
    instagram_handle: '@latin_beats_carlos',
    email: 'carlos@example.com',
    base_country: 'Mexico',
    followers: 310000,
    median_views_per_video: 125000,
    engagement_rate: 5.8,
    content_types: ['Live Performances', 'Behind the Scenes', 'Collaborations'],
    music_genres: ['Latin', 'Reggaeton', 'Pop'],
    audience_territories: ['Mexico', 'United States', 'Colombia'],
    reel_rate: 1800,
    carousel_rate: 1500,
    story_rate: 600,
    avg_performance_score: 9.5,
    campaign_fit_score: 0
  },
  {
    instagram_handle: '@jazz_vibes_sophia',
    email: 'sophia@example.com',
    base_country: 'France',
    followers: 45000,
    median_views_per_video: 18000,
    engagement_rate: 2.9,
    content_types: ['Live Performances', 'Music News', 'Artist Interviews'],
    music_genres: ['Jazz', 'Blues', 'Soul'],
    audience_territories: ['France', 'United States', 'United Kingdom'],
    reel_rate: 350,
    carousel_rate: 280,
    story_rate: 120,
    avg_performance_score: 6.8,
    campaign_fit_score: 0
  },
  {
    instagram_handle: '@country_roads_jake',
    email: 'jake@example.com',
    base_country: 'United States',
    followers: 98000,
    median_views_per_video: 38000,
    engagement_rate: 3.5,
    content_types: ['Cover Songs', 'Live Performances', 'Behind the Scenes'],
    music_genres: ['Country', 'Folk', 'Americana'],
    audience_territories: ['United States', 'Canada', 'Australia'],
    reel_rate: 700,
    carousel_rate: 550,
    story_rate: 250,
    avg_performance_score: 7.5,
    campaign_fit_score: 0
  },
  {
    instagram_handle: '@kpop_insider_yuna',
    email: 'yuna@example.com',
    base_country: 'South Korea',
    followers: 520000,
    median_views_per_video: 210000,
    engagement_rate: 6.3,
    content_types: ['Music News', 'Reaction Videos', 'Behind the Scenes'],
    music_genres: ['K-Pop', 'Pop', 'Electronic'],
    audience_territories: ['South Korea', 'United States', 'Japan'],
    reel_rate: 2500,
    carousel_rate: 2000,
    story_rate: 800,
    avg_performance_score: 9.8,
    campaign_fit_score: 0
  },
  {
    instagram_handle: '@underground_techno_alex',
    email: 'alex@example.com',
    base_country: 'Germany',
    followers: 73000,
    median_views_per_video: 28000,
    engagement_rate: 3.4,
    content_types: ['Music Production', 'Tutorials', 'Live Performances'],
    music_genres: ['Techno', 'Electronic', 'House'],
    audience_territories: ['Germany', 'Netherlands', 'United Kingdom'],
    reel_rate: 550,
    carousel_rate: 420,
    story_rate: 180,
    avg_performance_score: 7.4,
    campaign_fit_score: 0
  }
];

async function addSampleCreators() {
  try {
    console.log('🚀 Starting to add sample creators to database...\n');

    // Check if creators already exist
    const { data: existingCreators, error: checkError } = await supabase
      .from('creators')
      .select('instagram_handle');

    if (checkError) {
      throw checkError;
    }

    const existingHandles = new Set(existingCreators?.map(c => c.instagram_handle) || []);
    console.log(`📊 Found ${existingCreators?.length || 0} existing creators in database`);

    // Filter out creators that already exist
    const creatorsToAdd = sampleCreators.filter(c => !existingHandles.has(c.instagram_handle));

    if (creatorsToAdd.length === 0) {
      console.log('✅ All sample creators already exist in database!');
      console.log('\n📊 Summary:');
      console.log(`   - Total creators in database: ${existingCreators?.length || 0}`);
      return;
    }

    console.log(`📝 Adding ${creatorsToAdd.length} new sample creators...\n`);

    // Insert new creators
    const { data: insertedCreators, error: insertError } = await supabase
      .from('creators')
      .insert(creatorsToAdd)
      .select();

    if (insertError) {
      throw insertError;
    }

    console.log('✅ Successfully added sample creators!\n');
    console.log('📊 Summary:');
    console.log(`   - Creators added: ${creatorsToAdd.length}`);
    console.log(`   - Total creators in database: ${(existingCreators?.length || 0) + creatorsToAdd.length}`);
    
    console.log('\n✨ Sample Creators Added:');
    creatorsToAdd.forEach((creator, index) => {
      console.log(`   ${index + 1}. ${creator.instagram_handle} - ${creator.followers.toLocaleString()} followers (${creator.base_country})`);
    });

    console.log('\n🎉 Done! You can now view these creators in the Creator Database page.');

  } catch (error: any) {
    console.error('❌ Error adding sample creators:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// Run the script
addSampleCreators();

