#!/usr/bin/env bash

# FILE="foo"
FILE="ms_ovba"

echo "Building..."
echo "  c"
node cli/loki.js c examples/$FILE.lo
echo "  ts"
node cli/loki.js ts examples/$FILE.lo

echo "Checking results..."
cd out
echo "  c"
gcc -shared $FILE.c
echo "  ts"
npx tsc $FILE.ts
