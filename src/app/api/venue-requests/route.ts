import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { auth } from "@/lib/auth";
import OpenAI from "openai";

export async function POST(req: NextRequest) {
  const { input } = await req.json();
  if (!input || typeof input !== "string" || input.trim().length < 2) {
    return NextResponse.json({ error: "Please enter a venue name" }, { status: 400 });
  }

  const session = await auth();
  const db = getDb();

  let userId: number | null = null;
  if (session?.user?.email) {
    const user = db.prepare("SELECT id FROM users WHERE email = ?").get(session.user.email) as { id: number } | undefined;
    userId = user?.id ?? null;
  }

  // Check for duplicate raw input
  const existing = db.prepare(
    "SELECT id FROM venue_requests WHERE raw_input = ? AND created_at > datetime('now', '-7 days')"
  ).get(input.trim());
  if (existing) {
    return NextResponse.json({ ok: true, message: "We already have this request. Thanks!" });
  }

  // Normalize with LLM
  let normalized = { name: input.trim(), address: null as string | null, website: null as string | null };

  if (process.env.OPENAI_API_KEY) {
    try {
      const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const response = await client.chat.completions.create({
        model: "gpt-4o-mini",
        max_tokens: 200,
        messages: [
          {
            role: "system",
            content: `You normalize comedy venue names in New York City. Given user input (which may be misspelled, abbreviated, or include extra info), return a JSON object with:
- "name": the official venue name
- "address": the full street address if you know it, or null
- "website": the venue's website URL if you know it, or null

Only return the JSON object, nothing else. If you don't recognize the venue, still clean up the name and return what you can.`,
          },
          {
            role: "user",
            content: input.trim(),
          },
        ],
      });

      const text = response.choices[0]?.message?.content?.trim() ?? "";
      const parsed = JSON.parse(text);
      if (parsed.name) normalized.name = parsed.name;
      if (parsed.address) normalized.address = parsed.address;
      if (parsed.website) normalized.website = parsed.website;
    } catch (e) {
      console.error("LLM normalization failed:", e);
    }
  }

  db.prepare(`
    INSERT INTO venue_requests (raw_input, normalized_name, normalized_address, normalized_website, user_id)
    VALUES (?, ?, ?, ?, ?)
  `).run(input.trim(), normalized.name, normalized.address, normalized.website, userId);

  return NextResponse.json({
    ok: true,
    message: `Thanks! We'll look into adding ${normalized.name}.`,
    normalized,
  });
}

export async function GET() {
  const db = getDb();
  const requests = db.prepare(`
    SELECT normalized_name, COUNT(*) as request_count
    FROM venue_requests
    GROUP BY normalized_name
    ORDER BY request_count DESC
    LIMIT 20
  `).all();
  return NextResponse.json(requests);
}
