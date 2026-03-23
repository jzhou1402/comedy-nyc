"use client";

import { useEffect, useState, useCallback, use } from "react";
import { useSession, signIn } from "next-auth/react";
import Link from "next/link";

interface ComedianDetail {
  id: number;
  name: string;
  credits: string | null;
  bio: string | null;
  headshot_url: string | null;
  website_url: string | null;
  show_count: number;
  upcoming_shows: {
    id: number;
    date: string;
    time: string;
    venue_room: string;
    reservation_url: string;
  }[];
}

export default function ComedianProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: session } = useSession();
  const [comedian, setComedian] = useState<ComedianDetail | null>(null);
  const [isFav, setIsFav] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/comedians/${id}`)
      .then((r) => r.json())
      .then((data) => setComedian(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!session) return;
    fetch("/api/favorites")
      .then((r) => r.json())
      .then((favs: any[]) => {
        if (Array.isArray(favs)) {
          setIsFav(favs.some((f) => f.id === parseInt(id)));
        }
      })
      .catch(() => {});
  }, [session, id]);

  const toggleFavorite = useCallback(async () => {
    if (!session) {
      signIn("google");
      return;
    }
    if (isFav) {
      await fetch("/api/favorites", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comedian_id: parseInt(id) }),
      });
      setIsFav(false);
    } else {
      const reason = prompt("Why do you like this comedian? (optional)");
      await fetch("/api/favorites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comedian_id: parseInt(id), reason: reason || null }),
      });
      setIsFav(true);
    }
  }, [isFav, session, id]);

  const formatDate = (d: string) => {
    const date = new Date(d + "T12:00:00");
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  if (loading) return <div className="text-center py-16 text-muted">Loading...</div>;
  if (!comedian) return <div className="text-center py-16 text-muted">Comedian not found.</div>;

  const imgSrc = comedian.headshot_url
    ? comedian.headshot_url.startsWith("http")
      ? comedian.headshot_url
      : `https://www.comedycellar.com${comedian.headshot_url}`
    : null;

  return (
    <div className="max-w-2xl mx-auto">
      <Link href="/comedians" className="text-sm text-muted hover:text-foreground transition-colors">
        &larr; All Comedians
      </Link>

      <div className="mt-6 flex items-start gap-5">
        {imgSrc ? (
          <img
            src={imgSrc}
            alt={comedian.name}
            className="h-24 w-24 rounded-full object-cover bg-zinc-800 shrink-0"
          />
        ) : (
          <div className="h-24 w-24 rounded-full bg-zinc-800 flex items-center justify-center text-3xl text-muted shrink-0">
            {comedian.name[0]}
          </div>
        )}
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{comedian.name}</h1>
            <button
              onClick={toggleFavorite}
              className={`rounded-full border px-4 py-1 text-sm font-medium transition-colors ${
                isFav
                  ? "border-accent bg-accent text-white"
                  : "border-card-border text-muted hover:border-accent hover:text-accent"
              }`}
            >
              {isFav ? "Following" : "Follow"}
            </button>
          </div>
          {comedian.credits && (
            <p className="text-sm text-muted mt-1">{comedian.credits}</p>
          )}
          {comedian.website_url && (
            <a
              href={comedian.website_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-accent hover:text-accent-hover mt-1 inline-block"
            >
              {comedian.website_url.replace(/https?:\/\//, "").replace(/\/$/, "")}
            </a>
          )}
        </div>
      </div>

      {comedian.bio && (
        <div className="mt-6 rounded-lg border border-card-border bg-card-bg p-4">
          <p className="text-sm leading-relaxed text-zinc-300">{comedian.bio}</p>
        </div>
      )}

      <div className="mt-8">
        <h2 className="text-lg font-semibold mb-3">
          Upcoming Shows ({comedian.upcoming_shows.length})
        </h2>
        {comedian.upcoming_shows.length === 0 ? (
          <p className="text-sm text-muted">No upcoming shows scheduled.</p>
        ) : (
          <div className="space-y-2">
            {comedian.upcoming_shows.map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between rounded-lg border border-card-border bg-card-bg px-4 py-3"
              >
                <div>
                  <span className="font-medium text-sm">{formatDate(s.date)}</span>
                  <span className="mx-2 text-muted">at</span>
                  <span className="text-accent font-medium text-sm">{s.time}</span>
                  <span className="ml-2 text-xs text-muted">{s.venue_room}</span>
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
                    className="rounded bg-accent px-3 py-1 text-xs font-medium text-white hover:bg-accent-hover transition-colors shrink-0"
                  >
                    Reserve
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
