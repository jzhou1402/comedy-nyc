import * as cheerio from "cheerio";
import { getDb } from "./db";

interface ScrapedComedian {
  name: string;
  headshot_url: string;
}

interface ScrapedShow {
  date: string;
  time: string;
  venue_room: string;
  reservation_url: string;
  comedians: ScrapedComedian[];
}

const VENUE_MAP: Record<string, string> = {
  midtown: "NYCC - Midtown",
  "east-village": "NYCC - East Village",
  "upper-west-side": "NYCC - Upper West Side",
};

function parseCalendarPage(html: string): { eventUrl: string; date: string; time: string; venue_room: string }[] {
  const $ = cheerio.load(html);
  const events: { eventUrl: string; date: string; time: string; venue_room: string }[] = [];

  $("ul.calendar-event-details").each((_, el) => {
    const ul = $(el);

    const link = ul.find("li.scheduled a");
    const href = link.attr("href");
    const label = link.text().trim();
    if (!href || !label) return;

    // Parse "Tuesday March 24th 07:00PM"
    const dateTimeMatch = label.match(/(\w+ \w+ \d+)\w* (\d{2}:\d{2}[AP]M)/i);
    if (!dateTimeMatch) return;

    const dateStr = dateTimeMatch[1]; // "Tuesday March 24"
    const time = dateTimeMatch[2]; // "07:00PM"

    // Format time nicely: "7:00 PM"
    const formattedTime = time.replace(/^0/, "").replace(/(AM|PM)/, " $1");

    // Parse date to ISO
    const now = new Date();
    const year = now.getFullYear();
    const parsed = new Date(`${dateStr}, ${year}`);
    if (isNaN(parsed.getTime())) return;
    const isoDate = parsed.toISOString().split("T")[0];

    // Get venue
    const venueEl = ul.find("li.scheduled-venue");
    const venueClasses = venueEl.attr("class") ?? "";
    let venue_room = "NYCC";
    for (const [cls, name] of Object.entries(VENUE_MAP)) {
      if (venueClasses.includes(cls)) {
        venue_room = name;
        break;
      }
    }

    const eventUrl = href.startsWith("http") ? href : `https://newyorkcomedyclub.com${href}`;
    events.push({ eventUrl, date: isoDate, time: formattedTime, venue_room });
  });

  return events;
}

async function fetchEventComedians(url: string): Promise<ScrapedComedian[]> {
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; ComedyNYC/1.0)" },
  });
  if (!res.ok) return [];
  const html = await res.text();
  const $ = cheerio.load(html);
  const comedians: ScrapedComedian[] = [];

  // Try JSON-LD first
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const data = JSON.parse($(el).html() ?? "");
      const events = Array.isArray(data) ? data : [data];
      for (const evt of events) {
        if (evt.performer) {
          const performers = Array.isArray(evt.performer) ? evt.performer : [evt.performer];
          for (const p of performers) {
            if (p.name && !comedians.some((c) => c.name === p.name)) {
              comedians.push({ name: p.name, headshot_url: "" });
            }
          }
        }
      }
    } catch {}
  });

  // Enrich with headshots from HTML
  $(".comedian-image-container").each((_, el) => {
    const container = $(el);
    const name = container.find(".comedian-name a").text().trim();
    const img = container.find("img").attr("src") ?? "";
    const headshot = img ? (img.startsWith("http") ? img : `https://newyorkcomedyclub.com${img}`) : "";

    const existing = comedians.find((c) => c.name === name);
    if (existing && headshot) {
      existing.headshot_url = headshot;
    } else if (name && !existing) {
      comedians.push({ name, headshot_url: headshot });
    }
  });

  return comedians;
}

function storeShows(allShows: ScrapedShow[]): { showCount: number; comedianCount: number } {
  const db = getDb();

  const upsertComedian = db.prepare(`
    INSERT INTO comedians (name, headshot_url)
    VALUES (?, ?)
    ON CONFLICT(name) DO UPDATE SET
      headshot_url = COALESCE(NULLIF(excluded.headshot_url, ''), comedians.headshot_url),
      updated_at = datetime('now')
  `);

  const upsertShow = db.prepare(`
    INSERT INTO shows (date, time, venue_room, reservation_url, venue)
    VALUES (?, ?, ?, ?, 'New York Comedy Club')
    ON CONFLICT(date, time, venue_room) DO UPDATE SET
      reservation_url = excluded.reservation_url,
      venue = 'New York Comedy Club'
  `);

  const getComedianId = db.prepare("SELECT id FROM comedians WHERE name = ?");
  const getShowId = db.prepare("SELECT id FROM shows WHERE date = ? AND time = ? AND venue_room = ?");
  const deleteShowComedians = db.prepare("DELETE FROM show_comedians WHERE show_id = ?");
  const insertShowComedian = db.prepare(
    "INSERT OR IGNORE INTO show_comedians (show_id, comedian_id, sort_order) VALUES (?, ?, ?)"
  );

  const comedianNames = new Set<string>();

  const runAll = db.transaction(() => {
    for (const show of allShows) {
      upsertShow.run(show.date, show.time, show.venue_room, show.reservation_url);
      const showRow = getShowId.get(show.date, show.time, show.venue_room) as { id: number };

      deleteShowComedians.run(showRow.id);

      show.comedians.forEach((c, i) => {
        comedianNames.add(c.name);
        upsertComedian.run(c.name, c.headshot_url);
        const comedianRow = getComedianId.get(c.name) as { id: number };
        insertShowComedian.run(showRow.id, comedianRow.id, i);
      });
    }
  });

  runAll();
  return { showCount: allShows.length, comedianCount: comedianNames.size };
}

export async function scrapeNYCC(): Promise<{ showCount: number; comedianCount: number }> {
  // Fetch calendar pages for current and next month
  const now = new Date();
  const months: string[] = [];
  for (let i = 0; i < 2; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }

  const allEvents: { eventUrl: string; date: string; time: string; venue_room: string }[] = [];

  for (const month of months) {
    console.log(`  Fetching calendar ${month}...`);
    const res = await fetch(`https://newyorkcomedyclub.com/calendar/${month}`, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; ComedyNYC/1.0)" },
    });
    if (!res.ok) {
      console.error(`  Failed calendar ${month}: ${res.status}`);
      continue;
    }
    const html = await res.text();
    const events = parseCalendarPage(html);
    // Only include future dates
    const today = new Date().toISOString().split("T")[0];
    allEvents.push(...events.filter((e) => e.date >= today));
    await new Promise((r) => setTimeout(r, 2500));
  }

  console.log(`  Found ${allEvents.length} events, fetching lineups...`);

  const allShows: ScrapedShow[] = [];

  for (let i = 0; i < allEvents.length; i++) {
    const evt = allEvents[i];
    await new Promise((r) => setTimeout(r, 2500));
    try {
      const comedians = await fetchEventComedians(evt.eventUrl);
      if (comedians.length > 0) {
        allShows.push({
          date: evt.date,
          time: evt.time,
          venue_room: evt.venue_room,
          reservation_url: evt.eventUrl,
          comedians,
        });
      }
      if ((i + 1) % 10 === 0) {
        console.log(`  ${i + 1}/${allEvents.length} events processed...`);
      }
    } catch (e) {
      console.error(`  Failed ${evt.eventUrl}:`, e);
    }
  }

  return storeShows(allShows);
}
