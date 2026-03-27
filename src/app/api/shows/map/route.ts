import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET(req: NextRequest) {
  const days = parseInt(req.nextUrl.searchParams.get("days") ?? "7");
  const db = getDb();

  const shows = db.prepare(`
    SELECT s.id, s.date, s.time, s.venue_room, s.venue, s.reservation_url,
           GROUP_CONCAT(c.id) as comedian_ids,
           GROUP_CONCAT(c.name, '||') as comedian_names,
           GROUP_CONCAT(COALESCE(c.headshot_url, ''), '||') as comedian_headshots
    FROM shows s
    LEFT JOIN show_comedians sc ON sc.show_id = s.id
    LEFT JOIN comedians c ON c.id = sc.comedian_id
    WHERE s.date >= date('now') AND s.date <= date('now', '+' || ? || ' days')
    GROUP BY s.id
    ORDER BY s.date, s.time
  `).all(days);

  const formatted = shows.map((s: any) => ({
    id: s.id,
    date: s.date,
    time: s.time,
    venue_room: s.venue_room,
    venue: s.venue ?? "Comedy Cellar",
    reservation_url: s.reservation_url,
    comedians: s.comedian_ids
      ? s.comedian_ids.split(",").map((id: string, i: number) => ({
          id: parseInt(id),
          name: (s.comedian_names ?? "").split("||")[i] ?? "",
          headshot_url: (s.comedian_headshots ?? "").split("||")[i] ?? "",
        }))
      : [],
  }));

  return NextResponse.json(formatted);
}
