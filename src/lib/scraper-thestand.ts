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

function parseShowsPage(html: string, isoDate: string): ScrapedShow[] {
  const $ = cheerio.load(html);
  const shows: ScrapedShow[] = [];

  // Each show has an h3.showinfo with date, time, room — use the desktop version (d-none d-sm-block)
  $("h2.showtitle.d-none.d-sm-block").each((_, titleEl) => {
    const titleLink = $(titleEl).find("a");
    const showUrl = titleLink.attr("href") ?? "";

    // h3.showinfo is the next sibling
    const showInfo = $(titleEl).nextAll("h3.showinfo").first();
    const infoText = showInfo.text().trim();

    // Parse time and room from "March 25 | 7:00 PM Upstairs"
    const timeMatch = infoText.match(/(\d{1,2}:\d{2}\s*[AP]M)/i);
    const time = timeMatch ? timeMatch[1].trim() : "";

    const roomEl = showInfo.find(".list-show-room");
    const venue_room = roomEl.text().trim() || "Main Room";

    // Find ticket link (tixr)
    const container = $(titleEl).closest(".col-12.col-sm-9");
    let reservation_url = "";
    container.find('a[href*="tixr.com"]').each((_, a) => {
      reservation_url = $(a).attr("href") ?? "";
    });

    // If not found in immediate container, look broader
    if (!reservation_url) {
      const parentRow = $(titleEl).closest(".row").parent();
      parentRow.find('a[href*="tixr.com"]').each((_, a) => {
        if (!reservation_url) reservation_url = $(a).attr("href") ?? "";
      });
    }

    // Parse comedians from the grid
    const comedians: ScrapedComedian[] = [];
    const lineupGrid = showInfo.nextAll(".row.gx-3").first();
    lineupGrid.find("small").each((_, el) => {
      const name = $(el).text().trim();
      const img = $(el).closest("div").find("img").attr("src") ?? "";
      if (name) {
        comedians.push({ name, headshot_url: img });
      }
    });

    // If grid didn't work, try the ul list
    if (comedians.length === 0) {
      showInfo.nextAll("ul").first().find("li").each((_, li) => {
        const name = $(li).text().trim();
        const img = $(li).find("img").attr("src") ?? "";
        if (name) {
          comedians.push({ name, headshot_url: img });
        }
      });
    }

    if (time && comedians.length > 0) {
      shows.push({ date: isoDate, time, venue_room, reservation_url, comedians });
    }
  });

  return shows;
}

async function fetchDay(date: string): Promise<ScrapedShow[]> {
  const res = await fetch(`https://thestandnyc.com/shows/${date}`, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; ComedyNYC/1.0)" },
  });
  if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
  const html = await res.text();
  return parseShowsPage(html, date);
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
    VALUES (?, ?, ?, ?, 'The Stand')
    ON CONFLICT(date, time, venue_room) DO UPDATE SET
      reservation_url = excluded.reservation_url,
      venue = 'The Stand'
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
      // Prefix room with "The Stand - " to avoid collisions with Comedy Cellar rooms
      const fullRoom = `The Stand - ${show.venue_room}`;
      upsertShow.run(show.date, show.time, fullRoom, show.reservation_url);
      const showRow = getShowId.get(show.date, show.time, fullRoom) as { id: number };

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

export async function scrapeTheStand(): Promise<{ showCount: number; comedianCount: number }> {
  const allShows: ScrapedShow[] = [];

  // Generate dates for the next 28 days
  const today = new Date();
  const dates: string[] = [];
  for (let i = 0; i < 28; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    dates.push(d.toISOString().split("T")[0]);
  }

  for (const date of dates) {
    await new Promise((r) => setTimeout(r, 2500));
    try {
      const shows = await fetchDay(date);
      allShows.push(...shows);
      if (shows.length > 0) {
        console.log(`  ${date}: ${shows.length} shows`);
      }
    } catch (e) {
      console.error(`  Failed ${date}:`, e);
    }
  }

  return storeShows(allShows);
}

export async function scrapeTheStandDate(date: string): Promise<{ showCount: number; comedianCount: number }> {
  const shows = await fetchDay(date);
  return storeShows(shows);
}
