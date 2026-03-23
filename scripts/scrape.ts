/**
 * Standalone scrape script. Run with:
 *   npx tsx scripts/scrape.ts
 *
 * Or trigger via API:
 *   curl -X POST http://localhost:3000/api/scrape -H "x-scrape-secret: YOUR_SECRET"
 */
import { scrapeAll } from "../src/lib/scraper";

async function main() {
  console.log("Starting scrape...");
  const result = await scrapeAll();
  console.log(`Done! ${result.showCount} shows, ${result.comedianCount} comedians.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
