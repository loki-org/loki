#!/usr/bin/env bash

set -e

# FILE="foo"
FILE="ms_ovba"

echo "Compiling loki to..."
echo "  c"
node cli/loki.js c examples/$FILE.lo
echo "  ts"
node cli/loki.js ts examples/$FILE.lo

echo "Compiling native..."
cd out
echo "  c"
gcc -I ../lib -shared $FILE.c
echo "  ts"
npx tsc $FILE.ts
