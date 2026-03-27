"use client";

import { useCallback, useState, use } from "react";
import { useSession, signIn } from "next-auth/react";
import { useSessionCache } from "@/lib/useSessionCache";
import FollowModal from "@/components/FollowModal";
import Link from "next/link";

interface ComedianDetail {
  id: number;
  name: string;
  credits: string | null;
  bio: string | null;
  headshot_url: string | null;
  website_url: string | null;
  instagram_url: string | null;
  twitter_url: string | null;
  tiktok_url: string | null;
  youtube_url: string | null;
  show_count: number;
  upcoming_shows: {
    id: number;
    date: string;
    time: string;
    venue_room: string;
    reservation_url: string;
  }[];
}

const SOCIALS = [
  { key: "instagram_url" as const, label: "Instagram", icon: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
    </svg>
  )},
  { key: "twitter_url" as const, label: "X / Twitter", icon: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
    </svg>
  )},
  { key: "tiktok_url" as const, label: "TikTok", icon: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
    </svg>
  )},
  { key: "youtube_url" as const, label: "YouTube", icon: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
    </svg>
  )},
] as const;

const fetchJson = (url: string) => fetch(url).then((r) => r.json());

export default function ComedianProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: session } = useSession();

  const { data: comedian, loading } = useSessionCache<ComedianDetail | null>(
    `comedian_${id}`,
    () => fetchJson(`/api/comedians/${id}`).then((d: any) => (d?.name ? d : null))
  );

  const { data: favoriteIds, update: updateFavorites } = useSessionCache<number[]>(
    "favorite_ids",
    () =>
      session
        ? fetchJson("/api/favorites").then((favs: any[]) =>
            Array.isArray(favs) ? favs.map((f) => f.id) : []
          )
        : Promise.resolve([])
  );

  const isFav = (favoriteIds ?? []).includes(parseInt(id));
  const [showFollowModal, setShowFollowModal] = useState(false);

  const toggleFavorite = useCallback(() => {
    if (!session) {
      signIn("google");
      return;
    }
    if (isFav) {
      fetch("/api/favorites", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comedian_id: parseInt(id) }),
      });
      updateFavorites((prev) => (prev ?? []).filter((fid) => fid !== parseInt(id)));
    } else {
      setShowFollowModal(true);
    }
  }, [isFav, session, id, updateFavorites]);

  const confirmFollow = useCallback(async () => {
    await fetch("/api/favorites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ comedian_id: parseInt(id) }),
    });
    updateFavorites((prev) => [...(prev ?? []), parseInt(id)]);
    setShowFollowModal(false);
  }, [id, updateFavorites]);

  const formatDate = (d: string) => {
    const date = new Date(d + "T12:00:00");
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="h-6 w-32 bg-muted rounded animate-pulse mb-8" />
        <div className="flex items-start gap-5">
          <div className="h-24 w-24 rounded-full bg-muted animate-pulse shrink-0" />
          <div className="flex-1 space-y-3">
            <div className="h-8 w-48 bg-muted rounded animate-pulse" />
            <div className="h-4 w-64 bg-muted rounded animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (!comedian) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        Comedian not found.
      </div>
    );
  }

  const imgSrc = comedian.headshot_url
    ? comedian.headshot_url.startsWith("http")
      ? comedian.headshot_url
      : `https://www.comedycellar.com${comedian.headshot_url}`
    : null;

  return (
    <div className="max-w-2xl mx-auto">
      <Link
        href="/comedians"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors duration-200 mb-8"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        All Comedians
      </Link>

      <div className="flex items-start gap-6">
        {imgSrc ? (
          <img
            src={imgSrc}
            alt=""
            className="h-24 w-24 rounded-full object-cover bg-muted shrink-0 ring-2 ring-primary/20"
          />
        ) : (
          <div
            className="h-24 w-24 rounded-full bg-muted flex items-center justify-center text-3xl font-semibold text-muted-foreground shrink-0"
            aria-hidden="true"
          >
            {comedian.name[0]}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-4 flex-wrap">
            <h1 className="font-display text-3xl sm:text-4xl tracking-wide text-foreground">
              {comedian.name.toUpperCase()}
            </h1>
            <button
              onClick={toggleFavorite}
              className={`rounded-lg border px-5 py-2 text-sm font-semibold transition-all duration-200 cursor-pointer ${
                isFav
                  ? "border-accent bg-accent text-on-accent hover:bg-accent/80"
                  : "border-border text-muted-foreground hover:border-primary hover:text-primary"
              }`}
              aria-pressed={isFav}
            >
              {isFav ? "Following" : "Follow"}
            </button>
          </div>
          {comedian.credits && (
            <p className="text-muted-foreground mt-1">{comedian.credits}</p>
          )}
          {comedian.website_url && (
            <a
              href={comedian.website_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-primary hover:text-secondary mt-2 transition-colors duration-200"
            >
              {comedian.website_url.replace(/https?:\/\//, "").replace(/\/$/, "")}
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          )}
          {SOCIALS.some((s) => comedian[s.key]) && (
            <div className="flex items-center gap-2 mt-3">
              {SOCIALS.map((s) => {
                const url = comedian[s.key];
                if (!url) return null;
                return (
                  <a
                    key={s.key}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all duration-200"
                    aria-label={s.label}
                    title={s.label}
                  >
                    {s.icon}
                  </a>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {comedian.bio && (
        <div className="mt-8 rounded-xl border border-border bg-card p-6">
          <p className="text-card-foreground leading-relaxed">{comedian.bio}</p>
        </div>
      )}

      <section className="mt-10">
        <h2 className="font-display text-2xl tracking-wide text-foreground mb-4">
          UPCOMING SHOWS ({comedian.upcoming_shows.length})
        </h2>
        {comedian.upcoming_shows.length === 0 ? (
          <p className="text-muted-foreground">No upcoming shows scheduled.</p>
        ) : (
          <div className="space-y-3">
            {comedian.upcoming_shows.map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between rounded-xl border border-border bg-card px-5 py-4 transition-all duration-200 hover:border-primary/30"
              >
                <div className="flex items-center gap-3">
                  <span className="font-display text-xl tracking-wide text-primary">
                    {formatDate(s.date).toUpperCase()}
                  </span>
                  <span className="text-muted-foreground">&middot;</span>
                  <span className="font-semibold text-sm text-card-foreground">
                    {s.time}
                  </span>
                  <span className="text-xs text-muted-foreground hidden sm:inline">
                    {s.venue_room}
                  </span>
                </div>
                {s.reservation_url && (
                  <a
                    href={
                      s.reservation_url.startsWith("http")
                        ? s.reservation_url
                        : `https://www.comedycellar.com${s.reservation_url}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-on-primary hover:bg-secondary hover:text-on-secondary transition-colors duration-200 shrink-0"
                  >
                    Reserve
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {showFollowModal && comedian && (
        <FollowModal
          comedianName={comedian.name}
          onConfirm={confirmFollow}
          onClose={() => setShowFollowModal(false)}
        />
      )}
    </div>
  );
}
