import { NextRequest, NextResponse } from "next/server";
import { scrapeAll, scrapeDate } from "@/lib/scraper";

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-scrape-secret");
  if (secret !== process.env.SCRAPE_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const date = body.date as string | undefined;

    const result = date ? await scrapeDate(date) : await scrapeAll();
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    console.error("Scrape error:", e);
    return NextResponse.json({ error: "Scrape failed" }, { status: 500 });
  }
}
