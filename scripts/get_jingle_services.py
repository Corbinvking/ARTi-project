#!/usr/bin/env python3
"""Fetch JingleSMM services and find YouTube-related ones."""

import sys
sys.path.insert(0, '/opt/ratio-fixer')

from jingle_smm import JingleSMM
import json

api = JingleSMM()
services = api.services()

if isinstance(services, list):
    print(f'Total services: {len(services)}')
    
    # Find YouTube services  
    youtube_services = []
    for s in services:
        name = s.get('name', '').lower()
        category = s.get('category', '').lower()
        if 'youtube' in name or 'youtube' in category:
            youtube_services.append(s)
    
    print(f'\n=== YouTube Services ({len(youtube_services)}) ===\n')
    
    # Group by category
    categories = {}
    for s in youtube_services:
        cat = s.get('category', 'Unknown')
        if cat not in categories:
            categories[cat] = []
        categories[cat].append(s)
    
    for cat, svcs in sorted(categories.items()):
        print(f'\n--- {cat} ---')
        for s in svcs:
            service_type = s.get('type', 'Default')
            print(f"  ID {s['service']}: {s['name']}")
            print(f"     Type: {service_type}, Rate: ${s['rate']}, Min: {s['min']}, Max: {s['max']}")
else:
    print('Error:', services)

