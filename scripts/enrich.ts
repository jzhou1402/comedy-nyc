/**
 * Enrich comedian profiles with bios.
 *
 * Usage:
 *   OPENAI_API_KEY=sk-... npx tsx scripts/enrich.ts
 *
 * Options:
 *   --force    Re-generate bios even for comedians that already have one
 *   --limit N  Only process N comedians
 */
import Database from "better-sqlite3";
import path from "path";
import OpenAI from "openai";

const db = new Database(path.join(process.cwd(), "comedy.db"));
db.pragma("journal_mode = WAL");

// Ensure bio column exists
const cols = db.prepare("PRAGMA table_info(comedians)").all() as { name: string }[];
if (!cols.some((c) => c.name === "bio")) {
  db.exec("ALTER TABLE comedians ADD COLUMN bio TEXT");
}

const client = new OpenAI();

const args = process.argv.slice(2);
const force = args.includes("--force");
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
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; ComedyNYC/1.0)",
        },
      }
    );
    const html = await res.text();
    const snippets: string[] = [];
    const regex = /class="result__snippet"[^>]*>(.*?)<\//gs;
    let match;
    while ((match = regex.exec(html)) !== null) {
      snippets.push(match[1].replace(/<[^>]+>/g, "").trim());
    }
    return snippets.slice(0, 5).join("\n") || "No search results found.";
  } catch {
    return "Search failed.";
  }
}

async function generateBio(comedian: Comedian, searchResults: string): Promise<string> {
  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    max_tokens: 300,
    messages: [
      {
        role: "user",
        content: `Write a fun, punchy 2-3 sentence bio for comedian ${comedian.name} who performs at the Comedy Cellar in NYC.

Known credits: ${comedian.credits || "none listed"}
Website: ${comedian.website_url || "none"}

Here's what I found about them online:
${searchResults}

Rules:
- Be playful and engaging, like a comedy show intro
- Mention their most notable credit or achievement if known
- If you can't find much info, write something witty based on what little we know
- Do NOT make up specific credits, shows, or awards — only reference things from the search results
- Keep it to 2-3 sentences max
- No quotes around the bio`,
      },
    ],
  });

  return response.choices[0]?.message?.content?.trim() ?? "";
}

async function main() {
  let query = `SELECT * FROM comedians`;
  if (!force) query += ` WHERE bio IS NULL OR bio = ''`;
  query += ` ORDER BY name`;
  if (limit) query += ` LIMIT ${limit}`;

  const comedians = db.prepare(query).all() as Comedian[];
  console.log(`Enriching ${comedians.length} comedians...`);

  const updateBio = db.prepare("UPDATE comedians SET bio = ?, updated_at = datetime('now') WHERE id = ?");

  for (let i = 0; i < comedians.length; i++) {
    const c = comedians[i];
    console.log(`[${i + 1}/${comedians.length}] ${c.name}...`);

    try {
      const searchResults = await searchWeb(`${c.name} comedian`);
      await new Promise((r) => setTimeout(r, 500));
      const bio = await generateBio(c, searchResults);
      updateBio.run(bio, c.id);
      console.log(`  -> ${bio.substring(0, 80)}...`);
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
