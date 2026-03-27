#!/bin/bash
# Triggered by Railway cron — scrapes all venues then enriches new comedians
export PATH="/usr/local/bin:/usr/bin:/bin:$PATH"
cd /app

# Scrape all venues
node_modules/.bin/tsx scripts/scrape.ts 2>&1

# Enrich any new comedians missing bios
node_modules/.bin/tsx scripts/enrich.ts 2>&1
