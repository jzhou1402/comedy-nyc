import * as cheerio from "cheerio";
import { getDb } from "./db";

interface ScrapedComedian {
  name: string;
  credits: string;
  headshot_url: string;
  website_url: string;
}

interface ScrapedShow {
  date: string;
  time: string;
  venue_room: string;
  lineup_id: string;
  reservation_url: string;
  comedians: ScrapedComedian[];
}

function normalizeDate(dateStr: string): string {
  // If already ISO format, return as-is
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  // Parse human-readable like "Monday March 23, 2026"
  const parsed = new Date(dateStr);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split("T")[0];
  }
  return dateStr;
}

async function fetchDay(date: string): Promise<{ shows: ScrapedShow[]; dates: string[] }> {
  const body = `action=cc_get_shows&json=${encodeURIComponent(JSON.stringify({ date, venue: "newyork", type: "lineup" }))}`;

  const res = await fetch("https://www.comedycellar.com/lineup/api/", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8" },
    body,
  });

  if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
  const data = await res.json();

  // Use the ISO key from `dates` map if available, otherwise normalize the display date
  const isoDate = (data.dates && Object.keys(data.dates).find(
    (k) => data.dates[k] === data.show?.date
  )) || normalizeDate(data.show?.date ?? date);

  const shows = parseShowsHtml(data.show?.html ?? "", isoDate);
  const dates = data.dates ? Object.keys(data.dates) : [];
  return { shows, dates };
}

function parseShowsHtml(html: string, dateStr: string): ScrapedShow[] {
  const $ = cheerio.load(html);
  const shows: ScrapedShow[] = [];

  $(".set-header").each((_, headerEl) => {
    const header = $(headerEl);
    const time = header.find("span.bold").first().text().replace(/\s*show\s*$/i, "").trim();
    const venue_room = header.find("span.title").text().trim();
    const lineup_id = header.find(".lineup-toggle").attr("data-lineup-id") ?? "";

    const lineupDiv = header.nextAll(`.lineup[data-set-content="${lineup_id}"]`).first();
    if (!lineupDiv.length) {
      // Try sibling approach
      const nextLineup = header.next(".lineup");
      if (nextLineup.length) {
        parseLineup($, nextLineup, dateStr, time, venue_room, lineup_id, shows);
        return;
      }
    }
    parseLineup($, lineupDiv, dateStr, time, venue_room, lineup_id, shows);
  });

  return shows;
}

function parseLineup(
  $: cheerio.CheerioAPI,
  lineupDiv: cheerio.Cheerio<any>,
  dateStr: string,
  time: string,
  venue_room: string,
  lineup_id: string,
  shows: ScrapedShow[]
) {
  const reservation_url = lineupDiv.find("a[href*=reservations]").attr("href") ?? "";
  const comedians: ScrapedComedian[] = [];

  lineupDiv.find(".set-content").each((_, el) => {
    const content = $(el);
    const name = content.find("span.name").text().trim();
    if (!name) return;

    const nameEl = content.find("span.name");
    const parentP = nameEl.parent("p");
    const credits = parentP.text().replace(name, "").trim().replace(/^,\s*/, "").replace(/,\s*$/, "");
    const headshot_url = content.find("img").attr("src") ?? "";
    const website_url = content.find("p.website a").attr("href") ?? "";

    comedians.push({ name, credits, headshot_url, website_url });
  });

  if (comedians.length > 0) {
    shows.push({ date: dateStr, time, venue_room, lineup_id, reservation_url, comedians });
  }
}

export async function scrapeAll(): Promise<{ showCount: number; comedianCount: number }> {
  // First request to get available dates
  const { shows: todayShows, dates } = await fetchDay("today");
  const allShows: ScrapedShow[] = [...todayShows];

  // Fetch remaining dates with rate limiting
  for (const date of dates) {
    await new Promise((r) => setTimeout(r, 2500));
    try {
      const { shows } = await fetchDay(date);
      allShows.push(...shows);
    } catch (e) {
      console.error(`Failed to fetch ${date}:`, e);
    }
  }

  // Store in DB
  return storeShows(allShows);
}

export async function scrapeDate(date: string): Promise<{ showCount: number; comedianCount: number }> {
  const { shows } = await fetchDay(date);
  return storeShows(shows);
}

function storeShows(allShows: ScrapedShow[]): { showCount: number; comedianCount: number } {
  const db = getDb();

  const upsertComedian = db.prepare(`
    INSERT INTO comedians (name, credits, headshot_url, website_url)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(name) DO UPDATE SET
      credits = COALESCE(NULLIF(excluded.credits, ''), comedians.credits),
      headshot_url = COALESCE(NULLIF(excluded.headshot_url, ''), comedians.headshot_url),
      website_url = COALESCE(NULLIF(excluded.website_url, ''), comedians.website_url),
      updated_at = datetime('now')
  `);

  const upsertShow = db.prepare(`
    INSERT INTO shows (date, time, venue_room, lineup_id, reservation_url)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(date, time, venue_room) DO UPDATE SET
      lineup_id = excluded.lineup_id,
      reservation_url = excluded.reservation_url
  `);

  const getComedianId = db.prepare(`SELECT id FROM comedians WHERE name = ?`);
  const getShowId = db.prepare(`SELECT id FROM shows WHERE date = ? AND time = ? AND venue_room = ?`);

  const deleteShowComedians = db.prepare(`DELETE FROM show_comedians WHERE show_id = ?`);
  const insertShowComedian = db.prepare(`
    INSERT OR IGNORE INTO show_comedians (show_id, comedian_id, sort_order) VALUES (?, ?, ?)
  `);

  const comedianNames = new Set<string>();

  const runAll = db.transaction(() => {
    for (const show of allShows) {
      upsertShow.run(show.date, show.time, show.venue_room, show.lineup_id, show.reservation_url);
      const showRow = getShowId.get(show.date, show.time, show.venue_room) as { id: number };

      deleteShowComedians.run(showRow.id);

      show.comedians.forEach((c, i) => {
        comedianNames.add(c.name);
        upsertComedian.run(c.name, c.credits, c.headshot_url, c.website_url);
        const comedianRow = getComedianId.get(c.name) as { id: number };
        insertShowComedian.run(showRow.id, comedianRow.id, i);
      });
    }
  });

  runAll();

  return { showCount: allShows.length, comedianCount: comedianNames.size };
}
