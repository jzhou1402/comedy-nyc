import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();

  const comedian = db.prepare(`
    SELECT c.*, COUNT(DISTINCT sc.show_id) as show_count
    FROM comedians c
    LEFT JOIN show_comedians sc ON sc.comedian_id = c.id
    WHERE c.id = ?
    GROUP BY c.id
  `).get(id);

  if (!comedian) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const upcoming = db.prepare(`
    SELECT s.id, s.date, s.time, s.venue_room, s.reservation_url
    FROM shows s
    JOIN show_comedians sc ON sc.show_id = s.id
    WHERE sc.comedian_id = ? AND s.date >= date('now')
    ORDER BY s.date, s.time
  `).all(id);

  return NextResponse.json({ ...comedian as any, upcoming_shows: upcoming });
}
