import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET(req: NextRequest) {
  const db = getDb();
  const search = req.nextUrl.searchParams.get("q");

  let comedians;
  if (search) {
    comedians = db.prepare(`
      SELECT c.*, COUNT(DISTINCT sc.show_id) as show_count
      FROM comedians c
      LEFT JOIN show_comedians sc ON sc.comedian_id = c.id
      WHERE c.name LIKE ?
      GROUP BY c.id
      ORDER BY show_count DESC, c.name
    `).all(`%${search}%`);
  } else {
    comedians = db.prepare(`
      SELECT c.*, COUNT(DISTINCT sc.show_id) as show_count
      FROM comedians c
      LEFT JOIN show_comedians sc ON sc.comedian_id = c.id
      GROUP BY c.id
      ORDER BY show_count DESC, c.name
    `).all();
  }

  return NextResponse.json(comedians);
}
