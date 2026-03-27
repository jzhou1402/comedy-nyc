import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getDb } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const db = getDb();
  const user = db.prepare("SELECT id FROM users WHERE email = ?").get(session.user.email) as { id: number } | undefined;
  if (!user) return NextResponse.json([]);

  const tab = req.nextUrl.searchParams.get("tab") ?? "upcoming";

  let shows;
  if (tab === "past") {
    shows = db.prepare(`
      SELECT us.status, us.created_at as rsvp_at,
             s.id, s.date, s.time, s.venue_room, COALESCE(s.venue, 'Comedy Cellar') as venue, s.reservation_url,
             GROUP_CONCAT(c.id) as comedian_ids,
             GROUP_CONCAT(c.name, '||') as comedian_names
      FROM user_shows us
      JOIN shows s ON s.id = us.show_id
      LEFT JOIN show_comedians sc ON sc.show_id = s.id
      LEFT JOIN comedians c ON c.id = sc.comedian_id
      WHERE us.user_id = ? AND s.date < date('now')
      GROUP BY s.id
      ORDER BY s.date DESC, s.time DESC
    `).all(user.id);
  } else {
    shows = db.prepare(`
      SELECT us.status, us.created_at as rsvp_at,
             s.id, s.date, s.time, s.venue_room, COALESCE(s.venue, 'Comedy Cellar') as venue, s.reservation_url,
             GROUP_CONCAT(c.id) as comedian_ids,
             GROUP_CONCAT(c.name, '||') as comedian_names
      FROM user_shows us
      JOIN shows s ON s.id = us.show_id
      LEFT JOIN show_comedians sc ON sc.show_id = s.id
      LEFT JOIN comedians c ON c.id = sc.comedian_id
      WHERE us.user_id = ? AND s.date >= date('now')
      GROUP BY s.id
      ORDER BY s.date, s.time
    `).all(user.id);
  }

  const formatted = shows.map((s: any) => ({
    id: s.id,
    date: s.date,
    time: s.time,
    venue_room: s.venue_room,
    venue: s.venue,
    reservation_url: s.reservation_url,
    status: s.status,
    rsvp_at: s.rsvp_at,
    comedians: s.comedian_ids
      ? s.comedian_ids.split(",").map((id: string, i: number) => ({
          id: parseInt(id),
          name: (s.comedian_names ?? "").split("||")[i] ?? "",
        }))
      : [],
  }));

  return NextResponse.json(formatted);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { show_id } = await req.json();
  const db = getDb();
  const user = db.prepare("SELECT id FROM users WHERE email = ?").get(session.user.email) as { id: number } | undefined;
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  db.prepare(`
    INSERT INTO user_shows (user_id, show_id, status)
    VALUES (?, ?, 'going')
    ON CONFLICT(user_id, show_id) DO UPDATE SET status = 'going'
  `).run(user.id, show_id);

  // Return going count for this show
  const count = db.prepare("SELECT COUNT(*) as c FROM user_shows WHERE show_id = ?").get(show_id) as { c: number };

  return NextResponse.json({ ok: true, going_count: count.c });
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { show_id } = await req.json();
  const db = getDb();
  const user = db.prepare("SELECT id FROM users WHERE email = ?").get(session.user.email) as { id: number } | undefined;
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  db.prepare("DELETE FROM user_shows WHERE user_id = ? AND show_id = ?").run(user.id, show_id);
  return NextResponse.json({ ok: true });
}
