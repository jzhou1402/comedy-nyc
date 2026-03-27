/**
 * Standalone scrape script. Run with:
 *   npx tsx scripts/scrape.ts
 *   npx tsx scripts/scrape.ts --cellar      (Comedy Cellar only)
 *   npx tsx scripts/scrape.ts --thestand    (The Stand only)
 *   npx tsx scripts/scrape.ts --nycc        (New York Comedy Club only)
 */
import { scrapeAll } from "../src/lib/scraper";
import { scrapeTheStand } from "../src/lib/scraper-thestand";
import { scrapeNYCC } from "../src/lib/scraper-nycc";

async function main() {
  const args = process.argv.slice(2);
  const specific = args.some((a) => a.startsWith("--"));
  const all = !specific;

  if (all || args.includes("--cellar")) {
    console.log("Scraping Comedy Cellar...");
    const result = await scrapeAll();
    console.log(`Comedy Cellar: ${result.showCount} shows, ${result.comedianCount} comedians.`);
  }

  if (all || args.includes("--thestand")) {
    console.log("Scraping The Stand...");
    const result = await scrapeTheStand();
    console.log(`The Stand: ${result.showCount} shows, ${result.comedianCount} comedians.`);
  }

  if (all || args.includes("--nycc")) {
    console.log("Scraping New York Comedy Club...");
    const result = await scrapeNYCC();
    console.log(`NYCC: ${result.showCount} shows, ${result.comedianCount} comedians.`);
  }

  console.log("Done!");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
