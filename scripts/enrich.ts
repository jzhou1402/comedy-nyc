/**
 * Enrich comedian profiles with bios and social links.
 *
 * Usage:
 *   OPENAI_API_KEY=sk-... npx tsx scripts/enrich.ts
 *
 * Options:
 *   --force    Re-generate even for comedians that already have a bio
 *   --limit N  Only process N comedians
 */
import Database from "better-sqlite3";
import path from "path";
import OpenAI from "openai";

const db = new Database(path.join(process.cwd(), "comedy.db"));
db.pragma("journal_mode = WAL");

// Ensure columns exist
for (const col of ["bio", "instagram_url", "twitter_url", "tiktok_url", "youtube_url"]) {
  const cols = db.prepare("PRAGMA table_info(comedians)").all() as { name: string }[];
  if (!cols.some((c) => c.name === col)) {
    db.exec(`ALTER TABLE comedians ADD COLUMN ${col} TEXT`);
  }
}

const client = new OpenAI();

const args = process.argv.slice(2);
const force = args.includes("--force");
const socialsOnly = args.includes("--socials-only");
const limitIdx = args.indexOf("--limit");
const limit = limitIdx !== -1 ? parseInt(args[limitIdx + 1]) : undefined;

interface Comedian {
  id: number;
  name: string;
  credits: string | null;
  website_url: string | null;
  bio: string | null;
}

async function searchWeb(query: string): Promise<string> {
  try {
    const res = await fetch(
      `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`,
      { headers: { "User-Agent": "Mozilla/5.0 (compatible; ComedyNYC/1.0)" } }
    );
    const html = await res.text();
    const snippets: string[] = [];
    // Extract snippets
    const snippetRegex = /class="result__snippet"[^>]*>(.*?)<\//gs;
    let match;
    while ((match = snippetRegex.exec(html)) !== null) {
      snippets.push(match[1].replace(/<[^>]+>/g, "").trim());
    }
    // Extract URLs for social links
    const urls: string[] = [];
    const urlRegex = /class="result__url"[^>]*>(.*?)<\//gs;
    while ((match = urlRegex.exec(html)) !== null) {
      urls.push(match[1].replace(/<[^>]+>/g, "").trim());
    }
    return [...snippets.slice(0, 5), "\nURLs found:", ...urls.slice(0, 10)].join("\n") || "No results.";
  } catch {
    return "Search failed.";
  }
}

interface EnrichResult {
  bio: string;
  instagram: string | null;
  twitter: string | null;
  tiktok: string | null;
  youtube: string | null;
}

async function enrichComedian(comedian: Comedian, searchResults: string): Promise<EnrichResult> {
  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    max_tokens: 400,
    messages: [
      {
        role: "system",
        content: `You enrich comedian profiles. Return a JSON object with these fields:
- "bio": A fun, punchy 2-3 sentence bio. Be playful like a comedy show intro. Only reference real credits from the search results — do NOT make up awards or shows.
- "instagram": Full Instagram URL if found in search results, or null
- "twitter": Full Twitter/X URL if found, or null
- "tiktok": Full TikTok URL if found, or null
- "youtube": Full YouTube URL if found, or null

Only return the JSON object, nothing else.`,
      },
      {
        role: "user",
        content: `Comedian: ${comedian.name}
Known credits: ${comedian.credits || "none listed"}
Website: ${comedian.website_url || "none"}

Search results:
${searchResults}`,
      },
    ],
  });

  const text = response.choices[0]?.message?.content?.trim() ?? "{}";
  try {
    const parsed = JSON.parse(text);
    return {
      bio: parsed.bio ?? "",
      instagram: parsed.instagram ?? null,
      twitter: parsed.twitter ?? null,
      tiktok: parsed.tiktok ?? null,
      youtube: parsed.youtube ?? null,
    };
  } catch {
    return { bio: text, instagram: null, twitter: null, tiktok: null, youtube: null };
  }
}

async function main() {
  let query = `SELECT * FROM comedians`;
  if (socialsOnly) {
    query += ` WHERE instagram_url IS NULL AND twitter_url IS NULL AND tiktok_url IS NULL AND youtube_url IS NULL`;
  } else if (!force) {
    query += ` WHERE bio IS NULL OR bio = ''`;
  }
  query += ` ORDER BY name`;
  if (limit) query += ` LIMIT ${limit}`;

  const comedians = db.prepare(query).all() as Comedian[];
  console.log(`Enriching ${comedians.length} comedians...`);

  const update = db.prepare(`
    UPDATE comedians SET
      bio = COALESCE(NULLIF(?, ''), bio),
      instagram_url = COALESCE(?, instagram_url),
      twitter_url = COALESCE(?, twitter_url),
      tiktok_url = COALESCE(?, tiktok_url),
      youtube_url = COALESCE(?, youtube_url),
      updated_at = datetime('now')
    WHERE id = ?
  `);

  for (let i = 0; i < comedians.length; i++) {
    const c = comedians[i];
    console.log(`[${i + 1}/${comedians.length}] ${c.name}...`);

    try {
      const searchResults = await searchWeb(`${c.name} comedian instagram twitter`);
      await new Promise((r) => setTimeout(r, 500));
      const result = await enrichComedian(c, searchResults);
      update.run(result.bio, result.instagram, result.twitter, result.tiktok, result.youtube, c.id);

      const socials = [result.instagram, result.twitter, result.tiktok, result.youtube].filter(Boolean);
      console.log(`  -> ${result.bio.substring(0, 70)}...`);
      if (socials.length) console.log(`  -> Socials: ${socials.join(", ")}`);
    } catch (e) {
      console.error(`  x Failed: ${e}`);
    }

    await new Promise((r) => setTimeout(r, 300));
  }

  console.log("Done!");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
