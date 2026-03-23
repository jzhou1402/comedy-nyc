import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { Resend } from "resend";

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-scrape-secret");
  if (secret !== process.env.SCRAPE_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const db = getDb();

  // Find upcoming shows with favorited comedians that haven't been notified
  const matches = db.prepare(`
    SELECT DISTINCT u.id as user_id, u.email, u.name as user_name,
           c.id as comedian_id, c.name as comedian_name,
           s.id as show_id, s.date, s.time, s.venue_room, s.reservation_url
    FROM favorites f
    JOIN users u ON u.id = f.user_id
    JOIN comedians c ON c.id = f.comedian_id
    JOIN show_comedians sc ON sc.comedian_id = c.id
    JOIN shows s ON s.id = sc.show_id
    WHERE s.date >= date('now')
      AND NOT EXISTS (
        SELECT 1 FROM notifications n
        WHERE n.user_id = u.id AND n.comedian_id = c.id AND n.show_id = s.id
      )
    ORDER BY u.id, s.date, s.time
  `).all() as any[];

  // Group by user
  const byUser = new Map<number, { email: string; name: string; shows: any[] }>();
  for (const m of matches) {
    if (!byUser.has(m.user_id)) {
      byUser.set(m.user_id, { email: m.email, name: m.user_name, shows: [] });
    }
    byUser.get(m.user_id)!.shows.push(m);
  }

  let sentCount = 0;
  const insertNotification = db.prepare(
    "INSERT INTO notifications (user_id, comedian_id, show_id) VALUES (?, ?, ?)"
  );

  for (const [userId, { email, name, shows }] of byUser) {
    const lines = shows.map(
      (s: any) => `- ${s.comedian_name}: ${s.date} at ${s.time}, ${s.venue_room}`
    );

    try {
      await resend.emails.send({
        from: process.env.EMAIL_FROM ?? "Comedy.NYC <notifications@comedy.nyc>",
        to: email,
        subject: `Your favorite comedians are performing!`,
        text: `Hi ${name ?? "there"},\n\nHeads up! Some of your favorite comedians have upcoming shows at the Comedy Cellar:\n\n${lines.join("\n")}\n\nBook your spot at comedycellar.com\n\n- Comedy.NYC`,
      });

      for (const s of shows) {
        insertNotification.run(userId, s.comedian_id, s.show_id);
      }
      sentCount++;
    } catch (e) {
      console.error(`Failed to email ${email}:`, e);
    }
  }

  return NextResponse.json({ ok: true, usersNotified: sentCount, matchCount: matches.length });
}
