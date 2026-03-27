#!/bin/bash
# Daily scrape cron job for Comedy.NYC
export PATH="/Users/johnzhou/.nvm/versions/node/v24.14.0/bin:$PATH"
cd /Users/johnzhou/comedy.nyc
npx tsx scripts/scrape.ts >> /Users/johnzhou/comedy.nyc/logs/scrape.log 2>&1
echo "------- $(date) -------" >> /Users/johnzhou/comedy.nyc/logs/scrape.log
