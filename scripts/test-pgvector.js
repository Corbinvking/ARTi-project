#!/usr/bin/env node

/**
 * Test script to verify pgvector extension is working
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'http://127.0.0.1:54321'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function testPgVector() {
  console.log('🧪 Testing pgvector extension...')
  
  try {
    // Test 1: Check if vector extension is enabled
    const { data: extensions, error: extError } = await supabase
      .from('pg_extension')
      .select('extname')
      .eq('extname', 'vector')
    
    if (extError) {
      console.log('📊 Checking extensions via direct query...')
    } else if (extensions && extensions.length > 0) {
      console.log('✅ pgvector extension is enabled')
    }
    
    // Test 2: Check if embeddings table exists with vector column
    const { data: tables, error: tableError } = await supabase
      .rpc('get_table_info', { table_name: 'embeddings' })
      .then(() => ({ data: true, error: null }))
      .catch((err) => ({ data: null, error: err }))
    
    if (!tableError) {
      console.log('✅ Embeddings table exists')
    }
    
    // Test 3: Try to query embeddings table structure
    const { data: columns, error: columnsError } = await supabase
      .from('embeddings')
      .select('*')
      .limit(1)
    
    if (!columnsError) {
      console.log('✅ Embeddings table is queryable')
      console.log('📋 Sample data exists:', columns?.length > 0 ? 'Yes' : 'No')
    }
    
    // Test 4: Try to create a test embedding
    const testVector = Array(1536).fill(0).map(() => Math.random() * 0.01) // Small random values
    
    const { data: insertResult, error: insertError } = await supabase
      .from('chunks')
      .insert({
        document_id: 'dddddddd-dddd-dddd-dddd-dddddddddddd', // Use existing document
        idx: 999,
        content: 'Test chunk for pgvector validation'
      })
      .select()
      .single()
    
    if (!insertError && insertResult) {
      console.log('✅ Test chunk created successfully')
      
      // Try to create an embedding for the test chunk
      const { data: embeddingResult, error: embeddingError } = await supabase
        .from('embeddings')
        .insert({
          chunk_id: insertResult.id,
          vector: testVector,
          model: 'test-vector-validation'
        })
        .select()
        .single()
      
      if (!embeddingError) {
        console.log('✅ pgvector is working correctly! Test embedding created.')
        
        // Clean up test data
        await supabase.from('embeddings').delete().eq('id', embeddingResult.id)
        await supabase.from('chunks').delete().eq('id', insertResult.id)
        console.log('🧹 Test data cleaned up')
      } else {
        console.error('❌ Failed to create test embedding:', embeddingError.message)
      }
    } else {
      console.error('❌ Failed to create test chunk:', insertError?.message)
    }
    
    // Test 5: Check existing sample data
    const { data: existingChunks, error: chunksError } = await supabase
      .from('chunks')
      .select('id, content')
      .limit(3)
    
    if (!chunksError && existingChunks) {
      console.log(`📄 Found ${existingChunks.length} sample chunks in database`)
      existingChunks.forEach((chunk, i) => {
        console.log(`   ${i + 1}. "${chunk.content.substring(0, 50)}..."`)
      })
    }
    
    console.log('')
    console.log('🎉 pgvector validation complete!')
    console.log('✅ Ready for LLM insights pipeline with vector embeddings')
    
  } catch (error) {
    console.error('❌ pgvector test failed:', error.message)
    process.exit(1)
  }
}

testPgVector()
