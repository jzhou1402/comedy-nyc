"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession, signIn } from "next-auth/react";
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

export default function ComediansPage() {
  const { data: session } = useSession();
  const [comedians, setComedians] = useState<Comedian[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<Set<number>>(new Set());
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/comedians")
      .then((r) => r.json())
      .then((data) => setComedians(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!session) return;
    fetch("/api/favorites")
      .then((r) => r.json())
      .then((favs: any[]) => {
        if (Array.isArray(favs)) setFavoriteIds(new Set(favs.map((f) => f.id)));
      })
      .catch(() => {});
  }, [session]);

  const toggleFavorite = useCallback(
    async (comedianId: number) => {
      if (!session) {
        signIn("google");
        return;
      }
      const isFav = favoriteIds.has(comedianId);
      if (isFav) {
        await fetch("/api/favorites", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ comedian_id: comedianId }),
        });
        setFavoriteIds((prev) => {
          const next = new Set(prev);
          next.delete(comedianId);
          return next;
        });
      } else {
        const reason = prompt("Why do you like this comedian? (optional)");
        await fetch("/api/favorites", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ comedian_id: comedianId, reason: reason || null }),
        });
        setFavoriteIds((prev) => new Set(prev).add(comedianId));
      }
    },
    [favoriteIds, session]
  );

  const filtered = search
    ? comedians.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()))
    : comedians;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Comedians</h1>
      <p className="text-sm text-muted mb-6">
        {comedians.length} performers at the Comedy Cellar
      </p>

      <input
        type="text"
        placeholder="Search comedians..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full max-w-md mb-6 rounded-lg border border-card-border bg-card-bg px-4 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-accent"
      />

      {loading ? (
        <div className="text-center py-12 text-muted">Loading...</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((c) => (
            <div
              key={c.id}
              className="rounded-lg border border-card-border bg-card-bg p-4 flex flex-col"
            >
              <div className="flex items-start gap-3 mb-3">
                {c.headshot_url ? (
                  <img
                    src={
                      c.headshot_url.startsWith("http")
                        ? c.headshot_url
                        : `https://www.comedycellar.com${c.headshot_url}`
                    }
                    alt={c.name}
                    className="h-14 w-14 rounded-full object-cover bg-zinc-800 shrink-0"
                  />
                ) : (
                  <div className="h-14 w-14 rounded-full bg-zinc-800 flex items-center justify-center text-lg text-muted shrink-0">
                    {c.name[0]}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <Link
                    href={`/comedians/${c.id}`}
                    className="font-semibold hover:text-accent transition-colors"
                  >
                    {c.name}
                  </Link>
                  {c.credits && (
                    <p className="text-xs text-muted mt-0.5 line-clamp-1">{c.credits}</p>
                  )}
                  <p className="text-xs text-zinc-500 mt-0.5">
                    {c.show_count} upcoming show{c.show_count !== 1 ? "s" : ""}
                  </p>
                </div>
                <button
                  onClick={() => toggleFavorite(c.id)}
                  className={`text-xl shrink-0 transition-colors ${
                    favoriteIds.has(c.id) ? "text-accent" : "text-zinc-600 hover:text-accent"
                  }`}
                  title={favoriteIds.has(c.id) ? "Unfollow" : "Follow"}
                >
                  {favoriteIds.has(c.id) ? "\u2665" : "\u2661"}
                </button>
              </div>
              {c.bio && (
                <p className="text-sm text-zinc-400 leading-relaxed line-clamp-3">{c.bio}</p>
              )}
              {!c.bio && c.credits && (
                <p className="text-sm text-zinc-500 italic leading-relaxed line-clamp-2">
                  {c.credits}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="text-center py-12 text-muted">
          {search ? "No comedians match your search." : "No comedians loaded yet."}
        </div>
      )}
    </div>
  );
}
