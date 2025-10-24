#!/usr/bin/env python3
"""
Split the large SQL import file into smaller chunks for Supabase Studio
"""

from pathlib import Path

def split_sql_file():
    """Split IMPORT-SCRAPED-DATA.sql into smaller chunks"""
    
    input_file = Path('IMPORT-SCRAPED-DATA.sql')
    if not input_file.exists():
        print(f"❌ File not found: {input_file}")
        return
    
    with open(input_file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Split by campaign blocks
    blocks = content.split('-- ============================================================')
    
    output_dir = Path('sql_chunks')
    output_dir.mkdir(exist_ok=True)
    
    # Header
    header = blocks[0]
    
    # Process each campaign block (10 campaigns per file)
    campaigns_per_file = 10
    campaign_blocks = [b for b in blocks[1:] if b.strip()]
    
    for i in range(0, len(campaign_blocks), campaigns_per_file):
        chunk_blocks = campaign_blocks[i:i + campaigns_per_file]
        chunk_num = (i // campaigns_per_file) + 1
        
        chunk_content = header + '\n\n'
        for block in chunk_blocks:
            chunk_content += '-- ============================================================' + block
        
        chunk_file = output_dir / f'import_chunk_{chunk_num:02d}.sql'
        with open(chunk_file, 'w', encoding='utf-8') as f:
            f.write(chunk_content)
        
        print(f"✅ Created: {chunk_file} ({len(chunk_blocks)} campaigns)")
    
    print(f"\n🎉 Split into {len(list(output_dir.glob('*.sql')))} files")
    print(f"📁 Location: {output_dir}")
    print(f"\n🚀 Upload these to production and run each one:")
    print(f"   psql <connection_string> -f sql_chunks/import_chunk_01.sql")

if __name__ == '__main__':
    split_sql_file()

