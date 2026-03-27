import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { Resend } from "resend";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { show_id, friend_email } = await req.json();
  if (!friend_email || !show_id) {
    return NextResponse.json({ error: "Missing show_id or friend_email" }, { status: 400 });
  }

  const db = getDb();
  const show = db.prepare(`
    SELECT s.date, s.time, s.venue_room, COALESCE(s.venue, 'Comedy Cellar') as venue,
           GROUP_CONCAT(c.name, ', ') as comedian_names
    FROM shows s
    LEFT JOIN show_comedians sc ON sc.show_id = s.id
    LEFT JOIN comedians c ON c.id = sc.comedian_id
    WHERE s.id = ?
    GROUP BY s.id
  `).get(show_id) as any;

  if (!show) {
    return NextResponse.json({ error: "Show not found" }, { status: 404 });
  }

  const formatDate = (d: string) => {
    const date = new Date(d + "T12:00:00");
    return date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  };

  const senderName = session.user.name ?? session.user.email;

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ error: "Email not configured" }, { status: 500 });
  }

  const resend = new Resend(process.env.RESEND_API_KEY);

  try {
    await resend.emails.send({
      from: process.env.EMAIL_FROM ?? "Comedy.NYC <notifications@nyccomedy.org>",
      to: friend_email,
      subject: `${senderName} invited you to a comedy show!`,
      text: [
        `${senderName} is going to a comedy show and wants you to come!`,
        "",
        `${show.venue} - ${show.venue_room}`,
        `${formatDate(show.date)} at ${show.time}`,
        "",
        `Lineup: ${show.comedian_names || "TBA"}`,
        "",
        `Check it out: https://nyccomedy.org`,
        "",
        "- NYC Comedy (nyccomedy.org)",
      ].join("\n"),
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Invite email failed:", e);
    return NextResponse.json({ error: "Failed to send invite" }, { status: 500 });
  }
}
