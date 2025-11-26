#!/bin/bash
# Re-run verification after Flask has fully started

echo "Waiting 5 seconds for Flask to fully start..."
sleep 5

echo ""
echo "Running Ratio Fixer verification..."
echo ""

bash ~/arti-marketing-ops/verify-ratio-fixer-complete.sh

