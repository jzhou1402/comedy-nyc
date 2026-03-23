"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

interface Favorite {
  id: number;
  name: string;
  credits: string;
  headshot_url: string;
  website_url: string;
  reason: string | null;
  created_at: string;
}

export default function FavoritesPage() {
  const { data: session, status } = useSession();
  const [favorites, setFavorites] = useState<Favorite[]>([]);

  useEffect(() => {
    if (!session) return;
    fetch("/api/favorites")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setFavorites(data);
      })
      .catch(() => {});
  }, [session]);

  const removeFavorite = async (comedianId: number) => {
    await fetch("/api/favorites", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ comedian_id: comedianId }),
    });
    setFavorites((prev) => prev.filter((f) => f.id !== comedianId));
  };

  if (status === "loading") {
    return <div className="text-center py-16 text-muted">Loading...</div>;
  }

  if (!session) {
    return (
      <div className="text-center py-16 text-muted">
        <p className="text-lg">Sign in to manage your favorite comedians.</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Your Favorites</h1>
      <p className="text-sm text-muted mb-6">
        You'll get emailed when these comedians have upcoming shows.
      </p>

      {favorites.length === 0 ? (
        <div className="text-center py-12 text-muted">
          <p>No favorites yet. Browse lineups and heart the comedians you love.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {favorites.map((f) => (
            <div
              key={f.id}
              className="flex items-center gap-4 rounded-lg border border-card-border bg-card-bg px-4 py-3"
            >
              {f.headshot_url ? (
                <img
                  src={
                    f.headshot_url.startsWith("http")
                      ? f.headshot_url
                      : `https://www.comedycellar.com${f.headshot_url}`
                  }
                  alt={f.name}
                  className="h-12 w-12 rounded-full object-cover bg-zinc-800"
                />
              ) : (
                <div className="h-12 w-12 rounded-full bg-zinc-800 flex items-center justify-center text-muted">
                  {f.name[0]}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-medium">{f.name}</p>
                {f.credits && <p className="text-xs text-muted">{f.credits}</p>}
                {f.reason && (
                  <p className="text-xs text-zinc-400 mt-1 italic">"{f.reason}"</p>
                )}
              </div>
              {f.website_url && (
                <a
                  href={f.website_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-muted hover:text-foreground"
                >
                  Website
                </a>
              )}
              <button
                onClick={() => removeFavorite(f.id)}
                className="text-lg text-accent hover:text-accent-hover"
                title="Remove favorite"
              >
                &times;
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
