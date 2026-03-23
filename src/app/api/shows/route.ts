import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET(req: NextRequest) {
  const date = req.nextUrl.searchParams.get("date");
  const db = getDb();

  let shows;
  if (date) {
    shows = db.prepare(`
      SELECT s.*, GROUP_CONCAT(c.id) as comedian_ids,
             GROUP_CONCAT(c.name, '||') as comedian_names,
             GROUP_CONCAT(COALESCE(c.credits, ''), '||') as comedian_credits,
             GROUP_CONCAT(COALESCE(c.headshot_url, ''), '||') as comedian_headshots
      FROM shows s
      LEFT JOIN show_comedians sc ON sc.show_id = s.id
      LEFT JOIN comedians c ON c.id = sc.comedian_id
      WHERE s.date = ?
      GROUP BY s.id
      ORDER BY s.time
    `).all(date);
  } else {
    shows = db.prepare(`
      SELECT s.*, GROUP_CONCAT(c.id) as comedian_ids,
             GROUP_CONCAT(c.name, '||') as comedian_names,
             GROUP_CONCAT(COALESCE(c.credits, ''), '||') as comedian_credits,
             GROUP_CONCAT(COALESCE(c.headshot_url, ''), '||') as comedian_headshots
      FROM shows s
      LEFT JOIN show_comedians sc ON sc.show_id = s.id
      LEFT JOIN comedians c ON c.id = sc.comedian_id
      WHERE s.date >= date('now')
      GROUP BY s.id
      ORDER BY s.date, s.time
    `).all();
  }

  const formatted = shows.map((s: any) => ({
    id: s.id,
    date: s.date,
    time: s.time,
    venue_room: s.venue_room,
    lineup_id: s.lineup_id,
    reservation_url: s.reservation_url,
    comedians: s.comedian_ids
      ? s.comedian_ids.split(",").map((id: string, i: number) => ({
          id: parseInt(id),
          name: (s.comedian_names ?? "").split("||")[i] ?? "",
          credits: (s.comedian_credits ?? "").split("||")[i] ?? "",
          headshot_url: (s.comedian_headshots ?? "").split("||")[i] ?? "",
        }))
      : [],
  }));

  return NextResponse.json(formatted);
}
