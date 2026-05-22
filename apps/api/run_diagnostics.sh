#!/bin/sh
# Run all diagnostic scripts

echo "=========================================="
echo "RUNNING ALL DIAGNOSTICS"
echo "=========================================="

echo "\n1. CHECKING DATABASE DATA..."
python check_data.py

echo "\n2. TESTING API ENDPOINTS..."
python test_api.py

echo "\n3. RUNNING SYSTEM DIAGNOSTICS..."
python diagnose.py

echo "\n=========================================="
echo "DIAGNOSTICS COMPLETE"
echo "=========================================="
