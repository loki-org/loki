#!/usr/bin/env bash

set -e

# FILE="foo"
FILE="ms_ovba"

echo "lo - ts"
node cli/loki.js -b ts examples/$FILE.lo
echo "tsc"
npx tsc --lib dom,es2015 --module es2015 --skipLibCheck out/$FILE.ts
mv out/$FILE.js out/${FILE}2.js

echo "lo -js"
node cli/loki.js -b js examples/$FILE.lo
