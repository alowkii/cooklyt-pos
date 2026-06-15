#!/usr/bin/env bash
# /var/www/krilok-pos/deploy.sh
set -euo pipefail
cd /var/www/krilok-pos
git fetch origin && git reset --hard origin/master
cd backend && node_modules/.bin/node-pg-migrate up && npm ci --omit=dev && systemctl restart krilok-pos-api
cd /var/www/krilok-pos
for d in dashboard admin menu; do ( cd "$d" && npm ci && npm run build ); done
