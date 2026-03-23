# Comedy.NYC — Project Context

## MVP Scope

An app like Bandsintown but for the NYC Comedy Cellar. Primary user: comedy fans looking for shows.

### Core Features (MVP)
1. **Browse lineups** — see upcoming Comedy Cellar shows with performers
2. **Favorite comedians** — pick favorites and add a reason why
3. **Email notifications** — get emailed when a favorited comedian appears on an upcoming lineup

### Tech Stack
- Next.js (React) with TypeScript + Tailwind
- PostgreSQL (or SQLite to start)
- Scraper (cron job)
- Email service (Resend or SendGrid)
- Google OAuth for auth

### Not in MVP
- Mobile app / push notifications
- Multiple venues (expand later)
- Reviews, ratings, check-ins

---

## Scraper Details

### Data Source
The Comedy Cellar lineup is loaded via a POST API, NOT static HTML.

**Endpoint:** `https://www.comedycellar.com/lineup/api/`

**Request:**
```
POST /lineup/api/
Content-Type: application/x-www-form-urlencoded; charset=UTF-8

action=cc_get_shows&json={"date":"2026-03-23","venue":"newyork","type":"lineup"}
```

- `date` can be `"today"` or a date string like `"2026-03-23"`
- The API returns ~4 weeks of available dates

**Response structure:**
```json
{
  "show": {
    "date": "Monday March 23, 2026",
    "html": "<div>...rendered HTML...</div>"
  },
  "dates": {
    "2026-03-23": "Monday March 23, 2026",
    "2026-03-24": "Tuesday March 24, 2026"
    // ... ~28 days out
  }
}
```

### HTML Parsing

The `show.html` contains this structure per show:

```html
<div>
  <div class="set-header">
    <span class="lineup-toggle" data-lineup-id="42645">+</span>
    <div class="info">
      <h2>
        <span class="bold">6:45 pm<span class="hide-mobile"> show</span></span>
        <span class="divider">-</span>
        <span class="title">MacDougal Street</span>
      </h2>
    </div>
  </div>
  <div class="lineup" data-set-content="42645">
    <!-- One per comedian in the show: -->
    <div class="set-content">
      <div><img src="/wp-content/uploads/2016/07/JON-LASTER-70x70.jpg" alt="Jon Laster's headshot"></div>
      <div>
        <p><span class="name">Jon Laster</span> WINNER OF STAND UP NBC, </p>
        <p class="website"><a target="_blank" href="http://Instagram.com/hewasfunny">&gt; Website</a></p>
      </div>
    </div>
    <!-- More comedians... -->
    <div class="make-reservation">
      <a href="/reservations-newyork/?showid=1774305900">Make A Reservation</a>
    </div>
  </div>
</div>
```

### Fields to extract per show:
- **time**: from `span.bold` (e.g., "6:45 pm")
- **venue/room**: from `span.title` (e.g., "MacDougal Street", "Village Underground", "Fat Black Pussycat (Bar)")
- **lineup_id**: from `data-lineup-id` attribute
- **reservation_url**: from `a[href*=reservations]`

### Fields to extract per comedian:
- **name**: from `span.name`
- **credits/bio**: text after the name span in the same `<p>`
- **headshot_url**: from `img src`
- **website_url**: from `a` inside `p.website`

### Venue rooms observed:
- MacDougal Street (main room)
- Village Underground
- Fat Black Pussycat (Bar)
- The CQ Room (special shows like "Colin Quinn Returns")

### robots.txt
`robots.txt` is fully permissive (`Disallow:` is empty). Scraping is allowed.

### Rate limiting guidance
- Be gentle: 2+ second delay between requests
- Cache for 5 minutes (matches their own `cacheTimeSeconds: 300`)
- Only need to scrape once or twice daily for notification purposes

---

## Agentic Scraping Vision (Future)

The user wants to build a self-learning scraping system:
- One "skill" file per domain that stores selectors, field mappings, pagination strategy, rate limits
- An LLM analyzes the DOM and generates/updates the skill file
- The skill is used by a deterministic scraper (no LLM in the hot path)
- If selectors fail, trigger a re-learn cycle
- Keep this in mind as we build — the scraper should be structured to make this evolution possible

---

## Project Setup

Next.js project needs to be initialized in `/Users/johnzhou/comedy.nyc/`:
```bash
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm
```
(Accept defaults for remaining prompts)

### Database Schema (planned)

**comedians**
- id, name, credits, headshot_url, website_url, created_at, updated_at

**shows**
- id, date, time, venue_room, lineup_id, reservation_url, created_at

**show_comedians**
- show_id, comedian_id, sort_order

**users**
- id, email, name, google_id, created_at

**favorites**
- user_id, comedian_id, reason, created_at

**notifications**
- id, user_id, comedian_id, show_id, sent_at
