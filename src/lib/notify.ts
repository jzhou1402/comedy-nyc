import { getDb } from "./db";
import { Resend } from "resend";

interface UpcomingShow {
  show_id: number;
  date: string;
  time: string;
  venue_room: string;
  venue: string;
  reservation_url: string;
}

/**
 * Send an immediate email to a user about upcoming shows for a comedian they just followed.
 * Records notifications so they won't be sent again by the batch job.
 */
export async function notifyFollowImmediate(userId: number, comedianId: number) {
  if (!process.env.RESEND_API_KEY) return;

  const db = getDb();

  const user = db.prepare("SELECT email, name FROM users WHERE id = ?").get(userId) as
    | { email: string; name: string | null }
    | undefined;
  if (!user) return;

  const comedian = db.prepare("SELECT name FROM comedians WHERE id = ?").get(comedianId) as
    | { name: string }
    | undefined;
  if (!comedian) return;

  const shows = db.prepare(`
    SELECT s.id as show_id, s.date, s.time, s.venue_room, COALESCE(s.venue, 'Comedy Cellar') as venue, s.reservation_url
    FROM shows s
    JOIN show_comedians sc ON sc.show_id = s.id
    WHERE sc.comedian_id = ? AND s.date >= date('now')
    ORDER BY s.date, s.time
  `).all(comedianId) as UpcomingShow[];

  if (shows.length === 0) return;

  const resend = new Resend(process.env.RESEND_API_KEY);

  const formatDate = (d: string) => {
    const date = new Date(d + "T12:00:00");
    return date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  };

  // Figure out which venues this comedian performs at
  const venues = [...new Set(shows.map((s) => s.venue))];
  const venueStr = venues.length === 1 ? venues[0] : venues.slice(0, -1).join(", ") + " & " + venues[venues.length - 1];

  const showLines = shows
    .map((s) => {
      const bookingUrl = s.reservation_url
        ? s.reservation_url.startsWith("http")
          ? s.reservation_url
          : `https://www.comedycellar.com${s.reservation_url}`
        : "";
      const bookingLink = bookingUrl ? ` - Book: ${bookingUrl}` : "";
      return `  - ${formatDate(s.date)} at ${s.time} (${s.venue_room})${bookingLink}`;
    })
    .join("\n");

  try {
    await resend.emails.send({
      from: process.env.EMAIL_FROM ?? "Comedy.NYC <notifications@nyccomedy.org>",
      to: user.email,
      subject: `${comedian.name} is performing in NYC!`,
      text: [
        `Hi ${user.name ?? "there"},`,
        "",
        `Great news! ${comedian.name} has ${shows.length} upcoming show${shows.length > 1 ? "s" : ""} at ${venueStr}:`,
        "",
        showLines,
        "",
        `Browse all shows: https://nyccomedy.org`,
        "",
        "- NYC Comedy (nyccomedy.org)",
      ].join("\n"),
    });

    const insertNotification = db.prepare(
      "INSERT OR IGNORE INTO notifications (user_id, comedian_id, show_id) VALUES (?, ?, ?)"
    );
    for (const s of shows) {
      insertNotification.run(userId, comedianId, s.show_id);
    }
  } catch (e) {
    console.error(`Failed to send follow email to ${user.email}:`, e);
  }
}
