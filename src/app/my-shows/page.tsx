"use client";

import { useSession, signIn } from "next-auth/react";
import { useEffect, useState } from "react";
import Link from "next/link";
import InviteModal from "@/components/InviteModal";

interface ShowComedian {
  id: number;
  name: string;
}

interface UserShow {
  id: number;
  date: string;
  time: string;
  venue_room: string;
  venue: string;
  reservation_url: string;
  status: string;
  rsvp_at: string;
  comedians: ShowComedian[];
}

export default function MyShowsPage() {
  const { data: session, status } = useSession();
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");
  const [shows, setShows] = useState<UserShow[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteShow, setInviteShow] = useState<UserShow | null>(null);

  useEffect(() => {
    if (!session) { setLoading(false); return; }
    setLoading(true);
    fetch(`/api/user-shows?tab=${tab}`)
      .then((r) => r.json())
      .then((data) => setShows(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [session, tab]);

  const cancelShow = async (showId: number) => {
    await fetch("/api/user-shows", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ show_id: showId }),
    });
    setShows((prev) => prev.filter((s) => s.id !== showId));
    // Update session cache
    const cached = sessionStorage.getItem("going_show_ids");
    if (cached) {
      const ids: number[] = JSON.parse(cached);
      sessionStorage.setItem("going_show_ids", JSON.stringify(ids.filter((id) => id !== showId)));
    }
  };

  const formatDate = (d: string) => {
    const date = new Date(d + "T12:00:00");
    return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  };

  if (status === "loading") {
    return (
      <div className="space-y-4" aria-busy="true">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-xl border border-border bg-card h-20 animate-pulse" />
        ))}
      </div>
    );
  }

  if (!session) {
    return (
      <div className="text-center py-20">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
          <svg className="w-8 h-8 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <p className="text-lg font-semibold text-foreground mb-2">Sign in to track your shows</p>
        <p className="text-muted-foreground mb-6">Mark shows you're going to and keep a history of shows you've attended.</p>
        <button
          onClick={() => signIn("google")}
          className="px-6 py-3 bg-primary text-on-primary font-semibold rounded-lg hover:bg-secondary hover:text-on-secondary transition-colors duration-200 cursor-pointer"
        >
          Sign in with Google
        </button>
      </div>
    );
  }

  return (
    <div>
      <section className="mb-6">
        <h1 className="font-display text-4xl sm:text-5xl tracking-wide text-foreground">
          MY SHOWS
        </h1>
      </section>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-border">
        <button
          onClick={() => setTab("upcoming")}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors duration-200 cursor-pointer ${
            tab === "upcoming"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Upcoming
        </button>
        <button
          onClick={() => setTab("past")}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors duration-200 cursor-pointer ${
            tab === "past"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          I Went
        </button>
      </div>

      {loading ? (
        <div className="space-y-3" aria-busy="true">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-xl border border-border bg-card h-24 animate-pulse" />
          ))}
        </div>
      ) : shows.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-muted-foreground mb-4">
            {tab === "upcoming"
              ? "No upcoming shows. Browse lineups and mark the ones you're going to!"
              : "No past shows yet. Shows you've attended will appear here."}
          </p>
          {tab === "upcoming" && (
            <Link
              href="/"
              className="inline-flex px-5 py-2.5 bg-primary text-on-primary font-semibold rounded-lg hover:bg-secondary hover:text-on-secondary transition-colors duration-200"
            >
              Browse Lineups
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {shows.map((show) => (
            <article
              key={show.id}
              className="rounded-xl border border-border bg-card p-4 sm:p-5 transition-all duration-200 hover:border-primary/30"
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-display text-xl tracking-wide text-primary">
                      {formatDate(show.date).toUpperCase()}
                    </span>
                    <span className="text-muted-foreground">&middot;</span>
                    <span className="font-semibold text-sm text-card-foreground">{show.time}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-muted-foreground">{show.venue_room}</span>
                    {show.venue !== "Comedy Cellar" && (
                      <span className="text-[10px] font-medium text-secondary bg-secondary/10 px-1.5 py-0.5 rounded-full">{show.venue}</span>
                    )}
                  </div>
                </div>
                {tab === "upcoming" && (
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => setInviteShow(show)}
                      className="p-2 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors duration-200 cursor-pointer"
                      aria-label="Invite a friend"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => cancelShow(show.id)}
                      className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors duration-200 cursor-pointer"
                      aria-label="Cancel"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                )}
                {tab === "past" && (
                  <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-1 rounded-full shrink-0">Attended</span>
                )}
              </div>

              <div className="flex flex-wrap gap-1.5">
                {show.comedians.map((c, i) => (
                  <Link
                    key={c.id}
                    href={`/comedians/${c.id}`}
                    className="text-xs text-card-foreground hover:text-primary transition-colors duration-200"
                  >
                    {c.name}{i < show.comedians.length - 1 ? "," : ""}
                  </Link>
                ))}
              </div>

              {tab === "upcoming" && show.reservation_url && (
                <a
                  href={
                    show.reservation_url.startsWith("http")
                      ? show.reservation_url
                      : `https://www.comedycellar.com${show.reservation_url}`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 mt-3 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-on-primary hover:bg-secondary hover:text-on-secondary transition-colors duration-200"
                >
                  Reserve
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              )}
            </article>
          ))}
        </div>
      )}

      {inviteShow && (
        <InviteModal
          showId={inviteShow.id}
          showLabel={`${formatDate(inviteShow.date)} at ${inviteShow.time} - ${inviteShow.venue_room}`}
          onClose={() => setInviteShow(null)}
        />
      )}
    </div>
  );
}
