"use client";

import { useCallback, useState } from "react";
import { useSession, signIn } from "next-auth/react";
import { useSessionCache } from "@/lib/useSessionCache";
import FollowModal from "@/components/FollowModal";
import Link from "next/link";

interface Comedian {
  id: number;
  name: string;
  credits: string | null;
  bio: string | null;
  headshot_url: string | null;
  website_url: string | null;
  show_count: number;
}

const fetchJson = (url: string) => fetch(url).then((r) => r.json());

export default function ComediansPage() {
  const { data: session } = useSession();
  const { data: comedians, loading } = useSessionCache<Comedian[]>(
    "comedians",
    () => fetchJson("/api/comedians")
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
  const [search, setSearch] = useState("");

  const favSet = new Set(favoriteIds ?? []);
  const [followModal, setFollowModal] = useState<{ id: number; name: string } | null>(null);

  const toggleFavorite = useCallback(
    (comedianId: number, name: string) => {
      if (!session) {
        signIn("google");
        return;
      }
      const isFav = favSet.has(comedianId);
      if (isFav) {
        fetch("/api/favorites", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ comedian_id: comedianId }),
        });
        updateFavorites((prev) => (prev ?? []).filter((id) => id !== comedianId));
      } else {
        setFollowModal({ id: comedianId, name });
      }
    },
    [favSet, session, updateFavorites]
  );

  const confirmFollow = useCallback(async () => {
    if (!followModal) return;
    await fetch("/api/favorites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ comedian_id: followModal.id }),
    });
    updateFavorites((prev) => [...(prev ?? []), followModal.id]);
    setFollowModal(null);
  }, [followModal, updateFavorites]);

  const filtered = search
    ? (comedians ?? []).filter((c) => c.name.toLowerCase().includes(search.toLowerCase()))
    : (comedians ?? []);

  return (
    <div>
      <section className="mb-8">
        <h1 className="font-display text-4xl sm:text-5xl tracking-wide text-foreground">
          COMEDIANS
        </h1>
        <p className="mt-2 text-muted-foreground text-lg">
          {(comedians ?? []).length} performers across NYC
        </p>
      </section>

      <div className="relative mb-8 max-w-md">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <label htmlFor="comedian-search" className="sr-only">Search comedians</label>
        <input
          id="comedian-search"
          type="search"
          placeholder="Search comedians..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-xl border border-border bg-card pl-10 pr-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all duration-200"
        />
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true" aria-label="Loading comedians">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border bg-card h-48 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          {search ? "No comedians match your search." : "No comedians loaded yet."}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 w-full">
          {filtered.map((c) => (
            <article
              key={c.id}
              className="group w-full rounded-xl border border-border bg-card p-3 sm:p-5 flex flex-col transition-all duration-200 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5"
            >
              <div className="flex items-start gap-2 sm:gap-4 mb-2 sm:mb-3">
                {c.headshot_url ? (
                  <img
                    src={
                      c.headshot_url.startsWith("http")
                        ? c.headshot_url
                        : `https://www.comedycellar.com${c.headshot_url}`
                    }
                    alt=""
                    className="h-10 w-10 sm:h-14 sm:w-14 rounded-full object-cover bg-muted shrink-0 ring-2 ring-border group-hover:ring-primary/30 transition-all duration-200"
                    loading="lazy"
                  />
                ) : (
                  <div
                    className="h-10 w-10 sm:h-14 sm:w-14 rounded-full bg-muted flex items-center justify-center text-sm sm:text-lg font-semibold text-muted-foreground shrink-0"
                    aria-hidden="true"
                  >
                    {c.name[0]}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <Link
                    href={`/comedians/${c.id}`}
                    className="font-semibold text-card-foreground hover:text-primary transition-colors duration-200"
                  >
                    {c.name}
                  </Link>
                  {c.credits && (
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                      {c.credits}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground/70 mt-0.5">
                    {c.show_count} upcoming show{c.show_count !== 1 ? "s" : ""}
                  </p>
                </div>
                <button
                  onClick={() => toggleFavorite(c.id, c.name)}
                  className={`p-2 rounded-lg transition-all duration-200 shrink-0 cursor-pointer ${
                    favSet.has(c.id)
                      ? "text-accent bg-accent/10"
                      : "text-muted-foreground hover:text-accent hover:bg-accent/10"
                  }`}
                  aria-label={favSet.has(c.id) ? `Unfollow ${c.name}` : `Follow ${c.name}`}
                  aria-pressed={favSet.has(c.id)}
                >
                  <svg
                    className="w-5 h-5"
                    fill={favSet.has(c.id) ? "currentColor" : "none"}
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                    />
                  </svg>
                </button>
              </div>
              {c.bio ? (
                <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3 flex-1">
                  {c.bio}
                </p>
              ) : c.credits ? (
                <p className="text-sm text-muted-foreground/70 italic leading-relaxed line-clamp-2 flex-1">
                  {c.credits}
                </p>
              ) : null}
            </article>
          ))}
        </div>
      )}

      {followModal && (
        <FollowModal
          comedianName={followModal.name}
          onConfirm={confirmFollow}
          onClose={() => setFollowModal(null)}
        />
      )}
    </div>
  );
}
