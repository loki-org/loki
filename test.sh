#!/usr/bin/env bash

echo "Building..."
echo "  c"
node cli/loki.js c examples/foo.lo
echo "  ts"
node cli/loki.js ts examples/foo.lo

echo "Checking results..."
cd out
echo "  c"
gcc -shared foo.c
echo "  ts"
npx tsc foo.ts
