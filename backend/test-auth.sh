#!/bin/bash
BASE_URL="http://localhost:5001/api"

echo "Test 1: No Authorization header"
curl -s -X GET "$BASE_URL/orders" | grep "Authentication required" > /dev/null && echo "✅ Passed" || echo "❌ Failed"

echo "Test 2: Invalid Firebase token"
curl -s -X GET "$BASE_URL/orders" -H "Authorization: Bearer invalidtoken" | grep "Authentication required" > /dev/null && echo "✅ Passed" || echo "❌ Failed"

echo "Test 3: Missing Role (401)"
curl -s -X POST "$BASE_URL/orders" -H "Authorization: Bearer test" | grep "Authentication required" > /dev/null && echo "✅ Passed" || echo "❌ Failed"
