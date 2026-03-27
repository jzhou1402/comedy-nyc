import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET() {
  const db = getDb();
  const locations = db.prepare("SELECT * FROM locations ORDER BY venue, name").all();
  return NextResponse.json(locations);
}
