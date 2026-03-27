import { NextRequest, NextResponse } from "next/server";
import { scrapeAll } from "@/lib/scraper";
import { scrapeTheStand } from "@/lib/scraper-thestand";
import { scrapeNYCC } from "@/lib/scraper-nycc";

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-scrape-secret");
  const expected = process.env.SCRAPE_SECRET;
  if (!expected || secret !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const venue = body.venue as string | undefined;

    const results: Record<string, any> = {};

    if (!venue || venue === "cellar") {
      results.cellar = await scrapeAll();
    }
    if (!venue || venue === "thestand") {
      results.thestand = await scrapeTheStand();
    }
    if (!venue || venue === "nycc") {
      results.nycc = await scrapeNYCC();
    }

    return NextResponse.json({ ok: true, results });
  } catch (e) {
    console.error("Scrape error:", e);
    return NextResponse.json({ error: "Scrape failed" }, { status: 500 });
  }
}
