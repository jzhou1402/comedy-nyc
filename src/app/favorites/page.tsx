"use client";

import { useSession, signIn } from "next-auth/react";
import { useSessionCache } from "@/lib/useSessionCache";
import Link from "next/link";

interface Favorite {
  id: number;
  name: string;
  credits: string;
  headshot_url: string;
  website_url: string;
  reason: string | null;
  created_at: string;
}

const fetchJson = (url: string) => fetch(url).then((r) => r.json());

export default function FavoritesPage() {
  const { data: session, status } = useSession();
  const { data: favorites, update: updateFavorites } = useSessionCache<Favorite[]>(
    "favorites_full",
    () =>
      session
        ? fetchJson("/api/favorites").then((d: any) => (Array.isArray(d) ? d : []))
        : Promise.resolve([])
  );

  const removeFavorite = async (comedianId: number) => {
    await fetch("/api/favorites", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ comedian_id: comedianId }),
    });
    updateFavorites((prev) => (prev ?? []).filter((f) => f.id !== comedianId));
    // Also update the shared favorite_ids cache
    const cached = sessionStorage.getItem("favorite_ids");
    if (cached) {
      const ids: number[] = JSON.parse(cached);
      sessionStorage.setItem(
        "favorite_ids",
        JSON.stringify(ids.filter((id) => id !== comedianId))
      );
    }
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
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
        </div>
        <p className="text-lg font-semibold text-foreground mb-2">Sign in to manage favorites</p>
        <p className="text-muted-foreground mb-6">Follow your favorite comedians and get notified when they perform.</p>
        <button
          onClick={() => signIn("google")}
          className="px-6 py-3 bg-primary text-on-primary font-semibold rounded-lg hover:bg-secondary hover:text-on-secondary transition-colors duration-200 cursor-pointer"
        >
          Sign in with Google
        </button>
      </div>
    );
  }

  const favs = favorites ?? [];

  return (
    <div>
      <section className="mb-8">
        <h1 className="font-display text-4xl sm:text-5xl tracking-wide text-foreground">
          YOUR FAVORITES
        </h1>
        <p className="mt-2 text-muted-foreground text-lg">
          Get emailed when these comedians have upcoming shows.
        </p>
      </section>

      {favs.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-muted-foreground mb-4">
            No favorites yet. Browse lineups and follow the comedians you love.
          </p>
          <Link
            href="/comedians"
            className="inline-flex px-5 py-2.5 bg-primary text-on-primary font-semibold rounded-lg hover:bg-secondary hover:text-on-secondary transition-colors duration-200"
          >
            Browse Comedians
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {favs.map((f) => (
            <article
              key={f.id}
              className="flex items-center gap-4 rounded-xl border border-border bg-card px-5 py-4 transition-all duration-200 hover:border-primary/30"
            >
              {f.headshot_url ? (
                <img
                  src={
                    f.headshot_url.startsWith("http")
                      ? f.headshot_url
                      : `https://www.comedycellar.com${f.headshot_url}`
                  }
                  alt=""
                  className="h-13 w-13 rounded-full object-cover bg-muted shrink-0"
                  loading="lazy"
                />
              ) : (
                <div
                  className="h-13 w-13 rounded-full bg-muted flex items-center justify-center text-lg text-muted-foreground shrink-0"
                  aria-hidden="true"
                >
                  {f.name[0]}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <Link
                  href={`/comedians/${f.id}`}
                  className="font-semibold text-card-foreground hover:text-primary transition-colors duration-200"
                >
                  {f.name}
                </Link>
                {f.credits && (
                  <p className="text-xs text-muted-foreground mt-0.5">{f.credits}</p>
                )}
                {f.reason && (
                  <p className="text-xs text-muted-foreground/70 mt-1 italic">
                    &ldquo;{f.reason}&rdquo;
                  </p>
                )}
              </div>
              {f.website_url && (
                <a
                  href={f.website_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-muted-foreground hover:text-primary transition-colors duration-200 hidden sm:block"
                  aria-label={`Visit ${f.name}'s website`}
                >
                  Website
                </a>
              )}
              <button
                onClick={() => removeFavorite(f.id)}
                className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all duration-200 cursor-pointer"
                aria-label={`Remove ${f.name} from favorites`}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
