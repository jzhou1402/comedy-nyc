import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET() {
  const db = getDb();
  const dates = db.prepare(`
    SELECT DISTINCT date FROM shows
    WHERE date >= date('now')
    ORDER BY date
  `).all() as { date: string }[];

  return NextResponse.json(dates.map((d) => d.date));
}
