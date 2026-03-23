import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getDb } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const db = getDb();
  const user = db.prepare("SELECT id FROM users WHERE email = ?").get(session.user.email) as { id: number } | undefined;
  if (!user) return NextResponse.json([]);

  const favorites = db.prepare(`
    SELECT c.id, c.name, c.credits, c.headshot_url, c.website_url, f.reason, f.created_at
    FROM favorites f
    JOIN comedians c ON c.id = f.comedian_id
    WHERE f.user_id = ?
    ORDER BY f.created_at DESC
  `).all(user.id);

  return NextResponse.json(favorites);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { comedian_id, reason } = await req.json();
  const db = getDb();
  const user = db.prepare("SELECT id FROM users WHERE email = ?").get(session.user.email) as { id: number } | undefined;
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  db.prepare(`
    INSERT INTO favorites (user_id, comedian_id, reason)
    VALUES (?, ?, ?)
    ON CONFLICT(user_id, comedian_id) DO UPDATE SET reason = excluded.reason
  `).run(user.id, comedian_id, reason ?? null);

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { comedian_id } = await req.json();
  const db = getDb();
  const user = db.prepare("SELECT id FROM users WHERE email = ?").get(session.user.email) as { id: number } | undefined;
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  db.prepare("DELETE FROM favorites WHERE user_id = ? AND comedian_id = ?").run(user.id, comedian_id);
  return NextResponse.json({ ok: true });
}
