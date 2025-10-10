#!/usr/bin/env python3

import os
import json
import numpy as np
from sentence_transformers import SentenceTransformer
from supabase import create_client, Client
from typing import List, Dict, Any, Optional
from tqdm import tqdm
import time

# Initialize Supabase client
supabase_url = os.getenv("SUPABASE_URL", "http://localhost:54321")
supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not supabase_key:
    raise ValueError("SUPABASE_SERVICE_ROLE_KEY environment variable is required")

supabase: Client = create_client(supabase_url, supabase_key)

# Initialize the model (downloads it the first time)
print("🔄 Loading model...")
model = SentenceTransformer('BAAI/bge-large-en-v1.5')  # 1024-dimensional embeddings, better quality than MiniLM
print("✅ Model loaded!")

def create_campaign_search_content(campaign: Dict[str, Any]) -> str:
    """Create searchable content from campaign data."""
    parts = [
        campaign.get('name', ''),
        campaign.get('client_name', '') or campaign.get('client', ''),
        campaign.get('track_name', ''),
        campaign.get('notes', ''),
        ' '.join(campaign.get('music_genres', []) or []),
        ' '.join(campaign.get('territory_preferences', []) or []),
        ' '.join(campaign.get('content_types', []) or []),
    ]
    return ' '.join(filter(bool, parts)).strip()

def create_playlist_search_content(playlist: Dict[str, Any]) -> str:
    """Create searchable content from playlist data."""
    parts = [
        playlist.get('name', ''),
        ' '.join(playlist.get('genres', []) or []),
        playlist.get('description', ''),
    ]
    return ' '.join(filter(bool, parts)).strip()

def generate_embedding(text: str) -> List[float]:
    """Generate embedding for text using sentence-transformers."""
    # Encode the text and get the embedding
    embedding = model.encode(text, convert_to_tensor=False)  # Get as numpy array
    
    # Pad or truncate to 1536 dimensions
    if len(embedding) < 1536:
        # Pad with zeros
        embedding = np.pad(embedding, (0, 1536 - len(embedding)))
    elif len(embedding) > 1536:
        # Truncate
        embedding = embedding[:1536]
    
    return embedding.tolist()  # Convert to list for JSON serialization

def generate_embedding_for_content(content_type: str, content_id: str) -> None:
    """Generate embedding for specific content."""
    print(f"🔄 Generating embedding for {content_type} {content_id}...")

    try:
        content = ''
        metadata = {}

        if content_type == 'campaign':
            # Fetch campaign data
            response = supabase.table('stream_strategist_campaigns').select('*').eq('id', content_id).execute()
            if not response.data:
                raise ValueError(f"Campaign not found: {content_id}")
            
            campaign = response.data[0]
            content = create_campaign_search_content(campaign)
            metadata = {
                'name': campaign.get('name'),
                'client': campaign.get('client_name') or campaign.get('client'),
                'track_name': campaign.get('track_name'),
                'genres': campaign.get('music_genres'),
                'territories': campaign.get('territory_preferences'),
                'status': campaign.get('status'),
                'stream_goal': campaign.get('stream_goal'),
            }
        elif content_type == 'playlist':
            # Fetch playlist data
            response = supabase.table('playlists').select('*').eq('id', content_id).execute()
            if not response.data:
                raise ValueError(f"Playlist not found: {content_id}")
            
            playlist = response.data[0]
            content = create_playlist_search_content(playlist)
            metadata = {
                'name': playlist.get('name'),
                'genres': playlist.get('genres'),
                'url': playlist.get('url'),
                'avg_daily_streams': playlist.get('avg_daily_streams'),
            }
        else:
            raise ValueError(f"Unsupported content type: {content_type}")

        if not content.strip():
            print(f"⚠️ No searchable content found for {content_type} {content_id}")
            return

        # Generate embedding
        embedding = generate_embedding(content)

        # Store embedding in database
        response = supabase.table('content_embeddings').upsert({
            'content_type': content_type,
            'content_id': content_id,
            'content': content,
            'embedding': embedding,
            'metadata': metadata,
        }).execute()

        print(f"✅ Successfully generated embedding for {content_type} {content_id}")
        print(f"   Content length: {len(content)} characters")

    except Exception as e:
        print(f"❌ Failed to generate embedding for {content_type} {content_id}: {str(e)}")
        raise

def generate_all_embeddings(content_type: str) -> None:
    """Generate embeddings for all content of a specific type."""
    try:
        print(f"🔄 Generating embeddings for all {content_type}s...")

        # Get list of items that already have embeddings
        existing_response = supabase.table('content_embeddings').select('content_id').eq('content_type', content_type).execute()
        existing_ids = set(item['content_id'] for item in existing_response.data)

        # Get all items
        table_name = 'stream_strategist_campaigns' if content_type == 'campaign' else f"{content_type}s"
        response = supabase.table(table_name).select('id').execute()
        
        if not response.data:
            raise ValueError(f"No {content_type}s found")

        items_to_process = [item for item in response.data if item['id'] not in existing_ids]
        
        print(f"📊 Found {len(response.data)} total {content_type}s")
        print(f"ℹ️ {len(existing_ids)} items already have embeddings")
        print(f"📝 Processing {len(items_to_process)} remaining items")

        success_count = 0
        error_count = 0

        # Process in batches
        batch_size = 5
        for i in range(0, len(items_to_process), batch_size):
            batch = items_to_process[i:i + batch_size]
            print(f"\n🔄 Processing batch {i//batch_size + 1} of {(len(items_to_process) + batch_size - 1)//batch_size}...")

            for item in batch:
                try:
                    generate_embedding_for_content(content_type, item['id'])
                    success_count += 1
                except Exception as e:
                    error_count += 1
                    print(f"❌ Failed to process {content_type} {item['id']}: {str(e)}")

            # Wait between batches to avoid overwhelming the system
            if i + batch_size < len(items_to_process):
                print("⏳ Waiting 2 seconds before next batch...")
                time.sleep(2)

        print(f"\n📈 Generation Summary:")
        print(f"   ✅ Successful: {success_count}")
        print(f"   ❌ Failed: {error_count}")

    except Exception as e:
        print(f"❌ Failed to generate embeddings for {content_type}: {str(e)}")
        raise

def main():
    """Main execution function."""
    import argparse
    parser = argparse.ArgumentParser(description='Generate embeddings for content')
    parser.add_argument('--content-type', choices=['campaign', 'playlist'], required=True,
                      help='Type of content to generate embeddings for')
    parser.add_argument('--content-id', help='ID of specific content to process')
    parser.add_argument('--generate-all', action='store_true',
                      help='Generate embeddings for all content of specified type')
    args = parser.parse_args()

    print('🤖 Local Embedding Generator')
    print('========================')

    try:
        if args.generate_all:
            generate_all_embeddings(args.content_type)
        elif args.content_id:
            generate_embedding_for_content(args.content_type, args.content_id)
        else:
            print('❌ Either --content-id or --generate-all is required')
            parser.print_help()
            exit(1)

        print('🎉 Embedding generation completed!')

    except Exception as e:
        print('❌ Fatal error:', str(e))
        exit(1)

if __name__ == '__main__':
    main()
