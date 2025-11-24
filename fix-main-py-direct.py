#!/usr/bin/env python3
"""
Direct fix for main.py syntax error
Removes incorrectly placed CORS import and adds it in the correct location
"""

import sys
import re

def fix_main_py(file_path):
    with open(file_path, 'r') as f:
        lines = f.readlines()
    
    new_lines = []
    cors_import_removed = False
    cors_import_added = False
    
    for i, line in enumerate(lines):
        # Remove incorrectly placed CORS import (shouldn't be in first 20 lines)
        if 'from flask_cors import CORS' in line and i < 20:
            print(f"Removing incorrectly placed CORS import at line {i+1}")
            cors_import_removed = True
            continue
        
        new_lines.append(line)
        
        # Add CORS import after flask_sqlalchemy (around line 17)
        if 'from flask_sqlalchemy import SQLAlchemy' in line and not cors_import_added:
            new_lines.append('from flask_cors import CORS\n')
            print(f"Adding CORS import after line {i+1}")
            cors_import_added = True
    
    # Join and check for CORS initialization
    content = ''.join(new_lines)
    
    # Add CORS initialization if missing
    if 'CORS(app' not in content:
        content = content.replace(
            'app = Flask(__name__, template_folder="templates")',
            'app = Flask(__name__, template_folder="templates")\nCORS(app, resources={r"/api/*": {"origins": "*"}})'
        )
        print("Added CORS initialization")
    
    # Write back
    with open(file_path, 'w') as f:
        f.write(content)
    
    print(f"✅ Fixed {file_path}")
    return True

if __name__ == '__main__':
    file_path = sys.argv[1] if len(sys.argv) > 1 else 'main.py'
    fix_main_py(file_path)

