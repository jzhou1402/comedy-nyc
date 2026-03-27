import { NextRequest, NextResponse } from "next/server";
import { scrapeAll } from "@/lib/scraper";
import { scrapeTheStand } from "@/lib/scraper-thestand";
import { scrapeNYCC } from "@/lib/scraper-nycc";

export const maxDuration = 300; // 5 minutes

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (!process.env.SCRAPE_SECRET || secret !== process.env.SCRAPE_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results: Record<string, any> = {};

  try {
    results.cellar = await scrapeAll();
  } catch (e) {
    results.cellar = { error: String(e) };
  }

  try {
    results.thestand = await scrapeTheStand();
  } catch (e) {
    results.thestand = { error: String(e) };
  }

  try {
    results.nycc = await scrapeNYCC();
  } catch (e) {
    results.nycc = { error: String(e) };
  }

  return NextResponse.json({ ok: true, results, timestamp: new Date().toISOString() });
}
